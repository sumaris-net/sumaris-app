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
import {
  ImageAttachment,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LatLongPattern,
  splitById,
  StatusIds,
  TreeItemEntityUtils,
} from '@sumaris-net/ngx-components';
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
import { environment } from '@environments/environment';
import { DenormalizedBatchUtils } from '@app/trip/denormalized-batch/denormalized-batch.utils';

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
  pmfmByGearsId: { [key: number]: number[] };
  denormalizedBatchByOp: {
    [key: number]: {
      landing: DenormalizedBatch[];
      discard: DenormalizedBatch[];
    };
  };
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
    samples: IPmfm[];
  };
  pmfmsByIds?: {
    trip?: { [key: number]: IPmfm };
    operation?: { [key: number]: IPmfm };
    gears?: IPmfm[];
    denormalizedBatch?: { [key: number]: IPmfm };
    samples: { [key: number]: IPmfm };
  };
  sampleImagesByOperationIds: { [key: number]: ImageAttachment[] };
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

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.options = {
      showFishingStartDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_START_DATE_ENABLE),
      showFishingEndDateTime: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
      showEndDate: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE),
    };
    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);
    stats.strataEnabled = stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE);

    // Get strategy
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    // Ensures that batches be denormalized for this trip before generate report
    await this.denormalizedBatchService.denormalizeTrip(data.id);

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
          samples: await this.programRefService.loadProgramPmfms(data.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
            strategyId,
          }),
        }
      : {
          trip: [],
          operation: [],
          gears: [],
          samples: [],
        };

    stats.pmfmsByIds = {
      trip: splitById(stats.pmfms.trip),
      operation: splitById(stats.pmfms.operation),
      denormalizedBatch: splitById(stats.pmfms.denormalizedBatch),
      samples: splitById(stats.pmfms.samples),
    };

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

    // Get all needed measurement values in suitable format
    stats.measurementValues = {
      trip: MeasurementUtils.toMeasurementValues(data.measurements),
      operations: data.operations.map((op) => MeasurementUtils.toMeasurementValues(op.measurements)),
      gears: data.gears.map((gear) => gear.measurementValues),
    };

    stats.operationRankOrderByOperationIds = data.operations.reduce((acc, op) => {
      acc[op.id] = op.rankOrder;
      return acc;
    }, []);

    stats.operationsRankByGears = data.gears.reduce((result, gear) => {
      const ops = data.operations.filter((op) => op.physicalGear.id == gear.id);
      result[gear.id] = ops.map((op) => op.rankOrder);
      return result;
    }, {});

    stats.denormalizedBatchByOp = {};
    for (const op of data.operations) {
      const denormalizedBatches = (await this.denormalizedBatchService.loadAll(0, 1000, null, null, { operationId: op.id })).data;
      const [root] = DenormalizedBatchUtils.arrayToTree(denormalizedBatches);

      // Copy sampling batch properties to parent
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

      // Exclude not visible batches
      const landings = TreeItemEntityUtils.filterRecursively(root, (b) => b.isLanding && !samplingBatches.includes(b));
      const discards = TreeItemEntityUtils.filterRecursively(root, (b) => b.isDiscard && !samplingBatches.includes(b));

      // Compute tre indent text
      [landings, discards].forEach((batches) => {
        if (batches.length > 0) {
          DenormalizedBatchUtils.filterTreeComponents(batches[0], (b) => !DenormalizedBatchUtils.isSamplingBatch(b));
          DenormalizedBatchUtils.computeTreeIndent(batches[0], [], false, { html: true });
        }
      });

      stats.denormalizedBatchByOp[op.id] = {
        landing: landings,
        discard: discards,
      };
    }

    stats.sampleImagesByOperationIds = {};
    for (const operation of data.operations || []) {
      stats.sampleImagesByOperationIds[operation.id] = (operation.samples || [])
        .filter((s) => isNotEmptyArray(s.images))
        .flatMap((s) => {
          // Add title to image
          s.images.forEach((image) => {
            image.title = image.title || s.label || `#${s.rankOrder}`;
          });
          return s.images;
        });
    }

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
    return this.translate.instant('TRIP.REPORT.FORM.TITLE');
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
