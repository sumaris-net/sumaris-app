import { Component, ViewChild } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { ActivityCalendarService } from '@app/activity-calendar/activity-calendar.service';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { ActivityCalendarsTableSettingsEnum } from '@app/activity-calendar/table/activity-calendars.table';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppBaseReport, BASE_REPORT, BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';
import { VesselOwnerService } from '@app/vessel/services/vessel-owner.service';
import { environment } from '@environments/environment';
import {
  CORE_CONFIG_OPTIONS,
  DateUtils,
  EntityAsObjectOptions,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  ReferentialRef,
  SharedModule,
  splitById,
  StatusIds,
} from '@sumaris-net/ngx-components';
import { ActivityCalendarFormReportContent } from './activity-calendar-form.report.content';
import { GearPhysicalFeatures } from '@app/activity-calendar/model/gear-physical-features.model';
import { Metier } from '@app/referential/metier/metier.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';

export class ActivityCalendarFormsReportStats extends BaseReportStats {
  options: {
    footerText: string;
    logoHeadLeftUrl: string;
    logoHeadRightUrl: string;
    colorPrimary: string;
    colorSecondary: string;
    vesselAttributes: string[];
    timezone: string;
    fishingAreaCount: number;
  };
  strategy: Strategy;
  displayAttributes: {
    vesselSnapshot: string[];
    vesselOwner: string[];
  };
  pmfm: {
    activityMonth: IDenormalizedPmfm[];
    activityCalendar: IDenormalizedPmfm[];
    gpf: IDenormalizedPmfm[];
    guf: IDenormalizedPmfm[];
  };
  pmfmById: {
    activityMonth?: { [key: number]: IDenormalizedPmfm };
    activityCalendar?: { [key: number]: IDenormalizedPmfm };
    gpf?: { [key: number]: IDenormalizedPmfm };
    guf?: { [key: number]: IDenormalizedPmfm };
  };
  surveyQualificationQualitativeValues?: ReferentialRef[];

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.strategy = Strategy.fromObject(source.strategy);
    this.displayAttributes = source.displayAttributes;
    this.pmfm = {
      activityMonth: source?.pmfm?.activityMonth?.map(DenormalizedPmfmStrategy.fromObject) || null,
      activityCalendar: source?.pmfm?.activityCalendar?.map(DenormalizedPmfmStrategy.fromObject) || null,
      gpf: source?.pmfm?.gpf?.map(DenormalizedPmfmStrategy.fromObject) || null,
      guf: source?.pmfm?.guf?.map(DenormalizedPmfmStrategy.fromObject) || null,
    };
    this.pmfmById = {
      activityMonth: splitById(this.pmfm.activityMonth),
      activityCalendar: splitById(this.pmfm.activityCalendar),
      gpf: splitById(this.pmfm.gpf),
      guf: splitById(this.pmfm.guf),
    };
    this.surveyQualificationQualitativeValues = source.surveyQualificationQualitativeValues.map((item: any) => ReferentialRef.fromObject(item));
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      strategy: this.strategy.asObject(opts),
      displayAttributes: this.displayAttributes,
      pmfm: {
        activityMonth: this?.pmfm?.activityMonth?.map((item) => item.asObject(opts)) || null,
        activityCalendar: this?.pmfm?.activityCalendar?.map((item) => item.asObject(opts)) || null,
        gpf: this?.pmfm?.gpf?.map((item) => item.asObject(opts)) || null,
        guf: this?.pmfm?.guf?.map((item) => item.asObject(opts)) || null,
      },
      surveyQualificationQualitativeValues: this.surveyQualificationQualitativeValues.map((item) => item.asObject() || null),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppDataModule, AppReferentialModule, SharedModule, ActivityCalendarFormReportContent],
  selector: 'app-activity-calendar-form-report',
  templateUrl: './activity-calendar-form.report.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-form.report.scss'],
  providers: [{ provide: BASE_REPORT, useExisting: ActivityCalendarFormReport }],
})
export class ActivityCalendarFormReport extends AppBaseReport<ActivityCalendar[], ActivityCalendarFormsReportStats> {
  protected logPrefix = '[activity-calendar-form-report] ';

  @ViewChild(RevealComponent) reveal!: RevealComponent;

  protected isBlankForm: boolean;
  protected reportPath: string;

  private program: Program;
  private strategy: Strategy;

