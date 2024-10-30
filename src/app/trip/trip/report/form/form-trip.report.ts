import { Component, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { MeasurementFormValues, MeasurementModelValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import {
  DenormalizedBatchFormReportComponent,
  DenormalizedBatchReportFormComponentStats,
} from '@app/trip/denormalized-batch/report/form/denormalized-batch-form.report-component';
import { SampleFormReportComponent, SampleFromReportComponentStats } from '@app/trip/sample/report/form/sample-form.report-component';
import { environment } from '@environments/environment';
import {
  EntityAsObjectOptions,
  LatLongPattern,
  StatusIds,
  WaitForOptions,
  arrayDistinct,
  isNil,
  isNotNil,
  splitById,
} from '@sumaris-net/ngx-components';
import { Operation, Trip } from '../../trip.model';
import { TripService } from '../../trip.service';
import { TripReportService } from '../trip-report.service';
import { FormTripReportService } from './form-trip-report.service';
import { Sample } from '@app/trip/sample/sample.model';

export class FormTripReportStats extends BaseReportStats {
  readonly pmfmIdsMap = PmfmIds;
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  colorPrimary: string;
  colorSecondary: string;
  strataEnabled?: boolean;
  saleTypes?: string[];
  strategy: Strategy;
  operationsRankByGears: { [key: number]: number[] };
  operationTableHeadColspan: number;
  measurementValues: {
    trip: MeasurementFormValues;
    operations: MeasurementFormValues[];
    gears: (MeasurementFormValues | MeasurementModelValues)[];
  };
  pmfms: {
    trip: IPmfm[];
    operation: IPmfm[];
    childOperation: IPmfm[];
    gears?: IPmfm[];
  };
  pmfmsByIds?: {
    trip?: { [key: number]: IPmfm };
    operation?: { [key: number]: IPmfm };
  };
  pmfmsByGearsId: { [key: number]: IPmfm[] };
  hasPmfm: {
    trip: {
      nbFishermen: boolean;
    };
    operation: {
      hasIndividualMeasure: boolean;
      tripProgress: boolean;
    };
  };
  pmfmsTipsByPmfmId: {
    operation: {
      [key: number]: {
        tipsNum: number;
        text: string;
      };
    };
  };
  options: {
    trip: {
      strataEnabled?: boolean;
      showObservers: boolean;
      showSale: boolean;
    };
    operation: {
      showStartDate: boolean;
      showFishingStartDateTime: boolean;
      showFishingEndDateTime: boolean;
      showEndDate: boolean;
      allowParentOperation: boolean;
    };
  };
  samplesTableStats?: SampleFromReportComponentStats;
  denormalizedBatchTableStats?: DenormalizedBatchReportFormComponentStats;

  fromObject(source: any) {
    super.fromObject(source);
    this.subtitle = source.subtitle;
    this.footerText = source.footerText;
    this.logoHeadLeftUrl = source.logoHeadLeftUrl;
    this.logoHeadRightUrl = source.logoHeadRightUrl;
    this.colorPrimary = source.colorPrimary;
    this.colorSecondary = source.colorSecondary;
    this.strataEnabled = source.strataEnabled;
    this.saleTypes = source.saleTypes;
    this.strategy = Strategy.fromObject(source.strategy);
    this.operationsRankByGears = source.operationsRankByGears;
    this.measurementValues = {
      trip: source.measurementValues.trip,
      operations: source.measurementValues.operations,
      gears: source.measurementValues.gears,
    };
    this.pmfms = {
      trip: source.pmfms.trip?.map(DenormalizedPmfmStrategy.fromObject),
      operation: source.pmfms.operation?.map(DenormalizedPmfmStrategy.fromObject),
      childOperation: source.pmfms.childOperation?.map(DenormalizedPmfmStrategy.fromObject),
      gears: source.pmfms.gears?.map(DenormalizedPmfmStrategy.fromObject),
    };
    this.pmfmsByIds = {
      trip: splitById(this.pmfms.trip),
      operation: splitById(this.pmfms.operation),
    };
    this.pmfmsByGearsId = Object.keys(source.pmfmsByGearsId).reduce((result, key) => {
      result[key] = source.pmfmsByGearsId[key].map(DenormalizedPmfmStrategy.fromObject);
      return result;
    }, {});
    this.hasPmfm = source.hasPmfm;
    this.pmfmsTipsByPmfmId = source.pmfmsLegendByPmfmId;

    this.options = source.options;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      subtitle: this.subtitle,
      footerText: this.footerText,
      logoHeadLeftUrl: this.logoHeadLeftUrl,
      logoHeadRightUrl: this.logoHeadRightUrl,
      colorPrimary: this.colorPrimary,
      colorSecondary: this.colorSecondary,
      strataEnabled: this.strataEnabled,
      saleType: this.saleTypes,
      strategy: this.strategy.asObject(opts),
      operationsRankByGears: this.operationsRankByGears,
      measurementValues: this.measurementValues,
      pmfms: {
        trip: this.pmfms.trip.map((item) => item.asObject(opts)),
        operation: this.pmfms.operation.map((item) => item.asObject(opts)),

        gears: this.pmfms.gears.map((item) => item.asObject(opts)),
      },
      pmfmsByGearsId: Object.keys(this.pmfmsByGearsId).reduce((result, key) => {
        result[key] = this.pmfmsByGearsId[key].map((pmfm: DenormalizedPmfmStrategy) => pmfm.asObject(opts));
        return result;
      }, {}),
      pmfmsLegendByPmfmId: this.pmfmsTipsByPmfmId,
      hasPmfm: this.hasPmfm,
      options: this.options,
    };
  }
}

@Component({
  selector: 'app-form-trip-report',
  templateUrl: './form-trip.report.html',
  styleUrls: ['../trip.report.scss', './form-trip.report.scss', '../../../../data/report/base-form-report.scss'],
  providers: [{ provide: TripReportService, useClass: FormTripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class FormTripReport extends AppDataEntityReport<Trip, number, FormTripReportStats> {
  public static readonly isBlankFormParam = 'isBlankForm';

  protected logPrefix = 'trip-form-report';
  protected isBlankForm: boolean;
  protected reportPath: string;
  protected latLongPattern: LatLongPattern;
  protected readonly nbOfOpOnBlankPage = 9;
  protected readonly nbOfSamplePeerOpOnBlankPage = 20;
  protected operationNbTableSplitArrayChunk = 8;

  protected readonly tripService: TripService = inject(TripService);
  protected readonly referentialRefService: ReferentialRefService = inject(ReferentialRefService);
  protected readonly strategyRefService: StrategyRefService = inject(StrategyRefService);

  @ViewChild(RevealComponent) reveal!: RevealComponent;
  @ViewChild(SampleFormReportComponent) sampleFormReport: SampleFormReportComponent;
  @ViewChild(DenormalizedBatchFormReportComponent) denormalizedBatchFormReportComponent: DenormalizedBatchFormReportComponent;

  constructor() {
    super(Trip, FormTripReportStats);
    this.latLongPattern = this.settings.latLongFormat;

    this.reportPath = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.route.snapshot.data?.isBlankForm;

    this.debug = !environment.production;
  }

  computePrintHref(data: Trip, stats: FormTripReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/form/' + this.reportPath);
  }
  async waitIdle(opts: WaitForOptions) {
    await super.waitIdle(opts);
    await Promise.all([this.sampleFormReport.waitIdle(opts), this.denormalizedBatchFormReportComponent.waitIdle(opts)]);
  }

  async updateView() {
    if (this.debug) console.debug(`${this.logPrefix}updateView`);

    this.cd.detectChanges();
    await this.waitIdle({ stop: this.destroySubject });
    this.reveal.initialize();
  }

  statsAsObject(opts?: EntityAsObjectOptions): any {
    const stats = this.stats.asObject(opts);
    stats.samplesTableStats = this.sampleFormReport.statsAsObject();
    stats.denormalizedBatchTableStats = this.denormalizedBatchFormReportComponent.statsAsObject();
    return stats;
  }

  protected filterPmfmForOperationTable(pmfm: IPmfm): boolean {
    return isNil(pmfm) || ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: Trip;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      // TODO custom request with only nessesary datas (like ActivityCalendarFormReport)
      const realData = await this.tripService.load(id, { ...opts, withOperation: false });
      data = Trip.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        gears: realData.gears,
        operations: new Array(this.nbOfOpOnBlankPage).fill(null).map((_, index) => {
          const result = Operation.fromObject({ rankOrder: index + 1 });
          result.samples = Array(this.nbOfSamplePeerOpOnBlankPage)
            .fill(null)
            .map((_, index) => Sample.fromObject({ rankOrder: index + 1 }));
          return result;
        }),
      });
    } else {
      data = await this.tripService.load(id, { ...opts, withOperation: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: Trip, stats: FormTripReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(data: Trip, opts?: IComputeStatsOpts<FormTripReportStats>): Promise<FormTripReportStats> {
    const stats = new FormTripReportStats();

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_HEADER_LEFT_LOGO_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_HEADER_RIGHT_LOGO_URL);
    stats.colorPrimary = stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY);
    stats.colorSecondary = stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY);
    stats.strataEnabled = stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE);
    stats.options = {
      trip: {
        showObservers: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
        showSale: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE),
        strataEnabled: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE),
      },
      operation: {
        showStartDate: !stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
        showEndDate: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE),
        showFishingStartDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
        showFishingEndDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
        allowParentOperation: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION),
      },
    };

    // In the case the header will be more hight, so we have less place du displat lines
    if (stats.options.operation.allowParentOperation) {
      this.operationNbTableSplitArrayChunk = 8;
    }

    // Get strategy
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    stats.saleTypes = (
      await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'SaleType', statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })
    ).data.map((i) => i.label);

    // Compute stats PMFM
    stats.pmfms = isNotNil(strategyId)
      ? {
          trip: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.TRIP,
            strategyId,
          }),
          operation: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OPERATION,
            strategyId,
          }),
          childOperation: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.CHILD_OPERATION,
            strategyId,
          }),
          gears: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR,
            strategyId,
          }),
        }
      : {
          trip: [],
          operation: [],
          childOperation: [],
          gears: [],
        };

    stats.pmfmsByIds = {
      trip: splitById(stats.pmfms.trip),
      operation: splitById(stats.pmfms.operation),
    };

    // In case of allowParentOperation, also display child pmfm in it own
    // header line for operation table. We also need each array (parent and
    // child pmfms) has the same size to be displayed correctly as table column
    if (stats.options.operation.allowParentOperation) {
      const nbOperationPmfms = stats.pmfms.operation.filter(this.filterPmfmForOperationTable).length;
      const nbChildOperationPmfms = stats.pmfms.childOperation.filter(this.filterPmfmForOperationTable).length;
      if (nbOperationPmfms > nbChildOperationPmfms) {
        const diff = nbOperationPmfms - nbChildOperationPmfms;
        stats.pmfms.childOperation = [...stats.pmfms.childOperation, ...Array(diff - 1).fill(null)];
      } else if (nbChildOperationPmfms > nbOperationPmfms) {
        const diff = nbChildOperationPmfms - nbOperationPmfms;
        stats.pmfms.operation = [...stats.pmfms.operation, ...Array(diff - 1).fill(null)];
      }
    }

    stats.hasPmfm = {
      trip: {
        nbFishermen: isNotNil(stats.pmfmsByIds.trip?.[stats.pmfmIdsMap.NB_FISHERMEN]),
      },
      operation: {
        hasIndividualMeasure: isNotNil(stats.pmfmsByIds.operation?.[stats.pmfmIdsMap.HAS_INDIVIDUAL_MEASURES]),
        tripProgress: isNotNil(stats.pmfmsByIds.operation?.[stats.pmfmIdsMap.TRIP_PROGRESS]),
      },
    };

    stats.operationTableHeadColspan = 2 + Object.values(stats.hasPmfm.operation).filter((v) => v).length;

    // Remove it from pmfm list to avoid it displayed in the other features section
    stats.pmfms.trip = stats.pmfms.trip.filter((pmfm) => pmfm.id !== stats.pmfmIdsMap.NB_FISHERMEN);

    stats.pmfmsByGearsId = data.gears
      .map((physicalGear) => physicalGear.gear.id)
      .reduce((res, gearId) => {
        // Extract gearId for physicalGear and remove duplicates
        if (!res.includes(gearId)) res.push(gearId);
        return res;
      }, [])
      .reduce((res, gearId) => {
        // Group pmfm by gearId
        const pmfms = stats.pmfms.gears.filter((pmfm: DenormalizedPmfmStrategy) => {
          return isNil(pmfm.gearIds) || pmfm.gearIds.includes(gearId);
        });
        res[gearId] = pmfms;
        return res;
      }, {});

    // Compute automatic legend for operation table, for each qualitative value pmfms
    {
      const operationPmfmsForLegend = arrayDistinct(
        stats.pmfms.operation
          .concat(stats.options.operation.allowParentOperation ? stats.pmfms.childOperation : [])
          .filter((pmfm) => isNotNil(pmfm) && PmfmUtils.isQualitative(pmfm)),
        'id'
      );
      stats.pmfmsTipsByPmfmId = {
        operation: operationPmfmsForLegend.reduce((res, pmfm, index) => {
          res[pmfm.id] = {
            tipsNum: index + 1,
            text: pmfm.qualitativeValues.map((qv) => qv.label + ' : ' + qv.name).join(' ; '),
          };
          return res;
        }, {}),
      };
    }
    // Get all needed measurement values in suitable format
    stats.measurementValues = {
      trip: MeasurementUtils.toMeasurementValues(data.measurements),
      operations: data.operations.map((op) => MeasurementUtils.toMeasurementValues(op.measurements)),
      gears: data.gears.map((gear) => gear.measurementValues),
    };

    stats.operationsRankByGears = this.isBlankForm
      ? {}
      : data.gears.reduce((result, gear) => {
          const ops = data.operations.filter((op) => op.physicalGear.id == gear.id);
          result[gear.id] = ops.map((op) => op.rankOrder);
          return result;
        }, {});

    return stats;
  }

  protected async loadStrategy(program: Program, data: Trip) {
    const strategyResolution = program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    switch (strategyResolution) {
      case DataStrategyResolutions.SPATIO_TEMPORAL:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
          startDate: data.departureDateTime,
          endDate: data.departureDateTime,
          location: data.departureLocation,
        });
      case DataStrategyResolutions.NONE:
        return null;
      case DataStrategyResolutions.LAST:
        return this.strategyRefService.loadByFilter({
          programId: program.id,
          acquisitionLevels: [AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION],
        });
      // TODO : DataStrategyResolutionsUSER_SELECT
    }
  }

  protected async computeTitle(data: Trip, _: FormTripReportStats): Promise<string> {
    return this.translate.instant('TRIP.REPORT.FORM.TITLE');
  }

  protected computeDefaultBackHref(data: Trip, _: FormTripReportStats): string {
    return `/trips/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'trips/report/form';
  }

  protected computeI18nContext(stats: FormTripReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'TRIP.REPORT.FORM.PMFM.',
    };
  }
}
