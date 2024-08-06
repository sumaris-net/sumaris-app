import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { ActivityCalendarQueries, ActivityCalendarService } from '@app/activity-calendar/activity-calendar.service';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { LocalSettingsService, TranslateContextService, isNil } from '@sumaris-net/ngx-components';
import moment, { Moment } from 'moment';

export class ActivityCalendarProgressReportStats extends BaseReportStats {
  subtitle: string;
  footerText: string;
  logoHeadLeftUrl: string;
  logoHeadRightUrl: string;
  sortBy: string;
  sortDirection: string;
  activityCalendar: ActivityCalendar[];
  monthByActivityCalendarIds: { [key: number]: ActivityMonth };
  strategy: Strategy;
  monthLetters: string[];
  reportDate: Moment;
  pmfms: {
    activityCalendar: IPmfm[];
  };
  pmfmsByIds: {
    activityCalendar: { [key: number]: IPmfm };
  };
  tableRowChunk: ActivityCalendar[][];
}

@Component({
  selector: 'app-activity-calendar-progress',
  templateUrl: './activity-calendar-progress.report.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-progress.report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarProgressReport extends AppDataEntityReport<ActivityCalendarFilter, number, ActivityCalendarProgressReportStats> {
  static readonly DEFAULT_PROGRAM = 'SIH-ACTIFLOT';
  protected readonly PARENT_PAGE_SETTING = 'activity-calendars';

  protected logPrefix = 'activity-calendar-progress-report';

  protected readonly pageDimensions = Object.freeze({
    height: 297 * 4,
    width: 210 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 16,
    sectionTitleHeight: 25,
    filterSectionHeight: 140,
    synthesisSectionHeight: 140,
    theadHeight: 50,
    tableRowHeight: 30,
  });

  protected readonly activityCalendarService: ActivityCalendarService;
  protected readonly translateContextService: TranslateContextService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly settings: LocalSettingsService;

  constructor(injector: Injector) {
    super(injector, ActivityCalendarFilter, ActivityCalendarProgressReportStats, { i18nPmfmPrefix: 'ACTIVITY_CALENDAR.REPORT.PROGRESS.PMFM.' });
    this.activityCalendarService = injector.get(ActivityCalendarService);
    this.translateContextService = injector.get(TranslateContextService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.settings = injector.get(LocalSettingsService);
  }

  computePrintHref(filter: ActivityCalendarFilter, stats: ActivityCalendarProgressReportStats): URL {
    if (this.uuid) return super.computePrintHref(filter, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(filter, stats).replace(/\?.*$/, '') + '/report/progress/');
  }

  protected async loadFromRoute(opts?: any): Promise<ActivityCalendarFilter> {
    if (this.debug) console.debug(`[${this.logPrefix}] load data from route`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNil(this.id)) {
      return this.loadFromSettings(opts);
    }
    return this.load(this.id, opts);
  }

  protected loadFromSettings(opts?: any): ActivityCalendarFilter {
    // TODO : Handle case when settings not found
    return ActivityCalendarFilter.fromObject(this.settings.getPageSettings(this.PARENT_PAGE_SETTING, 'filter'));
  }

  protected async loadData(id: number, opts?: any): Promise<ActivityCalendarFilter> {
    console.log(`[${this.logPrefix}] loadData`);
    // TODO Load from filter service
    // const data: ActivityCalendar = await this.activityCalendarService.load(id, { ...opts });
    // if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return ActivityCalendarFilter.fromObject({});
  }

  protected computeSlidesOptions(filter: ActivityCalendarFilter, stats: ActivityCalendarProgressReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(filter, stats),
      width: this.pageDimensions.width,
      height: this.pageDimensions.height,
      center: false,
    };
  }

  protected async computeStats(
    filter: ActivityCalendarFilter,
    opts?: IComputeStatsOpts<ActivityCalendarProgressReportStats>
  ): Promise<ActivityCalendarProgressReportStats> {
    const stats = new ActivityCalendarProgressReportStats();

    // TODO : CHECK-IT : Get default from class constant ?
    const programLabel = filter.program.label || ActivityCalendarProgressReport.DEFAULT_PROGRAM;

    stats.program = await this.programRefService.loadByLabel(programLabel);
    // TODO : CHECK-IT : Quick and dirty ! (DataStrategyResolutions.LAST)
    stats.strategy = await this.strategyRefService.loadByFilter({
      programId: stats.program.id,
      acquisitionLevels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR],
    });
    const strategyId = stats.strategy.id;

    const [sortBy, sortDirection] = this.settings.getPageSettings(this.PARENT_PAGE_SETTING, 'sortedColumn').split(':');
    stats.sortBy = sortBy;
    stats.sortDirection = sortDirection;

    // TODO : CHECK-ID : Find a better way
    stats.monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    // Compute PMFMs
    stats.pmfms = {
      activityCalendar: await this.programRefService.loadProgramPmfms(stats.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
        strategyId,
      }),
    };

    // Load ActivityCalendars
    // const { data } = await this.activityCalendarService.loadAll(null, null, sortBy, sortDirection, filter, {
    //   query: ActivityCalendarQueries.loadAllSummary,
    // });
    // stats.activityCalendar = data.map((entity) => ActivityCalendar.fromObject(entity));
    // TODO : Mock
    stats.activityCalendar = [];
    for (let i = 0; i < 12; i++) {
      stats.activityCalendar.push(ActivityCalendar.fromObject({ id: i }));
    }

    stats.tableRowChunk = this.computeTableChunk(stats);
    // Compute ActivityMonth
    stats.monthByActivityCalendarIds = stats.activityCalendar.reduce((result, activityCalendar) => {
      result[activityCalendar.id] = ActivityMonthUtils.fromActivityCalendar(activityCalendar);
      return result;
    }, {});

    stats.reportDate = moment();
    stats.reportDate.year;
    // console.debug('MYTEST data/stats', filter, stats);
    return stats;
  }

  protected async computeTitle(filter: ActivityCalendarFilter, stats: ActivityCalendarProgressReportStats): Promise<string> {
    return this.translateContextService.instant('ACTIVITY_CALENDAR.REPORT.PROGRESS.TITLE', this.i18nContext.suffix, {
      year: filter.year,
    });
  }

  protected computeDefaultBackHref(filter: ActivityCalendarFilter, stats: ActivityCalendarProgressReportStats): string {
    return `/activity-calendar/`;
  }

  protected computeShareBasePath(): string {
    return 'activity-calendar/report/progress';
  }

  protected computeTableChunk(stats: ActivityCalendarProgressReportStats): ActivityCalendar[][] {
    const totalAvailableHeightForContent =
      this.pageDimensions.width - // Use width because page is landscape
      this.pageDimensions.marginTop -
      this.pageDimensions.marginBottom -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight;

    const nbLinesAvailableOnAllInOnePage = Math.trunc(
      (totalAvailableHeightForContent -
        (this.pageDimensions.filterSectionHeight + this.pageDimensions.synthesisSectionHeight + this.pageDimensions.theadHeight)) /
        this.pageDimensions.tableRowHeight
    );

    const nbLinesAvailableOnFirstPage = Math.trunc(
      (totalAvailableHeightForContent - (this.pageDimensions.filterSectionHeight + this.pageDimensions.theadHeight)) /
        this.pageDimensions.tableRowHeight
    );

    const nbLinesAvailableOnLastPage = Math.trunc(
      (totalAvailableHeightForContent - (this.pageDimensions.synthesisSectionHeight + this.pageDimensions.theadHeight)) /
        this.pageDimensions.tableRowHeight
    );

    const nbLinesAvailableOnOtherPage = Math.trunc(
      (totalAvailableHeightForContent - this.pageDimensions.theadHeight) / this.pageDimensions.tableRowHeight
    );

    // All lines fit in one page
    if (stats.activityCalendar.length <= nbLinesAvailableOnAllInOnePage) {
      return [stats.activityCalendar];
    }

    // First page
    const result = [stats.activityCalendar.slice(0, nbLinesAvailableOnFirstPage)];
    let consumedLineCount = nbLinesAvailableOnFirstPage;

    // Middle page
    while (stats.activityCalendar.length - consumedLineCount > nbLinesAvailableOnLastPage) {
      result.push(stats.activityCalendar.slice(consumedLineCount, consumedLineCount + nbLinesAvailableOnOtherPage));
      consumedLineCount += nbLinesAvailableOnOtherPage;
    }

    // Last page
    result.push(stats.activityCalendar.slice(consumedLineCount));

    return result;
  }
}
