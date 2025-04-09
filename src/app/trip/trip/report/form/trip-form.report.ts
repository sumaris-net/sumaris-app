import { Component, inject, ViewEncapsulation } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { DataStrategyResolution, DataStrategyResolutions } from '@app/data/form/data-editor.utils';
import { MeasurementFormValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { BASE_REPORT, BaseReportStats, IComputeStatsOpts, IReportI18nContext } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ReportAppendix } from '@app/data/report/report-appendix';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { DenormalizedBatchFormReportContent } from '@app/trip/denormalized-batch/report/form/denormalized-batch-form.report.content';
import { OperationFormReportContent } from '@app/trip/operation/report/form/operation-form.report.content';
import { OperationWithChildFormReportContent } from '@app/trip/operation/report/form/operation-with-child-form.report.content';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { PhysicalGearsReportFormContent } from '@app/trip/physicalgear/report/form/physicalgear-form.report.content';
import { SampleFormReportContent } from '@app/trip/sample/report/form/sample-form.report.content';
import { environment } from '@environments/environment';
import { DateUtils, EntityAsObjectOptions, isNil, isNotNil, LatLongPattern, splitById, StatusIds, toBoolean } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Trip } from '../../trip.model';
import { TripService } from '../../trip.service';
import { TripReportService } from '../trip-report.service';
import { TripFormReportService } from './trip-form-report.service';
import { TripTableFromReportContent } from './trip-table-from.report.content';

export class TripFormReportStats extends BaseReportStats {
  readonly pmfmIdsMap = PmfmIds;

  options: {
    cameraUsed: boolean;
    colorPrimary: string;
    colorSecondary: string;
    displayAttributeLocation: string[];
    enableBatch: boolean;
    enablePosition: boolean;
    footerText?: string;
    gearHasLabel: boolean;
    hiddenPmfms: number[];
    latLongPattern: LatLongPattern;
    limitTipsToShowOnAppendix: number;
    logoHeadLeftUrl?: string;
    logoHeadRightUrl?: string;
    multiTrip: boolean;
    saleTypes?: string[];
    showObservers: boolean;
    showSale: boolean;
    strataEnabled?: boolean;
    subtitle?: string;
  };
  hasPmfm: {
    nbFishermen: boolean;
    cameraUsed: boolean;
    gpsUsed: boolean;
  };
  measurementValues: MeasurementFormValues;
  pmfms: IDenormalizedPmfm[];
  pmfmsByIds?: { [key: number]: IDenormalizedPmfm };
  reportDate: Moment;
  strategy: Strategy;
  tripLines?: Trip[];

  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.hasPmfm = source.hasPmfm;
    this.measurementValues = source.measurementValues;
    this.pmfms = source.pmfms?.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsByIds = splitById(this.pmfms);
    this.reportDate = DateUtils.fromDateISOString(source.reportDate);
    this.strategy = Strategy.fromObject(source.strategy);
    this.tripLines = source?.tripLines.map((trip: any) => Trip.fromObject(trip));
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      hasPmfm: this.hasPmfm,
      measurementValues: this.measurementValues,
      pmfms: this.pmfms.map((item) => item.asObject(opts)),
      reportDate: DateUtils.toDateISOString(this.reportDate),
      strategy: this.strategy.asObject(opts),
      tripLines: this.tripLines?.map((trip) => trip.asObject(opts)),
    };
  }
}

@Component({
  standalone: true,
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppReferentialPipesModule,
    ReportChunkModule,
    TripTableFromReportContent,
    SampleFormReportContent,
    DenormalizedBatchFormReportContent,
    OperationFormReportContent,
    PhysicalGearsReportFormContent,
    OperationWithChildFormReportContent,
    ReportAppendix,
  ],
  selector: 'app-trip-form-report',
  templateUrl: './trip-form.report.html',
  styleUrls: ['../trip.report.scss', './trip-form.report.scss', '../../../../data/report/base-form-report.scss'],
  providers: [
    { provide: TripReportService, useClass: TripFormReportService },
    { provide: BASE_REPORT, useExisting: TripFormReport },
  ],
  encapsulation: ViewEncapsulation.None,
})
export class TripFormReport extends AppDataEntityReport<Trip, number, TripFormReportStats> {
  public static readonly isBlankFormParam = 'isBlankForm';

  protected logPrefix = 'trip-form-report';
  protected isBlankForm: boolean;
  protected operationNbTableSplitArrayChunk = 9;
  protected readonly pmfmsIdToShortCutTips = [PmfmIds.SEA_STATE];

  protected readonly tripService: TripService = inject(TripService);
  protected readonly referentialRefService: ReferentialRefService = inject(ReferentialRefService);
  protected readonly strategyRefService: StrategyRefService = inject(StrategyRefService);
  protected readonly pageDimensions: FormReportPageDimensions;

