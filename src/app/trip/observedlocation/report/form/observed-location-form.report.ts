import { Component, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { MeasurementFormValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { BASE_REPORT, BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm, IPmfm, Pmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { BatchFormReportComponent } from '@app/trip/batch/common/report/batch-form.report-component';
import { Landing } from '@app/trip/landing/landing.model';
import { LandingService } from '@app/trip/landing/landing.service';
import { ObservedLocation } from '@app/trip/observedlocation/observed-location.model';
import { SaleFormReportComponent } from '@app/trip/sale/report/sale-form.report-component';
import { Sale } from '@app/trip/sale/sale.model';
import { SaleService } from '@app/trip/sale/sale.service';
import { environment } from '@environments/environment';
import { EntityAsObjectOptions, ReferentialRef, isEmptyArray, isNil, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { ReportChunkModule } from '../../../../data/report/form/report-chunk.module';
import { ReportAppendix } from '../../../../data/report/report-appendix';
import { LandingFormReportComponent } from '../../../landing/report/form/landing-form.report-component';
import { ObservedLocationService } from '../../observed-location.service';
import { ObservedLocationFormReportComponent } from './observed-location-form.report-component';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

export class ObservedLocationFormReportStats extends BaseReportStats {
  options: {
    colorPrimary: string;
    colorSecondary: string;
    displayAttributes: {
      location: string[];
      taxonGroup: string[];
      vesselSnapshot: string[];
    };
    urlHeaderLogoLeft: string;
    urlHeaderLogoRight: string;
    maxTipsToGoAppendix: number;
    landingTableDividerPmfmId: number;
    footerText: string;
  };
  fieldsValues: {
    hasPets?: boolean;
  };
  mappings: {
    saleIdToObservedSpeciesId: { [key: number]: number };
  };
  strategy: Strategy;
  pmfms: {
    observedLocation: IDenormalizedPmfm[];
    landing: IDenormalizedPmfm[];
    catchBatch: IDenormalizedPmfm[];
    sortingBatch: IDenormalizedPmfm[];
    sortingBatchIndividual: IDenormalizedPmfm[];
    sale: IDenormalizedPmfm[];
  };
  pmfmsByIds: {
    observedLocation: { [key: number]: IDenormalizedPmfm };
    landing: { [key: number]: IDenormalizedPmfm };
    catchBatch: { [key: number]: IDenormalizedPmfm };
    sortingBatch: { [key: number]: IDenormalizedPmfm };
    sortingBatchIndividual: { [key: number]: IDenormalizedPmfm };
  };
  sales: Sale[];
  landingTableDividerPmfm: IPmfm;
  observedSpecies: ReferentialRef[];
  observedSpeciesByIds: { [key: number]: ReferentialRef };

  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.strategy = Strategy.fromObject(source.strategy);
    this.fieldsValues = source.fieldsValues;
    this.pmfms = {
      observedLocation: (source?.pmfms?.observedLocation || {}).map(DenormalizedPmfmStrategy.fromObject),
      landing: (source?.pmfms?.landing || {}).map(DenormalizedPmfmStrategy.fromObject),
      catchBatch: (source?.pmfms?.catchBatch || {}).map(DenormalizedPmfmStrategy.fromObject),
      sortingBatch: (source?.pmfms?.sortingBatch || {}).map(DenormalizedPmfmStrategy.fromObject),
      sortingBatchIndividual: (source?.pmfms?.sortingBatchIndividual || {}).map(DenormalizedPmfmStrategy.fromObject),
      sale: (source?.pmfms?.sale || {}).map(DenormalizedPmfmStrategy.fromObject),
    };
    this.pmfmsByIds = {
      observedLocation: splitById(this.pmfms.observedLocation),
      landing: splitById(this.pmfms.landing),
      catchBatch: splitById(this.pmfms.catchBatch),
      sortingBatch: splitById(this.pmfms.sortingBatch),
      sortingBatchIndividual: splitById(this.pmfms.sortingBatchIndividual),
    };
    this.sales = source.sales.map(Sale.fromObject);
    this.landingTableDividerPmfm = this.pmfmsByIds.landing?.[this.options.landingTableDividerPmfmId];
    this.observedSpecies = source.observedSpecies.map(ReferentialRef.fromObject);
    this.observedSpeciesByIds = splitById(this.observedSpecies);
    this.mappings = source.mappings;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      strategy: this.strategy.asObject(opts),
      fieldsValues: this.fieldsValues,
      pmfms: {
        observedLocation: this.pmfms.observedLocation.map((pmfm) => pmfm.asObject(opts)),
        landing: this.pmfms.landing.map((pmfm) => pmfm.asObject(opts)),
        catchBatch: this.pmfms.catchBatch.map((pmfm) => pmfm.asObject(opts)),
        sortingBatch: this.pmfms.sortingBatch.map((pmfm) => pmfm.asObject(opts)),
        sortingBatchIndividual: this.pmfms.sortingBatchIndividual.map((pmfm) => pmfm.asObject(opts)),
        sale: this.pmfms.sale.map((pmfm) => pmfm.asObject(opts)),
      },
      sales: this.sales.map((sale) => sale.asObject(opts)),
      observedSpecies: this.observedSpecies.map((source) => source.asObject(opts)),
      mappings: this.mappings,
    };
  }
}

@Component({
  standalone: true,
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    ReportChunkModule,
    ObservedLocationFormReportComponent,
    LandingFormReportComponent,
    SaleFormReportComponent,
    BatchFormReportComponent,
    ReportAppendix,
  ],
  selector: 'observed-location-form-report',
  templateUrl: './observed-location-form.report.html',
  styleUrls: ['../../../../data/report/base-report.scss', './observed-location-form.report.scss'],
  providers: [{ provide: BASE_REPORT, useExisting: ObservedLocationFormReport }],
})
export class ObservedLocationFormReport extends AppDataEntityReport<ObservedLocation, number, ObservedLocationFormReportStats> {
  protected logPrefix = '[observed-location-form-report]';

  protected readonly observedLocationService = inject(ObservedLocationService);
  protected readonly landingService = inject(LandingService);
  protected readonly saleService = inject(SaleService);
  protected readonly strategyRefService: StrategyRefService = inject(StrategyRefService);
  protected readonly referentialRefService = inject(ReferentialRefService);

  constructor() {
    super(ObservedLocation, ObservedLocationFormReportStats);

    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  computeTitle(data: ObservedLocation, stats: ObservedLocationFormReportStats) {
    return this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.TITLE');
  }

  computeDefaultBackHref(data: ObservedLocation, stats: ObservedLocationFormReportStats) {
    return `/observations/${data.id}`;
  }

  computeShareBasePath() {
    return '/observations/report/form';
  }

  computePrintHref(data: ObservedLocation, stats: ObservedLocationFormReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    return new URL(
      window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + `/report/${this.isBlankForm ? 'blank-' : ''}form/`
    );
  }

  protected async loadData(id: number, opts?: any): Promise<ObservedLocation> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ObservedLocation;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.observedLocationService.load(id, { ...opts, withLanding: false });
      data = ObservedLocation.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        landings: Array(11)
          .fill(null)
          .map((_, index) => Landing.fromObject({ id: (index + 1) * -1 })),
      });
    } else {
      data = await this.observedLocationService.load(id, { ...opts, withLanding: false });
      let loadResult = await this.landingService.loadAllByObservedLocation({ observedLocationId: data.id }, { withSaleIds: true });
      data.landings = loadResult.data;
      while (Object.prototype.hasOwnProperty.call(loadResult, 'fetchMore')) {
        loadResult = await loadResult.fetchMore();
        data.landings.push(...loadResult.data);
      }
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<ObservedLocationFormReportStats>
  ): Promise<ObservedLocationFormReportStats> {
    const stats = new ObservedLocationFormReportStats();

    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    stats.options = {
      colorPrimary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY) || 'var(--ion-color-primary)',
      colorSecondary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY) || 'var(--ion-color-secondary)',
      displayAttributes: {
        location: this.settings.getFieldDisplayAttributes('location', ['label', 'name']),
        taxonGroup: this.settings.getFieldDisplayAttributes('taxonGroup', ['label', 'name']),
        vesselSnapshot: this.settings.getFieldDisplayAttributes('vesselSnapshot', ['registrationCode', 'name']),
      },
      urlHeaderLogoLeft: stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_HEADER_LEFT_LOGO_URL),
      urlHeaderLogoRight: stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_HEADER_RIGHT_LOGO_URL),
      maxTipsToGoAppendix: stats.program.getPropertyAsInt(ProgramProperties.REPORT_FORM_BLANK_TIPS_MAX_TO_GO_APPENDIX),
      landingTableDividerPmfmId: stats.program.getPropertyAsInt(ProgramProperties.LANDING_ROWS_DIVIDER_PMFM_ID),
      footerText: stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_FOOTER_TEXT),
    };

    stats.pmfms = {
      observedLocation: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION,
            strategyId,
          })
        : [],
      landing: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.LANDING,
            strategyId,
          })
        : [],
      catchBatch: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
            strategyId,
          })
        : [],
      sortingBatch: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
            strategyId,
          })
        : [],
      sortingBatchIndividual: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL,
            strategyId,
          })
        : [],
      sale: isNotNil(strategyId)
        ? await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SALE,
            strategyId,
          })
        : [],
    };

    stats.pmfmsByIds = {
      observedLocation: splitById(stats.pmfms.observedLocation),
      landing: splitById(stats.pmfms.landing),
      catchBatch: splitById(stats.pmfms.catchBatch),
      sortingBatch: splitById(stats.pmfms.sortingBatch),
      sortingBatchIndividual: splitById(stats.pmfms.sortingBatchIndividual),
    };

    stats.landingTableDividerPmfm = stats.pmfmsByIds.landing?.[stats.options.landingTableDividerPmfmId];

    stats.fieldsValues = {};
    if (!this.isBlankForm) {
      const measurementFormValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, stats.pmfms.observedLocation);
      stats.fieldsValues = {
        hasPets: MeasurementValuesUtils.hasPmfmValue(measurementFormValues, PmfmIds.HAS_PETS, true),
      };
    }

    const observedSpeciesIds = this.computeObservedSpeciesIds(data.landings);
    stats.observedSpecies = await this.referentialRefService.loadAllByIds(observedSpeciesIds, 'TaxonGroup');
    stats.observedSpeciesByIds = splitById(stats.observedSpecies);
    stats.mappings = {
      saleIdToObservedSpeciesId: this.computeMappingSaleIdToObservedSpeciesId(data.landings, stats.pmfms.landing),
    };

    if (this.isBlankForm) {
      stats.sales = [
        Sale.fromObject({
          id: -1,
          catchBatch: Batch.fromObject({ id: -1 }),
        }),
      ];
    } else {
      stats.sales = await this.getSalesByLandings(data.landings);
    }

    return stats;
  }

  protected async loadStrategy(program: Program, data: ObservedLocation) {
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    switch (strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION],
          startDate: data.startDateTime,
          location: data.location,
        });
      case DataStrategyResolutions.NONE:
        return null;
      case DataStrategyResolutions.LAST:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.OBSERVED_LOCATION],
        });
      // TODO : DataStrategyResolutionsUSER_SELECT
    }
  }

  protected computeI18nContext(stats: ObservedLocationFormReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      // FIXME
      //pmfmPrefix: 'TRIP.REPORT.FORM.PMFM.',
    };
  }

  protected computeSlidesOptions(data: ObservedLocation, stats: ObservedLocationFormReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.pageWidth,
      height: this.pageDimensions.pageHeight,
      center: false,
    };
  }

  protected computePageDimensions(): FormReportPageDimensions {
    const pageWidth = 210 * 4;
    const pageHeight = 297 * 4;
    const pageHorizontalMargin = 50;
    const availableWidthForTablePortrait = pageWidth - pageHorizontalMargin * 2;
    const availableWidthForTableLandscape = pageHeight - pageHorizontalMargin * 2;
    return {
      pageWidth,
      pageHeight,
      pageHorizontalMargin,
      availableWidthForTableLandscape,
      availableWidthForTablePortrait,
    };
  }

  private async getSalesByLandings(landings: Landing[]): Promise<Sale[]> {
    const result = [];
    for (const landing of landings) {
      if (isEmptyArray(landing.saleIds)) continue;
      if (landing.saleIds.length > 1) {
        console.error(
          `${this.logPrefix} landing "${landing.id} has serval sale. Landing with several is not already supported. Can only take first one."`,
          { saleIds: landing.saleIds }
        );
      }
      // FIXME: This will not be better if we can get sale by ids ?
      //        (need to implement load by ids on pod side)
      // NOTE: For now only one sale by landing is supported,
      //       so only get first available sale id.
      result.push(await this.saleService.load(landing.saleIds[0]));
    }
    return result;
  }

  private computeObservedSpeciesIds(landings: Landing[]): number[] {
    return MeasurementValuesUtils.getDistinctValuesByPmfmId(
      arrayPluck(landings, 'measurementValues', true) as MeasurementFormValues[],
      PmfmIds.TAXON_GROUP_ID
    )
      .filter((v) => typeof v === 'string')
      .map((v: string) => parseInt(v));
  }

  private computeMappingSaleIdToObservedSpeciesId(landings: Landing[], landingPmfms: IPmfm[]): { [key: number]: number } {
    return landings.reduce((result, landing) => {
      if (isEmptyArray(landing.saleIds)) return result;
      const observedSpecieId = MeasurementValuesUtils.getFormValue(landing.measurementValues, landingPmfms, PmfmIds.TAXON_GROUP_ID);
      if (isNil(observedSpecieId)) return result;
      landing.saleIds.forEach((saleId) => (result[saleId] = observedSpecieId));
      return result;
    }, {});
  }
}
