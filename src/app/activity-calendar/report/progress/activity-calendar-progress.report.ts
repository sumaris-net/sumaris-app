import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { ActivityCalendarService } from '@app/activity-calendar/activity-calendar.service';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppExtractionReport } from '@app/data/report/extraction-report.class';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { DateUtils, EntityAsObjectOptions, LocalSettingsService, TranslateContextService, isNil } from '@sumaris-net/ngx-components';
import {
  ActivityMonitoring,
  ActivityMonitoringExtractionData,
  ActivityMonitoringStatusEnum,
  ActivityMonitoringStatusErrorIds,
} from './activity-calendar-progress-report.model';
import { ActivityCalendarProgressReportService } from './activity-calendar-progress-report.service';
import { Program } from '@app/referential/services/model/program.model';
import { Moment } from 'moment';

export class ActivityCalendarProgressReportStats extends BaseReportStats {
  subtitle: string;
  footerText: string;
  logoHeadLeftUrl: string;
  logoHeadRightUrl: string;
  filter: ActivityCalendarFilter;
  strategy: Strategy;
  tableRowChunk: ActivityMonitoring[][];
  reportDate: Moment;
  agg: {
    vesselCount: number;
    totalDirectSurveyCount: number;
    totalDirectSurveyPercent: number;
    unresignedVesselCount: number;
    unresignedVesselPercent: number;
    uncompletedVesselCount: number;
    uncompletedVesselPercent: number;
    completedCalendarCount: number;
    completedCalendarPercent: number;
  };
}

