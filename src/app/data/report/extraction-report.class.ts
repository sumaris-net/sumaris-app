import { AfterViewInit, Directive, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { AppBaseReport, BaseReportOptions, BaseReportStats, IReportData } from '@app/data/report/base-report.class';
import { ExtractionFilter, ExtractionType } from '@app/extraction/type/extraction-type.model';
import { isNil, isNotNil } from '@sumaris-net/ngx-components';

export class ExtractionReportStats extends BaseReportStats {}

@Directive()
export abstract class AppExtractionReport<
    T extends IReportData,
    S extends BaseReportStats = BaseReportStats,
    O extends BaseReportOptions = BaseReportOptions,
  >
  extends AppBaseReport<T, S>
  implements OnInit, AfterViewInit, OnDestroy
{
  protected logPrefix = 'extraction-report';

  @Input() filter: ExtractionFilter;
  @Input() type: ExtractionType;

  protected constructor(
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() protected options?: O
  ) {
    super(dataType, statsType);
  }

  async ngOnStart(opts?: any) {
    await super.ngOnStart(opts);

    // If data is not filled by the input or by the clipboard , fill it by loading and computing

    if (isNil(this.data))
      if (isNil(this.uuid))
        if (isNotNil(this.filter)) this.data = await this.load(this.filter, opts);
        else this.data = await this.loadFromRoute(opts);

    if (isNil(this.stats)) this.stats = await this.computeStats(this.data, opts);

    const computedContext = this.computeI18nContext(this.stats);
    this.i18nContext = {
      ...computedContext,
      ...this.i18nContext,
      pmfmPrefix: computedContext?.pmfmPrefix,
    };
  }

  protected abstract load(filter: ExtractionFilter, opts?: any): Promise<T>;

  protected abstract loadFromRoute(opts?: any): Promise<T>;
}