  constructor() {
    super(Trip, TripFormReportStats);

    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  computePrintHref(data: Trip, stats: TripFormReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    return new URL(
      window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + `/report/${this.isBlankForm ? 'blank-' : ''}form/`
    );
  }

  protected filterPmfmForOperationTable(pmfm: IPmfm): boolean {
    return isNil(pmfm) || ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  }

  protected async loadData(id: number, opts?: any): Promise<Trip> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: Trip;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      // TODO custom request with only necessary data (like ActivityCalendarFormReport)
      const realData = await this.tripService.load(id, { ...opts, withOperation: false });
      data = Trip.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
        gears: [],
        operations: [],
      });
    } else {
      data = await this.tripService.load(id, { ...opts, withOperation: true });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: Trip, stats: TripFormReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.pageWidth,
      height: this.pageDimensions.pageHeight,
      center: false,
    };
  }

  protected async computeStats(data: Trip, opts?: IComputeStatsOpts<TripFormReportStats>): Promise<TripFormReportStats> {
    const stats = new TripFormReportStats();

    stats.program = await this.programRefService.loadByLabel(data.program.label);
    stats.strategy = await this.loadStrategy(stats.program, data);
    const strategyId = stats.strategy?.id;

    {
      const enablePosition = stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_POSITION_ENABLE);
      const cameraUsed = toBoolean(MeasurementUtils.asBooleanValue(data?.measurements, PmfmIds.CAMERA_USED), false);
      const isGPSUsed = cameraUsed || toBoolean(MeasurementUtils.asBooleanValue(data?.measurements, PmfmIds.GPS_USED), true);
      const pmfmGearLabel = (
        await this.programRefService.loadProgramPmfms(stats.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR,
          strategyId,
        })
      ).find((pmfm) => pmfm.id === PmfmIds.GEAR_LABEL);
      stats.options = {
        cameraUsed: enablePosition && cameraUsed,
        colorPrimary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY) || 'var(--ion-color-primary)',
        colorSecondary: stats.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY) || 'var(--ion-color-secondary)',
        displayAttributeLocation: this.settings.getFieldDisplayAttributes('location'),
        enableBatch: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_BATCH_ENABLE),
        enablePosition: enablePosition && isGPSUsed,
        footerText: stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER),
        gearHasLabel: isNotNil(pmfmGearLabel),
        hiddenPmfms: this.isBlankForm ? stats.program.getPropertyAsNumbers(ProgramProperties.TRIP_REPORT_FORM_HIDDEN_PMFM_IDS) : [],
        latLongPattern: this.settings.latLongFormat,
        limitTipsToShowOnAppendix: stats.program.getPropertyAsInt(ProgramProperties.REPORT_FORM_BLANK_TIPS_MAX_TO_GO_APPENDIX),
        logoHeadLeftUrl: stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_HEADER_LEFT_LOGO_URL),
        logoHeadRightUrl: stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_HEADER_RIGHT_LOGO_URL),
        multiTrip: this.isBlankForm && stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_MULTI_TRIP),
        saleTypes: (
          await this.referentialRefService.loadAll(0, 1000, null, null, {
            entityName: 'SaleType',
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
          })
        ).data.map((i) => i.label),
        showObservers: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
        showSale: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE),
        strataEnabled: stats.program.getPropertyAsBoolean(ProgramProperties.TRIP_SAMPLING_STRATA_ENABLE),
        subtitle: stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE),
      };
    }

    if (stats.options.multiTrip) {
      stats.tripLines = new Array(TripTableFromReportContent.NB_LINE_PEER_PAGE).fill(null).map((_, index) => Trip.fromObject({ id: index }));
    }

    // Compute stats PMFM
    stats.pmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(data.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.TRIP,
          strategyId,
        })
      : [];

    stats.pmfmsByIds = splitById(stats.pmfms);

    stats.hasPmfm = {
      nbFishermen: isNotNil(stats.pmfmsByIds?.[stats.pmfmIdsMap.NB_FISHERMEN]),
      gpsUsed: isNotNil(stats.pmfmsByIds?.[stats.pmfmIdsMap.GPS_USED]),
      cameraUsed: isNotNil(stats.pmfmsByIds?.[stats.pmfmIdsMap.CAMERA_USED]),
    };

    // If blank form create dummy physicalGear from strategy gear
    if (this.isBlankForm) {
      stats.strategy.gears.forEach((gear, index) => {
        data.gears.push(
          PhysicalGear.fromObject({
            id: index,
            rankOrder: index,
            gear: gear,
          })
        );
      });
    }

    // Remove it from pmfm list to avoid it displayed in the other features section
    stats.pmfms = stats.pmfms.filter((pmfm) => pmfm.id !== stats.pmfmIdsMap.NB_FISHERMEN);

    // Get all needed measurement values in suitable format
    stats.measurementValues = MeasurementUtils.toMeasurementValues(data.measurements);

    stats.reportDate = DateUtils.max(stats.program.updateDate, stats.strategy.updateDate);
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

  protected async computeTitle(data: Trip, _: TripFormReportStats): Promise<string> {
    return this.translate.instant('TRIP.REPORT.FORM.TITLE');
  }

  protected computeDefaultBackHref(data: Trip, _: TripFormReportStats): string {
    return `/trips/${data.id}`;
  }

  protected computeShareBasePath(): string {
    return 'trips/report/form';
  }

  protected computeI18nContext(stats: TripFormReportStats): IReportI18nContext {
    return {
      ...super.computeI18nContext(stats),
      // FIXME
      //pmfmPrefix: 'TRIP.REPORT.FORM.PMFM.',
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
}
