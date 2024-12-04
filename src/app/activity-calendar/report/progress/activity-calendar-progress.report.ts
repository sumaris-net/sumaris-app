import { Component, inject, Injector, ViewEncapsulation } from '@angular/core';
import { ActivityCalendarFilter } from '@app/activity-calendar/activity-calendar.filter';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppExtractionReport } from '@app/data/report/extraction-report.class';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import {
  DateUtils,
  EntityAsObjectOptions,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNilOrBlank,
  LocalSettingsService,
  splitById,
  toDateISOString,
  TranslateContextService,
} from '@sumaris-net/ngx-components';
import {
  ActivityMonitoring,
  ActivityMonitoringExtractionData,
  ActivityMonitoringStatusEnum,
  ActivityMonitoringStatusErrorIds,
} from './activity-calendar-progress-report.model';
import { ActivityCalendarProgressReportService } from './activity-calendar-progress-report.service';
import { Program } from '@app/referential/services/model/program.model';
import { Moment } from 'moment';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ActivityCalendarsTableSettingsEnum } from '@app/activity-calendar/table/activity-calendars.table';
import { ProgramLabels } from '@app/referential/services/model/model.enum';
import { DirectSurveyInvestigationEnum, DirectSurveyInvestigationList } from '@app/activity-calendar/model/activity-calendar.model';

export class ActivityCalendarProgressReportStats extends BaseReportStats {
  subtitle: string;
  footerText: string;
  logoHeadLeftUrl: string;
  logoHeadRightUrl: string;
  colorPrimary: string;
  colorSecondary: string;
  filter: ActivityCalendarFilter;
  tableRowChunk: ActivityMonitoring[][];
  reportDate: Moment;
  showProgram: boolean;
  vesselAttributes: string[];
  agg: {
    vesselCount: number;
    totalDirectSurveyCount: number;
    totalDirectSurveyPercent: number;
    emptyVesselCount: number;
    emptyVesselPercent: number;
    uncompletedVesselCount: number;
    uncompletedVesselPercent: number;
    completedCalendarCount: number;
    completedCalendarPercent: number;
  };

  fromObject(source: any) {
    super.fromObject(source);
    this.subtitle = source.subtitle;
    this.footerText = source.footerText;
    this.logoHeadLeftUrl = source.logoHeadLeftUrl;
    this.logoHeadRightUrl = source.logoHeadRightUrl;
    this.colorPrimary = source.colorPrimary;
    this.colorSecondary = source.colorSecondary;
    this.filter = ActivityCalendarFilter.fromObject(source.filter);
    this.tableRowChunk = source.tableRowChunk;
    this.reportDate = fromDateISOString(source.reportDate);
    this.showProgram = source.showProgram;
    this.vesselAttributes = source.vesselAttributes;
    this.agg = {
      vesselCount: source.agg.vesselCount,
      totalDirectSurveyCount: source.agg.totalDirectSurveyCount,
      totalDirectSurveyPercent: source.agg.totalDirectSurveyPercent,
      emptyVesselCount: source.agg.emptyVesselCount,
      emptyVesselPercent: source.agg.emptyVesselPercent,
      uncompletedVesselCount: source.agg.uncompletedVesselCount,
      uncompletedVesselPercent: source.agg.uncompletedVesselPercent,
      completedCalendarCount: source.agg.completedCalendarCount,
      completedCalendarPercent: source.agg.completedCalendarPercent,
    };
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
      filter: this.filter.asObject(opts),
      tableRowChunk: this.tableRowChunk,
      reportDate: toDateISOString(this.reportDate),
      showProgram: this.showProgram,
      vesselAttributes: this.vesselAttributes,
      agg: {
        vesselCount: this.agg.vesselCount,
        totalDirectSurveyCount: this.agg.totalDirectSurveyCount,
        totalDirectSurveyPercent: this.agg.totalDirectSurveyPercent,
        emptyVesselCount: this.agg.emptyVesselCount,
        emptyVesselPercent: this.agg.emptyVesselPercent,
        uncompletedVesselCount: this.agg.uncompletedVesselCount,
        uncompletedVesselPercent: this.agg.uncompletedVesselPercent,
        completedCalendarCount: this.agg.completedCalendarCount,
        completedCalendarPercent: this.agg.completedCalendarPercent,
      },
    };
  }
}

