import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { GearPhysicalFeatures } from '@app/activity-calendar/model/gear-physical-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import {
  ConfigService,
  EntityAsObjectOptions,
  LoadResult,
  LocalSettingsService,
  ReferentialRef,
  TranslateContextService,
  isNotNil,
  referentialToString,
  sleep,
  splitById,
} from '@sumaris-net/ngx-components';
import { ActivityCalendarService } from '../../activity-calendar.service';
import { ActivityMonth } from '../../calendar/activity-month.model';
import { IsActiveList } from '../../calendar/calendar.component';
import { ActivityCalendar } from '../../model/activity-calendar.model';
import {
  computeCommonActivityCalendarFormReportStats,
  computeIndividualActivityCalendarFormReportStats,
  fillActivityCalendarBlankData,
} from './activity-calendar-form-report.utils';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { VesselOwnerService } from '@app/vessel/services/vessel-owner.service';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';

export interface ActivityCalendarFormReportPageDimentions {
  height: number;
  width: number;
  marginTop: number;
  marginBottom: number;
  headerHeight: number;
  footerHeight: number;
  sectionTitleHeight: number;
  monthTableRowTitleHeight: number;
  monthTableRowHeight: number;
  monthTableMetierRowHeight: number;
  gpfTableRowTitleHeight: number;
  gpfTableColTitleWidth: number;
  gpfTableRowHeight: number;
  investigationQualificationSectionHeight: number;
}

export class ActivityCalendarFormReportStats extends BaseReportStats {
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  colorPrimary: string;
  colorSecondary: string;
  strategy: Strategy;
  activityMonth?: ActivityMonth[];
  pmfm?: {
    activityMonth?: IPmfm[];
    activityCalendar?: IPmfm[];
    gpf?: IPmfm[];
    guf?: IPmfm[];
    forGpfTable?: IPmfm[];
  };
  pmfmById: {
    activityMonth?: { [key: number]: IPmfm };
    activityCalendar?: { [key: number]: IPmfm };
    gpf?: { [key: number]: IPmfm };
    guf?: { [key: number]: IPmfm };
    forGpfTable?: { [key: number]: IPmfm };
  };

  activityMonthColspan?: number[][];
  metierTableChunks?: { gufId: number; fishingAreasIndexes: number[] }[][];
  filteredAndOrderedGpf?: (GearPhysicalFeatures | GearUseFeatures)[];
  surveyQualificationQualitativeValues?: ReferentialRef[];
  vesselAttributes: string[];
  displayAttributes: {
    vesselSnapshot: string[];
    vesselOwner: string[];
  };
  lastVesselOwner: VesselOwner;

