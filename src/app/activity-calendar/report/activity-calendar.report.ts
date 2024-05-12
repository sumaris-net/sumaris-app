import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { ActivityCalendar } from '../model/activity-calendar.model';
import { environment } from '@environments/environment';
import { ActivityCalendarService } from '../activity-calendar.service';
import { Program } from '@app/referential/services/model/program.model';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { ProgramProperties } from '@app/referential/services/config/program.config';

export class ActivityCalendarReportStats extends BaseReportStats {
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
}

@Component({
  selector: 'app-activity-calendar-report',
  templateUrl: './activity-calendar.report.html',
  styleUrls: ['./activity-calendar.report.scss', '../../data/report/base-report.scss'],
  providers: [],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarReport extends AppDataEntityReport<ActivityCalendar, number, ActivityCalendarReportStats> {
  public static readonly isBlankFormParam = 'isBlankForm';

  protected logPrefix = 'trip-form-report';
  protected isBlankForm: boolean;

  protected readonly ActivityCalendarService: ActivityCalendarService;

  constructor(injector: Injector) {
    super(injector, ActivityCalendar, ActivityCalendarReportStats);
    this.ActivityCalendarService = this.injector.get(ActivityCalendarService);

    this.isBlankForm = this.route.snapshot.data[ActivityCalendarReport.isBlankFormParam];
    this.debug = !environment.production;
  }

  computePrintHref(data: ActivityCalendar, stats: ActivityCalendarReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/form');
  }

  protected async loadData(id: number, opts?: any): Promise<ActivityCalendar> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ActivityCalendar;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.ActivityCalendarService.load(id, { ...opts });
      data = ActivityCalendar.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
      });
    } else {
      data = await this.ActivityCalendarService.load(id, { ...opts });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: ActivityCalendar, stats: ActivityCalendarReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: 210 * 4,
      height: 297 * 4,
      center: false,
    };
  }

  protected async computeStats(data: ActivityCalendar, opts?: IComputeStatsOpts<ActivityCalendarReportStats>): Promise<ActivityCalendarReportStats> {
    const stats = new ActivityCalendarReportStats();

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);

    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);

    return stats;
  }

  protected async computeTitle(data: ActivityCalendar, stats: ActivityCalendarReportStats): Promise<string> {
    return this.translate.instant('ACTIVITY_CALENDAR.REPORT.TITLE');
  }

  protected computeDefaultBackHref(data: ActivityCalendar, stats: ActivityCalendarReportStats): string {
    return `/activity-calendar/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'activity-calendar/report';
  }
}