@Component({
  selector: 'app-activity-calendar-progress',
  templateUrl: './activity-calendar-progress.report.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-progress.report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarProgressReport extends AppExtractionReport<ActivityMonitoringExtractionData, ActivityCalendarProgressReportStats> {
  static DEFAULT_PROGRAM_LABEL = ProgramLabels.SIH_ACTIFLOT;
  static DEFAULT_YEAR = DateUtils.moment().year() - 1;

  protected readonly activityMonitoringStatusErrorIds = ActivityMonitoringStatusErrorIds;
  protected readonly months = new Array(12).fill(1).map((v, i) => 'month' + (v + i));

  protected logPrefix = 'activity-calendar-progress-report';

  protected readonly pageDimensions = Object.freeze({
    height: 210 * 4,
    width: 297 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 35,
    captionHeight: 11,
    sectionTitleHeight: 25,
    filterSectionHeight: 140,
    synthesisSectionHeight: 140,
    theadHeight: 50,
    tableRowHeight: 30,
  });

  protected readonly vesselSnapshotService = inject(VesselSnapshotService);
  protected readonly activityCalendarProgressReportService = inject(ActivityCalendarProgressReportService);
  protected readonly translateContextService = inject(TranslateContextService);
  protected readonly strategyRefService = inject(StrategyRefService);
  protected readonly settings = inject(LocalSettingsService);
  protected readonly directSurveyInvestigationMap = Object.freeze(splitById(DirectSurveyInvestigationList));

  constructor(injector: Injector) {
    super(injector, null, ActivityCalendarProgressReportStats);
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
    const tableFilter = this.restoreLastTableFilter() || ActivityCalendarFilter.fromObject({});

    // set defaults
    if (isNil(tableFilter.year)) tableFilter.year = ActivityCalendarProgressReport.DEFAULT_YEAR;
    if (isNil(tableFilter.program?.label)) tableFilter.program = Program.fromObject({ label: ActivityCalendarProgressReport.DEFAULT_PROGRAM_LABEL });

    const includedIds = this.computeIncludeIds();
    if (includedIds) {
      tableFilter.includedIds = includedIds;
    }

    const extractionFilter = ExtractionUtils.createActivityCalendarFilter(tableFilter.program.label, tableFilter);

    return this.load(extractionFilter);
  }

  dataAsObject(source: ActivityMonitoringExtractionData, opts?: EntityAsObjectOptions) {
    return {
      AC: source.AC.map((item) => item.asObject(opts)),
      AM: source.AM.map((item) => item.asObject(opts)),
    };
  }

  protected async computeStats(
    data: ActivityMonitoringExtractionData,
    opts?: IComputeStatsOpts<ActivityCalendarProgressReportStats>
  ): Promise<ActivityCalendarProgressReportStats> {
    const stats = new ActivityCalendarProgressReportStats();

    stats.filter = this.restoreLastTableFilter() || ActivityCalendarFilter.fromObject({});
    if (isNil(stats.filter.year)) {
      stats.filter.year = ActivityCalendarProgressReport.DEFAULT_YEAR;
    }
    if (isNil(stats.filter.program)) {
      stats.filter.program = Program.fromObject({
        label: ActivityCalendarProgressReport.DEFAULT_PROGRAM_LABEL,
      });
    }

    const program = await this.programRefService.loadByLabel(stats.filter.program.label);
    stats.reportDate = DateUtils.moment();
    stats.showProgram = program.label !== ActivityCalendarProgressReport.DEFAULT_PROGRAM_LABEL;
    stats.vesselAttributes = (await this.vesselSnapshotService.getAutocompleteFieldOptions('vesselSnapshot'))?.attributes;
    stats.footerText = program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_PROGRESS_FOOTER);
    stats.logoHeadLeftUrl = program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_LEFT_LOGO_URL);
    stats.logoHeadRightUrl = program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_RIGHT_LOGO_URL);
    stats.colorPrimary = program.getProperty(ProgramProperties.DATA_REPORT_COLOR_PRIMARY);
    stats.colorSecondary = program.getProperty(ProgramProperties.DATA_REPORT_COLOR_SECONDARY);

    // Compute AGG
    const agg = {
      vesselCount: data.AM.length,
      totalDirectSurveyCount: data.AM.filter((item) => item.directSurveyInvestigation == 'YES').length,
      emptyVesselCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.EMPTY).length,
      uncompletedVesselCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.INCOMPLETE).length,
      completedCalendarCount: data.AM.filter((item) => item.status == ActivityMonitoringStatusEnum.COMPLETE).length,
    };
    stats.agg = {
      vesselCount: agg.vesselCount,
      totalDirectSurveyCount: agg.totalDirectSurveyCount,
      emptyVesselCount: agg.emptyVesselCount,
      uncompletedVesselCount: agg.uncompletedVesselCount,
      completedCalendarCount: agg.completedCalendarCount,
      totalDirectSurveyPercent: parseFloat(((agg.totalDirectSurveyCount / agg.vesselCount) * 100).toFixed(2)),
      emptyVesselPercent: parseFloat(((agg.emptyVesselCount / agg.vesselCount) * 100).toFixed(2)),
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
    else {
      const url = new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/progress/');
      const ids = this.computeIncludeIds();
      if (isNotEmptyArray(ids)) {
        url.searchParams.set('ids', ids.toString());
      }
      return url;
    }
  }

  protected computeShareBasePath(): string {
    return 'activity-calendar/report/progress';
  }

  protected computeTableChunk(data: ActivityMonitoringExtractionData, stats: ActivityCalendarProgressReportStats): ActivityMonitoring[][] {
    const totalAvailableHeightForContent =
      this.pageDimensions.height -
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

  protected restoreLastTableFilter(): ActivityCalendarFilter {
    const tableFilter = this.settings.getPageSettings(ActivityCalendarsTableSettingsEnum.PAGE_ID, 'filter');
    return ActivityCalendarFilter.fromObject(tableFilter);
  }

  protected computeIncludeIds(): number[] {
    const idsStr = this.route.snapshot.queryParamMap.get('ids');

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
}