  constructor(
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected activityCalendarService: ActivityCalendarService,
    protected vesselOwnerService: VesselOwnerService,
    protected vesselOwnerPeriodService: VesselOwnerPeridodService
  ) {
    super(Array<ActivityCalendar>, ActivityCalendarFormsReportStats);

    this.reportPath = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
    this.debug = !environment.production;
  }

  async ngOnStart(opts?: any) {
    await super.ngOnStart(opts);

    // If data is not filled by the input or by the clipboard , fill it by loading and computing
    if (isNil(this.data)) if (isNil(this.uuid)) this.data = await this.loadFromRoute(opts);
    if (isNil(this.stats)) this.stats = await this.computeStats(this.data, opts);

    const computedContext = this.computeI18nContext(this.stats);
    this.i18nContext = {
      ...computedContext,
      ...this.i18nContext,
      pmfmPrefix: computedContext?.pmfmPrefix,
    };
  }

  protected async loadFromRoute(opts?: any): Promise<ActivityCalendar[]> {
    const ids = this.computeIncludeIds();
    const filter = isEmptyArray(ids) ? this.restoreLastTableFilter() : ActivityCalendarFilter.fromObject({ includedIds: ids });
    const result = await this.loadData(filter);
    // Case no ids provided -> Data not found
    return result;
  }

  protected async loadData(filter: ActivityCalendarFilter, opts?: any): Promise<ActivityCalendar[]> {
    const result = [];
    const size = 500;

    let loadResult: LoadResult<ActivityCalendar>;
    if (this.isBlankForm) {
      loadResult = await this.activityCalendarService.loadAllVesselOnly(0, size, null, null, filter);
    } else {
      loadResult = await this.activityCalendarService.loadAll(0, size, null, null, filter, { fullLoad: true });
    }
    result.push(...loadResult.data);
    while (Object.prototype.hasOwnProperty.call(loadResult, 'fetchMore')) {
      loadResult = await loadResult.fetchMore();
      result.push(...loadResult.data);
    }

    if (isNotNil(loadResult.errors)) {
      throw loadResult.errors;
    } else if (result.length == 0) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    // Normally is the same for all : get the first
    this.program = await this.programRefService.loadByLabel(result[0].program.label);
    this.strategy = await this.strategyRefService.loadByFilter({
      programId: this.program.id,
      acquisitionLevels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY],
    });

    // If isBlankForm : fill calendars with blank data
    if (this.isBlankForm) {
      return result.reduce((acc, data) => {
        acc.push(this.fillActivityCalendarBlankData(data, this.program));
        return acc;
      }, []);
    }

