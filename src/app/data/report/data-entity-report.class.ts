import { AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { isNil, isNotNil, isNumber } from '@sumaris-net/ngx-components';
import { DataEntity } from '../services/model/data-entity.model';
import { AppBaseReport, BaseReportOptions } from '@app/data/report/base-report.class';

export interface DataEntityReportOptions extends BaseReportOptions{
}

@Directive()
export abstract class AppDataEntityReport<
  T extends DataEntity<T, ID>,
  ID = number,
  S = any>
  extends AppBaseReport<T, S>
  implements OnInit, AfterViewInit, OnDestroy {


  @Input() id: ID;

  protected constructor(
    injector: Injector,
    @Optional() options?: DataEntityReportOptions,
  ) {
    super(injector, options);
  }

  async ngOnStart(opts?: any): Promise<T> {

    // Load data by id
    if (isNotNil(this.id)) {
      return this.load(this.id, opts);
    }

    // Load data by route
    return this.loadFromRoute();
  };

  protected abstract load(id: ID, opts?: any): Promise<T>;

  protected async loadFromRoute(opts?: any): Promise<T> {
    console.debug(`[${this.constructor.name}.loadFromRoute]`);
    this.id = this.getIdFromPathIdAttribute(this._pathIdAttribute);

    if (isNil(this.id)) throw new Error(`[loadFromRoute] Cannot load the entity: No id found in the route!`);

    return this.load(this.id, opts);
  }


}
