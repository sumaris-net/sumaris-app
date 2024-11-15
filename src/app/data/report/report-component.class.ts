import { Directive, Input } from '@angular/core';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { IReportData, IReportI18nContext } from './base-report.class';
import { CommonReport, CommonReportOptions, CommonReportStats } from './common-report.class';
import { isNil } from '@sumaris-net/ngx-components';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { Moment } from 'moment';

@Directive()
export abstract class ReportComponent<
  T extends IReportData | IReportData[],
  S extends CommonReportStats,
  O extends CommonReportOptions = CommonReportOptions,
> extends CommonReport<T, S, O> {
  protected logPrefix = '[report-component] ';
  @Input({ required: true }) revealOptions: Partial<IRevealExtendedOptions>;
  @Input({ required: true }) data: T;
  @Input({ required: true }) i18nContext: IReportI18nContext;
  @Input({ required: true }) program: Program;
  @Input({ required: true }) strategy: Strategy;
  @Input({ required: true }) isBlankForm: boolean;
  @Input({ required: true }) logoHeadLeftUrl: string;
  @Input({ required: true }) logoHeadRightUrl: string;
  @Input() footerText: string;
  @Input() footerHelp: string;
  @Input() departureDateTime: Moment;
  @Input() vesselName: string;

  async start(opts?: any) {
    await this.platform.ready();

    this.markAsReady();

    try {
      // Load or fill this.data, this.stats and this.i18nContext
      await this.ngOnStart(opts);
      this.markAsLoaded();
      // Update the view: initialize reveal
      this.updateView();
    } catch (err) {
      // TODO Push error to parent
      console.error(err);
      // this.setError(err);
      this.markAsLoaded();
    }
  }
  async ngOnStart(opts?: any): Promise<void> {
    if (isNil(this.stats)) this.stats = await this.computeStats(this.data, opts);
  }
}
