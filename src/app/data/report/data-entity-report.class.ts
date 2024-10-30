import { AfterViewInit, Directive, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { AppBaseReport, BaseReportOptions, BaseReportStats } from '@app/data/report/base-report.class';
import { Entity, EntityAsObjectOptions, isNil, isNotNil } from '@sumaris-net/ngx-components';

export type DataEntityReportOptions = BaseReportOptions;

export class DataReportStats extends BaseReportStats {}

@Directive()
export abstract class AppDataEntityReport<
    T extends Entity<T, ID>,
    ID = number,
    S extends BaseReportStats = BaseReportStats,
    O extends DataEntityReportOptions = DataEntityReportOptions,
  >
  extends AppBaseReport<T, S>
  implements OnInit, AfterViewInit, OnDestroy
{
  protected logPrefix = '[data-entity-report] ';

  @Input() id: ID;

  protected constructor(
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() options?: O
  ) {
    super(dataType, statsType, options);

    this.revealOptions = {
      autoInitialize: false,
      disableLayout: this.mobile,
      touch: this.mobile,
    };
  }

  async ngOnStart(opts?: any) {
    await super.ngOnStart(opts);

    // If data is not filled by the input or by the clipboard , fill it by loading and computing

    if (isNil(this.data))
      if (isNil(this.uuid))
        if (isNotNil(this.id)) this.data = await this.load(this.id, opts);
        else this.data = await this.loadFromRoute(opts);

    if (isNil(this.stats)) this.stats = await this.computeStats(this.data, opts);

    const computedContext = this.computeI18nContext(this.stats);
    this.i18nContext = {
      ...computedContext,
      ...this.i18nContext,
      pmfmPrefix: computedContext?.pmfmPrefix,
    };
  }

  dataAsObject(opts?: EntityAsObjectOptions): any {
    if (!this.loaded) {
      throw `${this.logPrefix} Data are not already loaded`;
    }
    if (typeof this.data?.asObject === 'function') return this.data.asObject(opts);
    const data = new this.dataType();
    data.fromObject(this.data);
    return data.asObject(opts);
  }

  protected async loadFromRoute(opts?: any): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}] load data from route`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    if (isNil(this.id)) throw new Error(`Cannot load the entity: No id found in the route!`);
    return this.load(this.id, opts);
  }

  protected async load(id: ID, opts?: any): Promise<T> {
    if (this.debug) console.debug(`[${this.logPrefix}.load]`, id, opts);
    return this.loadData(id, opts);
  }

  protected abstract loadData(id: ID, opts?: any): Promise<T>;
}