@Component({
  selector: 'app-activity-calendar-progress',
  templateUrl: './activity-calendar-progress.report.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-progress.report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarProgressReport extends AppExtractionReport<ActivityMonitoringExtractionData, ActivityCalendarProgressReportStats> {
  static readonly DEFAULT_PROGRAM = 'SIH-ACTIFLOT';
  protected readonly activityMonitoringStatusErrorIds = ActivityMonitoringStatusErrorIds;
  protected readonly months = new Array(12).fill(1).map((v, i) => 'month' + (v + i));
  protected readonly PARENT_PAGE_SETTING = 'activity-calendars';

  protected logPrefix = 'activity-calendar-progress-report';

  protected readonly pageDimensions = Object.freeze({
    height: 297 * 4,
    width: 210 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 16,
    captionHeight: 11,
    sectionTitleHeight: 25,
    filterSectionHeight: 140,
    synthesisSectionHeight: 140,
    theadHeight: 50,
    tableRowHeight: 30,
  });

  protected readonly activityCalendarService: ActivityCalendarService;
  protected readonly activityCalendarProgressReportService: ActivityCalendarProgressReportService;
  protected readonly translateContextService: TranslateContextService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly settings: LocalSettingsService;

  // { i18nPmfmPrefix: 'ACTIVITY_CALENDAR.REPORT.PROGRESS.PMFM.' }
  constructor(injector: Injector) {
    super(injector, null, ActivityCalendarProgressReportStats);
    this.activityCalendarService = injector.get(ActivityCalendarService);
    this.translateContextService = injector.get(TranslateContextService);
    this.activityCalendarProgressReportService = injector.get(ActivityCalendarProgressReportService);
    this.strategyRefService = injector.get(StrategyRefService);
    this.settings = injector.get(LocalSettingsService);
  }

  protected computeSlidesOptions(
    data: ActivityMonitoringExtractionData,
    stats: ActivityCalendarProgressReportStats
  ): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.width,
      height: this.pageDimensions.height,
      center: false,
    };
  }

  protected load(filter: ExtractionFilter, opts?: any): Promise<ActivityMonitoringExtractionData> {
    return this.activityCalendarProgressReportService.loadAll(filter);
  }

  protected async loadFromRoute(opts?: any): Promise<ActivityMonitoringExtractionData> {
    const activityCalendarFilter = this.getActivityCalendarFilterFromPageSettings();
    const extractionFilter = ExtractionUtils.createActivityCalendarFilter(
      activityCalendarFilter.program?.label || ActivityCalendarProgressReport.DEFAULT_PROGRAM,
      activityCalendarFilter
    );

    return this.load(extractionFilter);
  }

  dataAsObject(source: ActivityMonitoringExtractionData, opts?: EntityAsObjectOptions) {
    return {
      AM: source.AM.map((item) => item.asObject(opts)),
    };
  }

  protected async computeStats(
    data: ActivityMonitoringExtractionData,
    opts?: IComputeStatsOpts<ActivityCalendarProgressReportStats>
  ): Promise<ActivityCalendarProgressReportStats> {
    const stats = new ActivityCalendarProgressReportStats();

    stats.filter = this.getActivityCalendarFilterFromPageSettings();
    if (isNil(stats.filter.program))
      stats.filter.program = Program.fromObject({
        label: ActivityCalendarProgressReport.DEFAULT_PROGRAM,
      });

    stats.reportDate = DateUtils.moment();

    // Compute AGG
    const agg = {
      vesselCount: data.AM.length,
      totalDirectSurveyCount: data.AM.filter((item) => item.surveyQualification == 'Directe').length,
      unresignedVesselCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.EMPTY).length,
      uncompletedVesselCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.INCOMPLETE).length,
      completedCalendarCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.COMPLETE).length,
    };
    stats.agg = {
      vesselCount: agg.vesselCount,
      totalDirectSurveyCount: agg.totalDirectSurveyCount,
      unresignedVesselCount: agg.unresignedVesselCount,
      uncompletedVesselCount: agg.uncompletedVesselCount,
      completedCalendarCount: agg.completedCalendarCount,
      totalDirectSurveyPercent: parseFloat(((agg.totalDirectSurveyCount / agg.vesselCount) * 100).toFixed(2)),
      unresignedVesselPercent: parseFloat(((agg.unresignedVesselCount / agg.vesselCount) * 100).toFixed(2)),
      uncompletedVesselPercent: parseFloat(((agg.uncompletedVesselCount / agg.vesselCount) * 100).toFixed(2)),
      completedCalendarPercent: parseFloat(((agg.completedCalendarCount / agg.vesselCount) * 100).toFixed(2)),
    };

    stats.tableRowChunk = this.computeTableChunk(data, stats);

    return stats;
  }

  protected async computeTitle(data: ActivityMonitoringExtractionData, stats: ActivityCalendarProgressReportStats): Promise<string> {
    return this.translateContextService.instant('ACTIVITY_CALENDAR.REPORT.PROGRESS.TITLE', this.i18nContextSuffix, {
      year: stats.filter.year.toString(),
    });
  }

  protected computeDefaultBackHref(data: ActivityMonitoringExtractionData, stats: ActivityCalendarProgressReportStats): string {
    return '/activity-calendar';
  }

  computePrintHref(data: ActivityMonitoringExtractionData, stats: ActivityCalendarProgressReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/progress/');
  }

  protected computeShareBasePath(): string {
    return 'activity-calendar/report/progress';
  }

  protected computeTableChunk(data: ActivityMonitoringExtractionData, stats: ActivityCalendarProgressReportStats): ActivityMonitoring[][] {
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
      (totalAvailableHeightForContent -
        (this.pageDimensions.synthesisSectionHeight + this.pageDimensions.theadHeight + this.pageDimensions.captionHeight)) /
        this.pageDimensions.tableRowHeight
    );

    const nbLinesAvailableOnOtherPage = Math.trunc(
      (totalAvailableHeightForContent - this.pageDimensions.theadHeight) / this.pageDimensions.tableRowHeight
    );

    // All lines fit in one page
    if (data.AM.length <= nbLinesAvailableOnAllInOnePage) {
      return [data.AM];
    }

    // First page
    const result = [data.AM.slice(0, nbLinesAvailableOnFirstPage)];
    let consumedLineCount = nbLinesAvailableOnFirstPage;

    // Middle page
    while (data.AM.length - consumedLineCount > nbLinesAvailableOnLastPage) {
      result.push(data.AM.slice(consumedLineCount, consumedLineCount + nbLinesAvailableOnOtherPage));
      consumedLineCount += nbLinesAvailableOnOtherPage;
    }

    // Last page
    result.push(data.AM.slice(consumedLineCount));

    return result;
  }

  protected getActivityCalendarFilterFromPageSettings(): ActivityCalendarFilter {
    return ActivityCalendarFilter.fromObject(this.settings.getPageSettings(this.PARENT_PAGE_SETTING, 'filter'));
  }
}
