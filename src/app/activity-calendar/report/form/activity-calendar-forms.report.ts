import { Component, Injector, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { AppBaseReport, BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { EntityAsObjectOptions, WaitForOptions, isNil, isNotEmptyArray, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { ActivityCalendarFormReport, ActivityCalendarFormReportStats } from './activity-calendar-form.report';
import { ActivityCalendarService } from '@app/activity-calendar/activity-calendar.service';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';

class ActivityCalendarFormsReportStats extends BaseReportStats {
  activityCalendarFormReportStats: ActivityCalendarFormReportStats[];

  static fromObject: (source: any) => ActivityCalendarFormsReportStats;

  fromObject(source: any): void {
    super.fromObject(source);
    this.activityCalendarFormReportStats = source.map((stats) => ActivityCalendarFormReportStats.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      activityCalendarFormReportStats: this.activityCalendarFormReportStats.map((stats) => stats.asObject(opts)),
    };
  }
}

@Component({
  selector: 'app-activity-calendar-forms-report',
  templateUrl: './activity-calendar-forms.report.html',
})
export class ActivityCalendarFormsReport extends AppBaseReport<ActivityCalendar[], number[], ActivityCalendarFormsReportStats> {
  protected logPrefix = '[activity-calendar-forms-report] ';
  protected ids: number[];

  @ViewChild(RevealComponent) reveal!: RevealComponent;
  @ViewChildren(ActivityCalendarFormReport) children!: QueryList<ActivityCalendarFormReport>;

  constructor(
    injector: Injector,
    protected activityCalendarService: ActivityCalendarService
  ) {
    super(injector, Array, ActivityCalendarFormsReportStats);
  }

  async ngOnStart(opts?: any) {
    await super.ngOnStart(opts);

    if (isNil(this.data)) if (isNil(this.uuid)) if (isNil(this.ids)) this.loadFromRoute(opts);
    if (isNil(this.stats)) this.stats = await this.computeStats(this.data, opts);
  }

  protected loadFromRoute(opts?: any): Promise<ActivityCalendar[]> {
    const idsStr = this.route.snapshot.queryParamMap.get('ids');
    this.ids = null;

    if (isNotNilOrBlank(idsStr)) {
      const ids = idsStr
        .split(',')
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (isNotEmptyArray(ids)) {
        this.ids = ids;
      }
    }

    if (this.ids === null) {
      // TODO : error
      //        Do this in ngOnStart ?
    }

    return null;
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

  dataArrayFromObject(source: any): ActivityCalendar[] {
    return source.map((s) => {
      const data = new ActivityCalendarFormReport(this.injector);
      data.dataFromObject(s);
      return data;
    });
  }

  dataAsObject(source: ActivityCalendar[], opts?: EntityAsObjectOptions) {
    return null;
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

  protected async computeStats(
    data: ActivityCalendar[],
    opts?: IComputeStatsOpts<ActivityCalendarFormsReportStats>
  ): Promise<ActivityCalendarFormsReportStats> {
    // TODO
    const stats = new ActivityCalendarFormsReportStats();
    return stats;
  }
  protected computeDefaultBackHref(data: ActivityCalendar[], stats: ActivityCalendarFormsReportStats): string {
    return '/activity-calendar';
  }
  protected computeShareBasePath(): string {
    return 'activity-calendar/report/forms';
  }
}