  static fromObject(source: any): ActivityCalendarFormReportStats {
    if (!source) return source;
    if (source instanceof ActivityCalendarFormReportStats) return source as ActivityCalendarFormReportStats;
    const target = new ActivityCalendarFormReportStats();
    target.fromObject(source);
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.subtitle = source.subtitle;
    this.footerText = source.footerText;
    this.logoHeadLeftUrl = source.logoHeadLeftUrl;
    this.logoHeadRightUrl = source.logoHeadRightUrl;
    this.colorPrimary = source.colorPrimary;
    this.colorSecondary = source.colorSecondary;
    this.strategy = Strategy.fromObject(source.strategy);
    this.activityMonth = source?.activityMonth?.map(ActivityMonth.fromObject) || null;
    this.pmfm = {
      activityMonth: source?.pmfm?.activityMonth?.map(DenormalizedPmfmStrategy.fromObject) || null,
      activityCalendar: source?.pmfm?.activityCalendar?.map(DenormalizedPmfmStrategy.fromObject) || null,
      gpf: source?.pmfm?.gpf?.map(DenormalizedPmfmStrategy.fromObject) || null,
      guf: source?.pmfm?.guf?.map(DenormalizedPmfmStrategy.fromObject) || null,
      forGpfTable: source?.pmfm?.forGpfTable?.map(DenormalizedPmfmStrategy.fromObject) || null,
    };
    this.pmfmById = {
      activityMonth: splitById(this.pmfm.activityMonth),
      activityCalendar: splitById(this.pmfm.activityCalendar),
      gpf: splitById(this.pmfm.gpf),
      guf: splitById(this.pmfm.guf),
      forGpfTable: splitById(this.pmfm.forGpfTable),
    };
    this.activityMonthColspan = source.activityMonthColspan;
    this.metierTableChunks = source.metierTableChunks;
    this.vesselAttributes = source.vesselAttributes;
    this.surveyQualificationQualitativeValues = source?.surveyQualificationQualitativeValues?.map(ReferentialRef.fromObject);
    this.filteredAndOrderedGpf = source?.filteredAndOrderedGpf?.map((value: any) => {
      if (value.__typename === GearPhysicalFeatures.TYPENAME) {
        return GearPhysicalFeatures.fromObject(value);
      } else if (value.__typename === GearUseFeatures.TYPENAME) {
        return GearUseFeatures.fromObject(value);
      }
    });
    this.displayAttributes = source.displayAttributes;
    this.lastVesselOwner = VesselOwner.fromObject(source.lastVesselOwner);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      subtitle: this.subtitle,
      footerText: this.footerText,
      logoHeadRightUrl: this.logoHeadRightUrl,
      logoHeadLeftUrl: this.logoHeadLeftUrl,
      colorPrimary: this.colorPrimary,
      colorSecondary: this.colorSecondary,
      strategy: this.strategy.asObject(opts),
      activityMonth: this?.activityMonth?.map((item) => item.asObject(opts)) || null,
      pmfm: {
        activityMonth: this?.pmfm?.activityMonth?.map((item) => item.asObject(opts)) || null,
        activityCalendar: this?.pmfm?.activityCalendar?.map((item) => item.asObject(opts)) || null,
        gpf: this?.pmfm?.gpf?.map((item) => item.asObject(opts)) || null,
        guf: this?.pmfm?.guf?.map((item) => item.asObject(opts)) || null,
        forGpfTable: this?.pmfm?.forGpfTable?.map((item) => item.asObject(opts)) || null,
      },
      activityMonthColspan: this.activityMonthColspan,
      metierTableChunks: this.metierTableChunks,
      vesselAttributes: this.vesselAttributes,
      surveyQualificationQualitativeValues: this.surveyQualificationQualitativeValues?.map((value) => value.asObject(opts)),
      filteredAndOrderedGpf: this.filteredAndOrderedGpf?.map((value) => value.asObject({ ...opts, keepTypename: true })),
      displayAttributes: this.displayAttributes,
      lastVesselOwner: this.lastVesselOwner?.asObject(opts),
    };
  }
}

