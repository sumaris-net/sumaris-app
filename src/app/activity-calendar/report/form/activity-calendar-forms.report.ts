import { Component, Injector, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { ActivityCalendarService } from '@app/activity-calendar/activity-calendar.service';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { AppBaseReport, BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import {
  ConfigService,
  EntityAsObjectOptions,
  WaitForOptions,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
} from '@sumaris-net/ngx-components';
import { ActivityCalendarFormReport, ActivityCalendarFormReportStats } from './activity-calendar-form.report';
import {
  computeCommonActivityCalendarFormReportStats,
  computeIndividualActivityCalendarFormReportStats,
  fillActivityCalendarBlankData,
} from './activity-calendar-form-report.utils';
import { ActivityCalendarsTableSettingsEnum } from '@app/activity-calendar/table/activity-calendars.table';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';

class ActivityCalendarFormsReportStats extends BaseReportStats {
  activityCalendarFormReportStatsByIds: { [key: number]: ActivityCalendarFormReportStats };

  fromObject(source: any): void {
    super.fromObject(source);
    this.activityCalendarFormReportStatsByIds = {};
    if (isNotNil(source?.activityCalendarFormReportStatsByIds) && typeof source.activityCalendarFormReportStatsByIds == 'object') {
      for (const key of Object.keys(source?.activityCalendarFormReportStatsByIds)) {
        this.activityCalendarFormReportStatsByIds[key] = ActivityCalendarFormReportStats.fromObject(source.activityCalendarFormReportStatsByIds[key]);
      }
    }
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const result = super.asObject();
    if (isNotNil(this?.activityCalendarFormReportStatsByIds)) {
      result.activityCalendarFormReportStatsByIds = {};
      for (const key of Object.keys(this.activityCalendarFormReportStatsByIds)) {
        result.activityCalendarFormReportStatsByIds[key] = this.activityCalendarFormReportStatsByIds[key].asObject(opts);
      }
    }
    return result;
  }
}

@Component({
  selector: 'app-activity-calendar-forms-report',
  templateUrl: './activity-calendar-forms.report.html',
})
export class ActivityCalendarFormsReport extends AppBaseReport<ActivityCalendar[], number[], ActivityCalendarFormsReportStats> {
  protected logPrefix = '[activity-calendar-forms-report] ';

  @ViewChild(RevealComponent) reveal!: RevealComponent;
  @ViewChildren(ActivityCalendarFormReport) children!: QueryList<ActivityCalendarFormReport>;

  protected isBlankForm: boolean;
  protected reportPath: string;

  private program: Program;
  private strategy: Strategy;
  private ids: number[] = [];

  constructor(
    injector: Injector,
    protected activityCalendarService: ActivityCalendarService,
    protected configService: ConfigService,
    protected programRefService: ProgramRefService,
    protected strategyRefService: StrategyRefService,
    protected vesselSnapshotService: VesselSnapshotService
  ) {
    super(injector, Array, ActivityCalendarFormsReportStats);

    this.reportPath = this.route.snapshot.routeConfig.path;
    this.isBlankForm = this.route.snapshot.data?.isBlankForm;
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
    const idsStr = this.route.snapshot.queryParamMap.get('ids');

    if (isNotNilOrBlank(idsStr)) {
      const ids = idsStr
        .split(',')
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (isNotEmptyArray(ids)) {
        this.ids = ids;
        const result = await this.loadData(ids);
        return result;
      }
    }

    // Case no ids provided -> Data not found
    return [];
  }

  protected async loadData(ids: number[], opts?: any): Promise<ActivityCalendar[]> {
    // isEmptyArray(ids) ? :
    const filter = isEmptyArray(ids) ? this.restoreLastTableFilter() : ActivityCalendarFilter.fromObject({ includedIds: ids });
    const result = [];
    const size = 500;

    let loadResult;
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

    if (isNotNil(loadResult.error)) {
      throw loadResult.error;
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
        acc.push(fillActivityCalendarBlankData(data, this.program));
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
    let commonAcStats = new ActivityCalendarFormReportStats();
    commonAcStats = await computeCommonActivityCalendarFormReportStats(
      data[0],
      commonAcStats,
      this.programRefService,
      this.vesselSnapshotService,
      this.program,
      this.strategy,
      this.isBlankForm
    );
    const commonAcStatsObj = commonAcStats.asObject();
    stats.activityCalendarFormReportStatsByIds = {};
    for (const activityCalendar of data) {
      let indivStats = ActivityCalendarFormReportStats.fromObject(commonAcStatsObj);
      indivStats = await computeIndividualActivityCalendarFormReportStats(
        activityCalendar,
        indivStats,
        ActivityCalendarFormReport.pageDimensions,
        this.configService,
        this.isBlankForm
      );
      stats.activityCalendarFormReportStatsByIds[activityCalendar.id] = indivStats;
    }

    return stats;
  }

  async waitIdle(opts: WaitForOptions) {
    await super.waitIdle(opts);

    // this.cd.detectChanges();
    await Promise.all(
      this.children.map((c) => {
        console.debug(`[${this.logPrefix}] Waiting for child`);
        return c.waitIdle(opts);
      })
    );
  }

  async updateView() {
    if (this.debug) console.debug(`${this.logPrefix}updateView`);

    this.cd.detectChanges();
    await this.waitIdle({ stop: this.destroySubject });

    this.reveal.initialize();
  }

  dataFromObject(source: any): ActivityCalendar[] {
    return source.map((s) => ActivityCalendar.fromObject(s));
  }

  dataAsObject(source: ActivityCalendar[], opts?: EntityAsObjectOptions): any {
    return source.map((activityCalendar) => activityCalendar.asObject(opts));
  }

  protected computeSlidesOptions(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: ActivityCalendarFormReport.pageDimensions.width,
      height: ActivityCalendarFormReport.pageDimensions.height,
      center: false,
    };
  }

  protected computeTitle(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): Promise<string> {
    return this.translate.instant('ACTIVITY_CALENDAR.REPORT.TITLE_MULTI');
  }

  computePrintHref(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else {
      const url = new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/' + this.reportPath);
      url.searchParams.append('ids', this.ids.toString());
      return url;
    }
  }

  protected computeDefaultBackHref(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): string {
    return '/activity-calendar';
  }

  protected computeShareBasePath(): string {
    return `activity-calendar/report/${this.reportPath}`;
  }
}
