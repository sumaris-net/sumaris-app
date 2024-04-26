import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { FormTripReportService } from './form-trip-report.service';
import { TripReportService } from '../trip-report.service';
import { BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { TripService } from '../../trip.service';
import { Operation, Trip } from '../../trip.model';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { Program } from '@app/referential/services/model/program.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { isNil, isNotNil, LatLongPattern, splitById, StatusIds } from '@sumaris-net/ngx-components';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { DenormalizedBatchService } from '@app/trip/denormalized-batch/denormalized-batch.service';
import { DenormalizedBatch } from '@app/trip/denormalized-batch/denormalized-batch.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { Batch } from '@app/trip/batch/common/batch.model';
import { environment } from '@environments/environment';

export class FormTripReportStats extends BaseReportStats {
  readonly pmfmIdsMap = PmfmIds;
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  strataEnabled?: boolean;
  saleTypes?: string[];
  strategy: Strategy;
  operationRankOrderByOperationIds: { [key: number]: number };
  operationsRankByGears: { [key: number]: number[] };
  pmfmByGearsId: { [key: number]: IPmfm[] };
  denormalizedBatchesByOp: {
    [key: number]: {
      landing: DenormalizedBatch[];
      discard: DenormalizedBatch[];
    };
  };
  landingBatchOp: { [kej: number]: DenormalizedBatch[] };
  discardBatchOp: { [key: number]: DenormalizedBatch[] };
  measurementValues: {
    trip: MeasurementFormValues;
    operations: MeasurementFormValues[];
    gears: (MeasurementFormValues | MeasurementModelValues)[];
  };
  pmfms: {
    trip: IPmfm[];
    operation: IPmfm[];
    gears?: IPmfm[];
    denormalizedBatch?: IPmfm[];
  };
  pmfmsByIds?: {
    trip?: { [key: number]: IPmfm };
    operation?: { [key: number]: IPmfm };
    gears?: IPmfm[];
    denormalizedBatch?: { [key: number]: IPmfm };
  };
  options: {
    showFishingStartDateTime: boolean;
    showFishingEndDateTime: boolean;
    showEndDate: boolean;
  };
}

@Component({
  selector: 'app-form-trip-report',
  templateUrl: './form-trip.report.html',
  styleUrls: ['../trip.report.scss', './form-trip.report.scss', '../../../../data/report/base-report.scss'],
  providers: [{ provide: TripReportService, useClass: FormTripReportService }],
  encapsulation: ViewEncapsulation.None,
})
export class FormTripReport extends AppDataEntityReport<Trip, number, FormTripReportStats> {
  public static readonly isBlankFormParam = 'isBlankForm';

  protected logPrefix = 'trip-form-report';
  protected isBlankForm: boolean;
  protected latLongPattern: LatLongPattern;
  protected readonly nbOfOpOnBlankPage = 9;
  protected readonly maxLinePeerTable = 9;
  protected readonly nbOfGearOnBlankPage = 3;
  protected readonly maxGearPeepPage = 3;
  protected readonly maxBatchesLinesPeerTable = 24;

  protected readonly tripService: TripService;
  protected readonly referentialRefService: ReferentialRefService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly denormalizedBatchService: DenormalizedBatchService;

  constructor(injector: Injector) {
    super(injector, Trip, FormTripReportStats);
    this.tripService = injector.get(TripService);
    this.referentialRefService = injector.get(ReferentialRefService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.latLongPattern = this.settings.latLongFormat;
    this.denormalizedBatchService = this.injector.get(DenormalizedBatchService);

    this.isBlankForm = this.route.snapshot.data[FormTripReport.isBlankFormParam];
    this.debug = !environment.production;
  }

  protected filterPmfmForOperationTable(pmfm: IPmfm): boolean {
    return ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  }

  protected isNotSamplingBatch(batch: DenormalizedBatch): boolean {
    return !BatchUtils.isSamplingBatch(batch as any as Batch);
  }

  protected getOperationRankOrderById(opId: number) {
    if (isNil(this.data?.operations)) return null;
    return this.data.operations.find((o) => o.id);
  }

  protected isNotTreeBatchRootElement(batch: DenormalizedBatch) {
    return batch.treeLevel > 2;
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: Trip;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.tripService.load(id, { ...opts, withOperation: false });
      data = Trip.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        operations: new Array(this.nbOfOpOnBlankPage).fill(null).map((_, index) => Operation.fromObject({ rankOrder: index + 1 })),
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

    // Ensures that batches be denormalized for this trip before generate report
    await this.denormalizedBatchService.denormalizeTrip(data.id);

    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;
    // TODO Load strategy (by program, date/time, location)
    stats.options = {
      showFishingStartDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
      showFishingEndDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
      showEndDate: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE),
    };

    stats.operationRankOrderByOperationIds = data.operations.reduce((acc, op) => {
      acc[op.id] = op.rankOrder;
      return acc;
    }, []);

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
          gears: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR,
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
          trip: [],
          operation: [],
          gears: [],
        };

    stats.pmfmsByIds = {
      trip: splitById(stats.pmfms.trip),
      operation: splitById(stats.pmfms.operation),
      denormalizedBatch: splitById(stats.pmfms.denormalizedBatch),
    };

    stats.measurementValues = {
      trip: MeasurementUtils.toMeasurementValues(data.measurements),
      operations: data.operations.map((op) => MeasurementUtils.toMeasurementValues(op.measurements)),
      gears: data.gears.map((gear) => gear.measurementValues),
    };

    stats.denormalizedBatchesByOp = {};
    for (const op of data.operations) {
      const batches = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id })).data;
      stats.denormalizedBatchesByOp[op.id] = {
        landing: batches.filter((b) => b.isLanding),
        discard: batches.filter((b) => b.isDiscard),
      };
    }

    stats.landingBatchOp = {};
    for (const op of data.operations) {
      const batch = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id, isLanding: true })).data;
      if (batch.length > 0) {
        stats.landingBatchOp[op.id] = (
          await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id, isLanding: true })
        ).data;
      }
    }
    stats.discardBatchOp = {};
    for (const op of data.operations) {
      const batch = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id, isDiscard: true })).data;
      if (batch.length > 0) {
        stats.discardBatchOp[op.id] = (
          await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id, isDiscard: true })
        ).data;
      }
    }

    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);
    stats.strataEnabled = stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE);
    stats.saleTypes = (
      await this.referentialRefService.loadAll(0, 1000, null, null, { entityName: 'SaleType', statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })
    ).data.map((i) => i.label);

    stats.operationsRankByGears = data.gears.reduce((result, gear) => {
      const ops = data.operations.filter((op) => op.physicalGear.id == gear.id);
      result[gear.id] = ops.map((op) => op.rankOrder);
      return result;
    }, {});

    stats.pmfmByGearsId = data.gears
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

  protected async computeTitle(data: Trip, stats: FormTripReportStats): Promise<string> {
    // TODO
    return "DOSSIER D'OBSERVATION EN MER";
  }

  protected computeDefaultBackHref(data: Trip, stats: FormTripReportStats): string {
    return `/trips/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'trips/report/form';
  }

  computePrintHref(data: Trip, stats: FormTripReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/form');
  }

  protected computeI18nContext(stats: FormTripReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      pmfmPrefix: 'TRIP.REPORT.FORM.PMFM.',
    };
  }
}
