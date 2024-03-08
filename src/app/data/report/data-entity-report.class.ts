import { AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { AccountService, DateFormatService, EntityAsObjectOptions, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { DataEntity } from '../services/model/data-entity.model';
import { AppBaseReport, BaseReportOptions, BaseReportStats } from '@app/data/report/base-report.class';

export type DataEntityReportOptions = BaseReportOptions;

export class DataReportStats extends BaseReportStats {}

@Directive()
export abstract class AppDataEntityReport<
    T extends DataEntity<T, ID>,
    ID = number,
    S extends BaseReportStats = BaseReportStats,
    O extends DataEntityReportOptions = DataEntityReportOptions,
  >
  extends AppBaseReport<T, ID, S>
  implements OnInit, AfterViewInit, OnDestroy
{
  protected logPrefix = '[data-entity-report] ';

  protected readonly accountService: AccountService;
  protected readonly dateFormat: DateFormatService;

  @Input() i18nContextSuffix: string;

  @Input() id: ID;

  protected constructor(
    protected injector: Injector,
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() options?: O
  ) {
    super(injector, dataType, statsType, options);

    this.accountService = injector.get(AccountService);
    this.dateFormat = injector.get(DateFormatService);

    this.revealOptions = {
      autoInitialize: false,
      disableLayout: this.mobile,
      touch: this.mobile,
    };
  }

  async ngOnStart(opts?: any) {
    await super.ngOnStart(opts);

    // If data is not filled by the input or by the clipboad , fill it by loading and computing

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

  dataAsObject(source: T, opts?: EntityAsObjectOptions): any {
    if (typeof source?.asObject === 'function') return source.asObject(opts);
    const data = new this.dataType();
    data.fromObject(source);
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

  // TODO This method sill useful ?
  protected abstract loadData(id: ID, opts?: any): Promise<T>;
}
