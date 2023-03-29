import { AfterViewInit, Directive, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { AppBaseReport } from '@app/data/report/base-report.class';

export interface ExtractionData {
  [sheetName: string]: any[];
}

@Directive()
export abstract class AppExtractionReport<
  T = any,
  S = any>
  extends AppBaseReport<T, S>
  implements OnInit, AfterViewInit, OnDestroy {

  @Input() filter: ExtractionFilter;

  protected constructor(
    injector: Injector
  ) {
    super(injector);
  }

  ngOnStart(opts?: any): Promise<T> {
    if (this.filter) {
      return this.load(this.filter, opts);
    }

    // Try to load from route
    return this.loadFromRoute(opts);
  }

  protected abstract load(filter: ExtractionFilter, opts?: any): Promise<T>;

  protected abstract loadFromRoute(opts?: any): Promise<T>;

}
