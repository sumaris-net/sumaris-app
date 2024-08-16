import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { DenormalizedBatch } from '@app/trip/denormalized-batch/denormalized-batch.model';
import { DenormalizedBatchService } from '@app/trip/denormalized-batch/denormalized-batch.service';
import { Landing } from '@app/trip/landing/landing.model';
import { Sale } from '@app/trip/sale/sale.model';
import { SaleService } from '@app/trip/sale/sale.service';
import {
  EntityAsObjectOptions,
  Person,
  TreeItemEntityUtils,
  arrayDistinct,
  isEmptyArray,
  isNotNil,
  splitById,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observed-location.model';
import { ObservedLocationService } from '../../observed-location.service';
import { DenormalizedBatchUtils } from '@app/trip/denormalized-batch/denormalized-batch.utils';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

export class ObservedLocationFormReportStats extends BaseReportStats {
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  strategy: Strategy;
  landingTableRowChunk: Landing[][];
  nbSampledVessel: number;
  dividerPmfmId: number;
  minObservedSpeciesCount: number;
  observedCount: number;
  sales: Sale[];
  pmfms: {
    observedLocation: IPmfm[];
    landing: IPmfm[];
    denormalizedBatch: IPmfm[];
  };
  pmfmsByIds?: {
    observedLocation?: { [key: number]: IPmfm };
    landing?: { [key: number]: IPmfm };
    denormalizedBatch?: { [key: number]: IPmfm };
  };
  denormalizedBatchesBySale: { [key: number]: DenormalizedBatch[] };

  fromObject(source: any): void {
    super.fromObject(source);
    this.subtitle = source.subtitle;
    this.footerText = source.footerText;
    this.logoHeadLeftUrl = source.logoHeadLeftUrl;
    this.logoHeadRightUrl = source.logoHeadRightUrl;
    this.strategy = Strategy.fromObject(source.strategy);
    this.landingTableRowChunk = (source.landingTableRowChunk || []).map((chunk) => chunk.map((landing) => Landing.fromObject(landing)));
    this.nbSampledVessel = source.nbSampledVessel;
    this.dividerPmfmId = source.dividerPmfmId;
    this.minObservedSpeciesCount = source.minObservedSpeciesCount;
    this.observedCount = source.observedCount;
    this.sales = (source.sales || []).map((sale) => Sale.fromObject(sale));
    this.pmfms = {
      observedLocation: (source.pmfm?.observedLocation || []).map((pmfm) => DenormalizedPmfmStrategy.fromObject(pmfm)),
      landing: (source.pmfm?.landing || []).map((pmfm) => DenormalizedPmfmStrategy.fromObject(pmfm)),
      denormalizedBatch: (source.pmfm?.landing || []).map((pmfm) => DenormalizedPmfmStrategy.fromObject(pmfm)),
    };
    this.pmfmsByIds = {
      observedLocation: splitById(this.pmfms.observedLocation),
      landing: splitById(this.pmfms.landing),
      denormalizedBatch: splitById(this.pmfms.denormalizedBatch),
    };
    this.denormalizedBatchesBySale = Object.keys(source.denormalizedBatchBySale || {}).reduce((acc, key) => {
      acc[key] = (source.denormalizedBatchBySale[key] || []).map((batch) => DenormalizedPmfmStrategy.fromObject(batch));
      return acc;
    }, {});
  }

  asObject(opts?: EntityAsObjectOptions) {
    return {
      ...super.asObject(opts),
      subtitle: this.subtitle,
      footerText: this.footerText,
      logoHeadLeftUrl: this.logoHeadLeftUrl,
      logoHeadRightUrl: this.logoHeadRightUrl,
      strategy: this.strategy.asObject(opts),
      landingTableRowChunk: (this.landingTableRowChunk || []).map((chunk) => chunk.map((landing) => landing.asObject(opts))),
      nbSampledVessel: this.nbSampledVessel,
      dividerPmfmId: this.dividerPmfmId,
      minObservedSpeciesCount: this.minObservedSpeciesCount,
      observedCount: this.observedCount,
      sales: (this.sales || []).map((sale) => sale.asObject(opts)),
      pmfms: {
        observedLocation: (this.pmfms?.observedLocation || []).map((pmfm) => pmfm.asObject(opts)),
        landing: (this.pmfms?.landing || []).map((pmfm) => pmfm.asObject(opts)),
        denormalizedBatch: (this.pmfms?.denormalizedBatch || []).map((pmfm) => pmfm.asObject(opts)),
      },
      denormalizedBatchesBySale: Object.keys(this.denormalizedBatchesBySale || {}).reduce((acc, key) => {
        acc[key] = this.denormalizedBatchesBySale[key].map((batch) => batch.asObject(opts));
        return acc;
      }, {}),
    };
  }
}

@Component({
  selector: 'app-observed-location-form-report',
  templateUrl: './observed-location-form.report.html',
  styleUrls: ['./observed-location-form.report.scss', '../../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObservedLocationFormReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationFormReportStats> {
  readonly pmfmIdsMap = PmfmIds;

  protected logPrefix = 'form-observed-location-report';
  protected isBlankForm: boolean;
  protected reportType: string;

  protected readonly observedLocationService: ObservedLocationService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly referentialRefService: ReferentialRefService;
  protected readonly saleService: SaleService;
  protected readonly denormalizedBatchService: DenormalizedBatchService;

  protected readonly pageDimensions = Object.freeze({
    height: 297 * 4,
    width: 210 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 16,
    landingTableSummaryHeight: 80,
    landingTableHeadRowHeight: 40,
    landingTableRowHeight: 65,
  });

  constructor(injector: Injector) {
    super(injector, ObservedLocation, ObservedLocationFormReportStats, { i18nPmfmPrefix: 'OBSERVED_LOCATION.REPORT.FORM.PMFM.' });
    this.observedLocationService = injector.get(ObservedLocationService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.saleService = injector.get(SaleService);
    this.denormalizedBatchService = injector.get(DenormalizedBatchService);

    this.reportType = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.reportType === 'blank-form';
  }

  protected async loadData(id: number, opts?: any): Promise<ObservedLocation> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ObservedLocation;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.observedLocationService.load(id, { ...opts });
      data = ObservedLocation.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        // operations: new Array(this.nbOfOpOnBlankPage).fill(null).map((_, index) => Operation.fromObject({ rankOrder: index + 1 })),
      });
    } else {
      data = await this.observedLocationService.load(id, { ...opts, withLanding: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: ObservedLocation, stats: ObservedLocationFormReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<ObservedLocationFormReportStats>
  ): Promise<ObservedLocationFormReportStats> {
    const stats = new ObservedLocationFormReportStats();

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.subtitle = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_LOGO_HEAD_RIGHT_URL);
    stats.minObservedSpeciesCount = stats.program.getPropertyAsInt(ProgramProperties.LANDING_MIN_OBSERVED_SPECIES_COUNT);
    stats.dividerPmfmId = stats.program.getPropertyAsInt(ProgramProperties.LANDING_ROWS_DIVIDER_PMFM_ID);

    // Get strategy
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    // Compute stats PMFM
    stats.pmfms = isNotNil(strategyId)
      ? {
          observedLocation: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
            strategyId,
          }),
          landing: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.LANDING,
            strategyId,
          }),
          denormalizedBatch: [
            ...(await this.programRefService.loadProgramPmfms(data.program.label, {
              acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
              strategyId,
            })),
            ...(await this.programRefService.loadProgramPmfms(data.program.label, {
              acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
              strategyId,
            })),
          ],
        }
      : {
          observedLocation: [],
          landing: [],
          denormalizedBatch: [],
        };

    stats.pmfmsByIds = {
      observedLocation: splitById(stats.pmfms.observedLocation),
      landing: splitById(stats.pmfms.landing),
      denormalizedBatch: splitById(stats.pmfms.denormalizedBatch),
    };

    // Sort landings to put PETS before then by rankOrder
    data.landings = data.landings.sort((a, b) => {
      const isObservedValueA = PmfmValueUtils.toModelValue(a.measurementValues[PmfmIds.IS_OBSERVED], stats.pmfmsByIds.landing[PmfmIds.IS_OBSERVED]);
      const isObservedValueB = PmfmValueUtils.toModelValue(b.measurementValues[PmfmIds.IS_OBSERVED], stats.pmfmsByIds.landing[PmfmIds.IS_OBSERVED]);
      if (isObservedValueA == isObservedValueB) {
        if (a.rankOrder == b.rankOrder) {
          return 0;
        } else {
          return a.rankOrder - b.rankOrder;
        }
      }
      return isObservedValueA > isObservedValueB ? -1 : 1;
    });

    // Fill empty data on blank form
    if (this.isBlankForm) {
      data.observers = new Array(stats.program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_BLANK_NB_OBSERVERS)).fill(
        Person.fromObject({})
      );
      data.landings = new Array(stats.program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_BLANK_NB_LANDINGS)).fill(
        Landing.fromObject({})
      );
    } else {
      stats.nbSampledVessel = arrayDistinct(
        data.landings.map((landing) => landing.vesselSnapshot),
        'id'
      ).length;
      stats.observedCount = data.landings
        .map((landing) => landing.measurementValues)
        .filter((measurementValues) =>
          MeasurementValuesUtils.hasPmfmValue(measurementValues, stats.dividerPmfmId, QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM)
        )
        .filter((measurementValues) => toBoolean(measurementValues[PmfmIds.IS_OBSERVED], true)).length;
    }

    // Adapt TAXON_GROUP_ID PMFM for getting taxon group names rather taxon group id
    const adaptedTaxonGroupIdPmfms = await this.adaptTaxonGroupIdPmfmToCarryTaxonGroupName(
      data.landings,
      stats.pmfmsByIds.landing[PmfmIds.TAXON_GROUP_ID]
    );
    stats.pmfms.landing = stats.pmfms.landing.reduce((result, pmfm) => {
      result.push(pmfm.id === PmfmIds.TAXON_GROUP_ID ? adaptedTaxonGroupIdPmfms : pmfm);
      return result;
    }, []);

    stats.landingTableRowChunk = this.computeLandingTableChunk(data);

    stats.sales = await Promise.all(
      data.landings
        .map((landing) => landing.saleIds)
        .flat()
        .map(async (saleId) => {
          return await this.saleService.load(saleId);
        })
    );

    if (isNotNil(data.id)) {
      const denormaliseSaleResult = await this.denormalizedBatchService.denormalizeObservedLocation(data.id);
      // TODO : Need to handle result ?
    }
    stats.denormalizedBatchesBySale = {};
    for (const sale of stats.sales) {
      const denormalizedBatches = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { saleId: sale.id })).data;
      if (isEmptyArray(denormalizedBatches)) continue;
      const [catchBatch] = DenormalizedBatchUtils.arrayToTree(denormalizedBatches);

      const samplingBatches = denormalizedBatches
        .filter((b) => DenormalizedBatchUtils.isSamplingBatch(b))
        .map((b) => {
          const parent = b.parent;
          parent.samplingRatio = b.samplingRatio;
          parent.samplingRatioText = b.samplingRatioText;
          parent.weight = b.weight;
          parent.indirectWeight = b.indirectWeight;
          parent.individualCount = b.individualCount;
          parent.indirectIndividualCount = b.indirectIndividualCount;
          return b;
        });

      // Exclude sapling batch (they no be visible on table)
      const result =
        catchBatch &&
        TreeItemEntityUtils.filterRecursively(catchBatch, (b) => !samplingBatches.includes(b) && !DenormalizedBatchUtils.isCatchBatch(b));

      // Compute tree
      DenormalizedBatchUtils.filterTreeComponents(result[0], (b) => !DenormalizedBatchUtils.isSamplingBatch(b));
      result
        .filter((batch) => DenormalizedBatchUtils.isSortingBatch(batch))
        .forEach((batch) => DenormalizedBatchUtils.computeTreeIndent(batch, [], false, { html: true }));

      stats.denormalizedBatchesBySale[sale.id] = result;
    }

    return stats;
  }

  protected async computeTitle(data: ObservedLocation, stats: ObservedLocationFormReportStats): Promise<string> {
    return this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.TITLE');
  }

  protected computeDefaultBackHref(data: ObservedLocation, stats: ObservedLocationFormReportStats): string {
    return `/observations/${data.id}`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/form/' + this.reportType;
  }

  protected computeI18nContext(stats: ObservedLocationFormReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'OBSERVED_LOCATION.REPORT.FORM.PMFM.',
    };
  }

  protected async loadStrategy(program: Program, data: ObservedLocation) {
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    switch (strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
          startDate: data.startDateTime,
          endDate: data.endDateTime,
          location: data.location,
        });
      case DataStrategyResolutions.NONE:
        return null;
      case DataStrategyResolutions.LAST:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          // TODO : CHECK_IT
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING],
        });
      // TODO : DataStrategyResolutionsUSER_SELECT
    }
  }

  protected async adaptTaxonGroupIdPmfmToCarryTaxonGroupName(landings: Landing[], taxonGroupIdPmfm: IPmfm): Promise<IPmfm> {
    const result = taxonGroupIdPmfm.clone();
    const distinctTaxonGroupIdsFromLandings: number[] = landings.reduce((taxonGroupIds, landing) => {
      const taxonGroupId = PmfmValueUtils.toModelValue(landing.measurementValues[PmfmIds.TAXON_GROUP_ID], taxonGroupIdPmfm);
      if (!taxonGroupIds.includes(taxonGroupId)) taxonGroupIds.push(taxonGroupId);
      return taxonGroupIds;
    }, []);

    result.qualitativeValues = await this.referentialRefService.loadAllByIds(distinctTaxonGroupIdsFromLandings, 'TaxonGroup');
    result.type = 'qualitative_value';

    return result;
  }

  protected filterPmfmForLandingTable(pmfm: IPmfm): boolean {
    return [PmfmIds.TAXON_GROUP_ID].includes(pmfm.id);
  }

  protected computeLandingTableChunk(data: ObservedLocation): Landing[][] {
    const totalAvailableHeightForContent =
      this.pageDimensions.width - // Use width because page is landscape
      this.pageDimensions.marginTop -
      this.pageDimensions.marginBottom -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight;

    const nbLinesAvailableOnTheFirstPage = Math.trunc(
      (totalAvailableHeightForContent - this.pageDimensions.landingTableSummaryHeight - this.pageDimensions.landingTableHeadRowHeight) /
        this.pageDimensions.landingTableRowHeight
    );
    const nbLinesAvailableOnOtherPage = Math.trunc(
      (totalAvailableHeightForContent - this.pageDimensions.landingTableHeadRowHeight) / this.pageDimensions.landingTableRowHeight
    );

    const result = [data.landings.slice(0, nbLinesAvailableOnTheFirstPage)];
    let consumedLineCount = nbLinesAvailableOnTheFirstPage;

    while (consumedLineCount < data.landings.length) {
      result.push(data.landings.slice(consumedLineCount, consumedLineCount + nbLinesAvailableOnOtherPage));
      consumedLineCount += nbLinesAvailableOnOtherPage;
    }

    return result;
  }
}