@Component({
  selector: 'app-activity-calendar-form-report',
  templateUrl: './activity-calendar-form.report.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-form.report.scss'],
  providers: [],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarFormReport extends AppDataEntityReport<ActivityCalendar, number, ActivityCalendarFormReportStats> {
  readonly pmfmIdsMap = PmfmIds;

  static readonly nbOfNonPmfmRowInEffortTable = 2;

  static readonly pageDimensions: ActivityCalendarFormReportPageDimentions = Object.freeze({
    height: 210 * 4,
    width: 297 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 35,
    sectionTitleHeight: 25,
    monthTableRowTitleHeight: 20,
    monthTableRowHeight: 20,
    monthTableMetierRowHeight: 30,
    gpfTableRowTitleHeight: 20,
    gpfTableColTitleWidth: 200,
    gpfTableRowHeight: 20,
    investigationQualificationSectionHeight: 60,
  });

  protected logPrefix = 'activity-calendar-form-report';
  protected isBlankForm: boolean;
  protected reportPath: string;

  protected readonly activityCalendarService: ActivityCalendarService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly programRefService: ProgramRefService;
  protected readonly vesselSnapshotService: VesselSnapshotService;
  protected readonly vesselOwnerService: VesselOwnerService;
  protected readonly vesselOwnerPeridodService: VesselOwnerPeridodService;
  protected readonly translateContextService: TranslateContextService;
  protected readonly configService: ConfigService;
  protected readonly localSettings: LocalSettingsService;

  protected readonly isActiveList = IsActiveList;
  protected readonly isActiveMap = Object.freeze(splitById(IsActiveList));

  protected filterPmfmSurveyQualification(pmfm: IPmfm): boolean {
    return PmfmIds.SURVEY_QUALIFICATION === pmfm.id;
  }

  protected filterPmfmAuctionHabit(pmfm: IPmfm): boolean {
    return PmfmIds.AUCTION_HABIT === pmfm.id;
  }

  readonly pageDimensions = Object.freeze({ ...ActivityCalendarFormReport.pageDimensions });

  private program: Program;
  private strategy: Strategy;

  constructor(injector: Injector) {
    super(injector, ActivityCalendar, ActivityCalendarFormReportStats, { i18nPmfmPrefix: 'ACTIVITY_CALENDAR.REPORT.PMFM.' });
    this.activityCalendarService = this.injector.get(ActivityCalendarService);
    this.strategyRefService = this.injector.get(StrategyRefService);
    this.programRefService = this.injector.get(ProgramRefService);
    this.vesselSnapshotService = this.injector.get(VesselSnapshotService);
    this.translateContextService = this.injector.get(TranslateContextService);
    this.configService = this.injector.get(ConfigService);
    this.localSettings = this.injector.get(LocalSettingsService);
    this.vesselOwnerService = this.injector.get(VesselOwnerService);
    this.vesselOwnerPeridodService = this.injector.get(VesselOwnerPeridodService);

    this.reportPath = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  computePrintHref(data: ActivityCalendar, stats: ActivityCalendarFormReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/' + this.reportPath);
  }

  async updateView() {
    await super.updateView();

    if (this.reveal.printing) {
      await sleep(500);
      await this.reveal.print();
    }
  }

  protected async loadData(id: number, opts?: any): Promise<ActivityCalendar> {
    console.log(`[${this.logPrefix}] loadData`);
    const filter: ActivityCalendarFilter = ActivityCalendarFilter.fromObject({ includedIds: [id] });
    let loadResult: LoadResult<ActivityCalendar>;
    if (this.isBlankForm) {
      loadResult = await this.activityCalendarService.loadAllVesselOnly(0, 1, null, null, filter);
    } else {
      loadResult = await this.activityCalendarService.loadAll(0, 1, null, null, filter, { fullLoad: true });
    }
    if (isNotNil(loadResult.errors)) throw loadResult.errors;
    let data = loadResult.data?.[0];
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');

    this.program = await this.programRefService.loadByLabel(data.program.label);
    this.strategy = await this.strategyRefService.loadByFilter({
      programId: this.program.id,
      acquisitionLevels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY],
    });

    if (this.isBlankForm) {
      data = fillActivityCalendarBlankData(data, this.program);
    }

    return data;
  }

  protected computeSlidesOptions(data: ActivityCalendar, stats: ActivityCalendarFormReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.width,
      height: this.pageDimensions.height,
      center: false,
    };
  }

  protected async computeStats(
    data: ActivityCalendar,
    opts?: IComputeStatsOpts<ActivityCalendarFormReportStats>
  ): Promise<ActivityCalendarFormReportStats> {
    let stats = new ActivityCalendarFormReportStats();

    stats = await computeCommonActivityCalendarFormReportStats(
      data,
      stats,
      this.programRefService,
      this.vesselSnapshotService,
      this.settings,
      this.program,
      this.strategy,
      this.isBlankForm
    );

    stats = await computeIndividualActivityCalendarFormReportStats(
      data,
      stats,
      this.pageDimensions,
      this.configService,
      this.vesselOwnerService,
      this.vesselOwnerPeridodService,
      this.isBlankForm
    );

    return stats;
  }

  protected async computeTitle(data: ActivityCalendar, stats: ActivityCalendarFormReportStats): Promise<string> {
    return this.isBlankForm
      ? this.translate.instant('ACTIVITY_CALENDAR.REPORT.BLANK_TITLE')
      : this.translate.instant('COMMON.REPORT.REPORT') +
          '&nbsp' +
          this.translateContextService.instant('ACTIVITY_CALENDAR.EDIT.TITLE', this.i18nContext.suffix, {
            year: data.year,
            vessel: referentialToString(
              data.vesselSnapshot,
              this.localSettings.getFieldDisplayAttributes('vesselSnapshot', ['registrationCode', 'name'])
            ),
          });
  }

  protected computeDefaultBackHref(data: ActivityCalendar, stats: ActivityCalendarFormReportStats): string {
    return `/activity-calendar/${data.id}`;
  }

  protected computeShareBasePath(): string {
    return `activity-calendar/report/${this.reportPath}`;
  }
}
