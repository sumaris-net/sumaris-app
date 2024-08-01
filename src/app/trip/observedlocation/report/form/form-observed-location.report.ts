import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { Person, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { ObservedLocation } from '../../observed-location.model';
import { ObservedLocationService } from '../../observed-location.service';
import { Landing } from '@app/trip/landing/landing.model';

export class FormObservedLocationReportStats extends BaseReportStats {
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  strategy: Strategy;
  pmfms: {
    observedLocation: IPmfm[];
    landing: IPmfm[];
  };
  pmfmsByIds?: {
    observedLocation?: { [key: number]: IPmfm };
    landing?: { [key: number]: IPmfm };
  };
}

@Component({
  selector: 'app-form-observed-location',
  templateUrl: './form-observed-location.report.html',
  styleUrls: ['./form-observed-location.report.scss', '../../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FormObservedLocationReport extends AppDataEntityReport<ObservedLocation, number, FormObservedLocationReportStats> {
  protected logPrefix = 'form-observed-location-report';
  protected isBlankForm: boolean;
  protected subReportType: string;

  protected readonly observedLocationService: ObservedLocationService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly referentialRefService: ReferentialRefService;

  constructor(injector: Injector) {
    super(injector, ObservedLocation, FormObservedLocationReportStats);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.referentialRefService = injector.get(ReferentialRefService);

    this.subReportType = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.subReportType === 'blank';
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

  protected computeSlidesOptions(data: ObservedLocation, stats: FormObservedLocationReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(
    data: ObservedLocation,
    opts?: IComputeStatsOpts<FormObservedLocationReportStats>
  ): Promise<FormObservedLocationReportStats> {
    const stats = new FormObservedLocationReportStats();

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.subtitle = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_LOGO_HEAD_RIGHT_URL);

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
        }
      : {
          observedLocation: [],
          landing: [],
        };

    stats.pmfmsByIds = {
      observedLocation: splitById(stats.pmfms.observedLocation),
      landing: splitById(stats.pmfms.landing),
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

    // Fill empty observers on blank form
    if (this.isBlankForm) {
      data.observers = new Array(stats.program.getPropertyAsInt(ProgramProperties.OBSERVED_LOCATION_REPORT_FORM_BLANK_NB_OBSERVERS)).fill(
        Person.fromObject({})
      );
    }

    // Adapt TAXON_GROUP_ID PMFM for getting taxon group names reather taxon group id
    const adaptedTaxonGroupIdPmfms = await this.adaptTaxonGroupIdPmfmToCarryTaxonGroupName(
      data.landings,
      stats.pmfmsByIds.landing[PmfmIds.TAXON_GROUP_ID]
    );
    stats.pmfms.landing = stats.pmfms.landing.reduce((result, pmfm) => {
      result.push(pmfm.id === PmfmIds.TAXON_GROUP_ID ? adaptedTaxonGroupIdPmfms : pmfm);
      return result;
    }, []);
    stats.pmfmsByIds[PmfmIds.TAXON_GROUP_ID] = console.debug('MYTEST DATA/STATS', { data, stats });
    return stats;
  }

  protected async computeTitle(data: ObservedLocation, stats: FormObservedLocationReportStats): Promise<string> {
    return this.translate.instant('OBSERVED_LOCATION.REPORT.FORM.TITLE');
  }

  protected computeDefaultBackHref(data: ObservedLocation, stats: FormObservedLocationReportStats): string {
    return `/observations/${data.id}`;
  }

  protected computeShareBasePath(): string {
    return 'observations/report/form';
  }

  protected computeI18nContext(stats: FormObservedLocationReportStats): IReportI18nContext {
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
}