    return result;
  }

  protected restoreLastTableFilter(): ActivityCalendarFilter {
    const tableFilter = this.settings.getPageSettings(ActivityCalendarsTableSettingsEnum.PAGE_ID, 'filter');
    return ActivityCalendarFilter.fromObject(tableFilter);
  }

  protected async computeStats(
    data: ActivityCalendar[],
    opts?: IComputeStatsOpts<ActivityCalendarFormsReportStats>
  ): Promise<ActivityCalendarFormsReportStats> {
    const stats = new ActivityCalendarFormsReportStats();

    stats.program = this.program;
    stats.strategy = this.strategy;

    stats.options = {
      footerText: stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_FOOTER),
      logoHeadLeftUrl: stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_LEFT_LOGO_URL),
      logoHeadRightUrl: stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_RIGHT_LOGO_URL),
      colorPrimary: this.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY),
      colorSecondary: this.program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY),
      vesselAttributes: (await this.vesselSnapshotService.getAutocompleteFieldOptions('vesselSnapshot'))?.attributes,
      timezone: (await firstNotNilPromise(this.configService.config)).getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE) || DateUtils.moment().tz(),
      fishingAreaCount: this.isBlankForm
        ? stats.program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_FISHING_AREA_PER_METIER)
        : null,
    };

    stats.displayAttributes = {
      vesselSnapshot: this.settings.getFieldDisplayAttributes('vesselSnapshot', ['registrationCode', 'name']),
      vesselOwner: this.settings.getFieldDisplayAttributes('vesselOwner', ['lastName', 'firstName']),
    };

    stats.pmfm = {
      activityMonth: await this.programRefService.loadProgramPmfms(stats.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
        strategyId: stats.strategy.id,
      }),
      activityCalendar: await this.programRefService.loadProgramPmfms(stats.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
        strategyId: stats.strategy.id,
      }),
      gpf: !this.isBlankForm
        ? await this.programRefService.loadProgramPmfms(stats.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES,
            strategyId: stats.strategy.id,
          })
        : [
            DenormalizedPmfmStrategy.fromObject({
              id: -1,
              name: stats.program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_PHYSICAL_GEAR_PMFM_1),
            }),
            DenormalizedPmfmStrategy.fromObject({
              id: -2,
              name: stats.program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_PHYSICAL_GEAR_PMFM_2),
            }),
          ],
      guf: !this.isBlankForm
        ? await this.programRefService.loadProgramPmfms(stats.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES,
            strategyId: stats.strategy.id,
          })
        : [],
    };

    stats.pmfmById = {
      activityMonth: splitById(stats.pmfm.activityMonth),
      activityCalendar: splitById(stats.pmfm.activityCalendar),
      gpf: splitById(stats.pmfm.gpf),
      guf: splitById(stats.pmfm.guf),
    };

    // Sort AUCTION_HABIT qualitativeValues in alphabetical order
    if (isNotNil(stats.pmfmById.activityCalendar[PmfmIds.AUCTION_HABIT])) {
      stats.pmfmById.activityCalendar[PmfmIds.AUCTION_HABIT].qualitativeValues = stats.pmfmById.activityCalendar[
        PmfmIds.AUCTION_HABIT
      ].qualitativeValues.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Order survey qualification values by alphabetical order
    stats.surveyQualificationQualitativeValues = stats.pmfm.activityCalendar
      .filter((pmfm) => pmfm.id === PmfmIds.SURVEY_QUALIFICATION)[0]
      ?.qualitativeValues.filter((qv) => (this.isBlankForm ? qv.statusId === StatusIds.ENABLE : true))
      .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

    return stats;
  }

  dataFromObject(source: any): ActivityCalendar[] {
    const result = source.map((s: any) => ActivityCalendar.fromObject(s));
    return result;
  }

  dataAsObject(opts?: EntityAsObjectOptions): any {
    if (!this.loaded) {
      throw `${this.logPrefix} Data are not already loaded`;
    }
    const result = this.data.map((activityCalendar) => activityCalendar.asObject(opts));
    return result;
  }

  protected computeSlidesOptions(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.pageWidth,
      height: this.pageDimensions.pageHeight,
      center: false,
    };
  }

  protected computeTitle(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): Promise<string> {
    return this.translate.instant('ACTIVITY_CALENDAR.REPORT.TITLE_MULTI');
  }

  computePrintHref(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else {
      const url =
        window.location.origin +
        this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') +
        (data.length === 1 ? `/${data[0].id}` : '') +
        '/report/' +
        this.reportPath;
      return new URL(url);
    }
  }

  protected computeDefaultBackHref(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): string {
    return '/activity-calendar';
  }

  protected computeShareBasePath(): string {
    return `activity-calendar/report/${this.reportPath}`;
  }

  protected computeIncludeIds(): number[] {
    const idStr: string = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNotNilOrBlank(idStr)) {
      const id = parseInt(idStr);
      if (id) {
        return [id];
      }
    }

    const idsStr: string = this.route.snapshot.queryParamMap.get('ids');
    if (isNotNilOrBlank(idsStr)) {
      const ids = idsStr
        .split(',')
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (isNotEmptyArray(ids)) {
        return ids;
      }
    }

    return null;
  }

  protected computePageDimensions(): FormReportPageDimensions {
    const pageWidth = 297 * 4;
    const pageHeight = 210 * 4;
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

  protected fillActivityCalendarBlankData(data: ActivityCalendar, program: Program): ActivityCalendar {
    const nbOfMetierBlock = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_METIER_BLOCK);
    const nbOfGearsColumn = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_GEARS_COLUMN);

    data.year = DateUtils.moment().year() - 1;
    CalendarUtils.getMonths(DateUtils.moment().year());
    data.gearPhysicalFeatures = new Array(nbOfGearsColumn).fill(null).map((_, index) =>
      GearPhysicalFeatures.fromObject({
        rankOder: index + 1,
        metier: Metier.fromObject({
          id: -1 * (index + 1),
        }),
      })
    );
    data.gearUseFeatures = new Array(nbOfMetierBlock).fill(null).map((_, index) => {
      const startDate = DateUtils.moment().year(data.year).month(0).startOf('month');
      const endDate = startDate.clone().endOf('month').startOf('day');
      return GearUseFeatures.fromObject({
        rankOder: index + 1,
        metier: Metier.fromObject({
          id: -1 * (index + 1),
        }),
        startDate,
        endDate,
      });
    });
    return data;
  }
}
