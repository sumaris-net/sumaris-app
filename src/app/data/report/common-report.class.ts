import { AfterViewInit, ChangeDetectorRef, Directive, Injector, Input, OnDestroy, Optional, ViewChild, inject } from '@angular/core';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { EntityAsObjectOptions, PlatformService, WaitForOptions, firstFalsePromise, isNil, isNotNil, waitForTrue } from '@sumaris-net/ngx-components';
import { instanceOf } from 'graphql/jsutils/instanceOf';
import { BehaviorSubject, Subject } from 'rxjs';
import { IComputeStatsOpts, IReportData, IReportI18nContext } from './base-report.class';

export class CommonReportOptions {}

export abstract class CommonReportStats {
  abstract fromObject(source: any);
  abstract asObject: (opts?: EntityAsObjectOptions) => any;
}

@Directive()
export abstract class CommonReport<
    T extends IReportData | IReportData[],
    S extends CommonReportStats,
    O extends CommonReportOptions = CommonReportOptions,
  >
  implements AfterViewInit, OnDestroy
{
  private _embedded: boolean;

  protected logPrefix = '[common-report] ';
  protected _autoLoad = true;
  protected _autoLoadDelay = 0;

  protected readonly injector: Injector;
  protected readonly platform = inject(PlatformService);
  protected readonly cd = inject(ChangeDetectorRef);
  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly destroySubject = new Subject<void>();
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);

  protected _stats: S = null;

  revealOptions: Partial<IRevealExtendedOptions>;
  i18nContext: IReportI18nContext = null;

  @Input() set embedded(value: boolean) {
    this._embedded = value;
  }
  get embedded(): boolean {
    return isNotNil(this._embedded) ? this._embedded : this.reveal?.embedded || false;
  }

  get loaded(): boolean {
    return !this.loadingSubject.value;
  }
  get loading(): boolean {
    return this.loadingSubject.value;
  }

  @Input() debug = !environment.production;
  @Input() data: T;
  @Input() set stats(value) {
    if (isNil(value)) return;
    if (instanceOf(value, this.statsType)) this._stats = value;
    else this._stats = this.statsFromObject(value);
  }
  get stats(): S {
    return this._stats;
  }
  @Input() i18nContextSuffix: string;

  @ViewChild(RevealComponent, { static: false }) protected reveal: RevealComponent;

  protected constructor(
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() protected options?: O
  ) {
    this.injector = inject(Injector);
  }

  ngAfterViewInit() {
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    this.destroySubject.next();
  }

  abstract start(opts?: any): Promise<void>;

  markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  protected markAsLoading(opts = { emitEvent: true }) {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  async waitIdle(opts: WaitForOptions) {
    console.debug(`[${this.constructor.name}]`);
    if (this.loaded) return;
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    if (this.readySubject.value) return;
    await waitForTrue(this.readySubject, opts);
  }

  updateView() {
    this.cd.detectChanges();
  }

  statsAsObject(opts?: EntityAsObjectOptions): any {
    if (!this.loaded) {
      throw `${this.logPrefix} Stats are not already computed`;
    }
    return this.stats.asObject(opts);
  }

  statsFromObject(source: any): S {
    const stats = new this.statsType();
    stats.fromObject(source);
    return stats;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected abstract computeStats(data: T, opts?: IComputeStatsOpts<S>): Promise<S>;
}
