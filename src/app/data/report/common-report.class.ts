import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  ViewChild,
} from '@angular/core';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { EntityAsObjectOptions, firstTruePromise, isNil, isNotNil, PlatformService, WaitForOptions, waitForTrue } from '@sumaris-net/ngx-components';
import { instanceOf } from 'graphql/jsutils/instanceOf';
import { BehaviorSubject, Subject } from 'rxjs';
import { IComputeStatsOpts, IReportData, IReportI18nContext } from './base-report.class';

export class CommonReportOptions {}

export interface FormReportPageDimensions {
  pageWidth: number;
  pageHeight: number;
  pageHorizontalMargin: number;
  availableWidthForTableLandscape: number;
  availableWidthForTablePortrait: number;
}

export abstract class CommonReportStats {
  abstract fromObject(source: any): void;
  abstract asObject(opts?: EntityAsObjectOptions): any;
}

@Directive()
export abstract class CommonReport<
    T extends IReportData | IReportData[],
    S extends CommonReportStats,
    O extends CommonReportOptions = CommonReportOptions,
  >
  implements OnInit, AfterViewInit, OnDestroy
{
  public static readonly isBlankFormParam = 'isBlankForm';

  private _embedded: boolean;

  protected logPrefix = '[common-report] ';
  protected _autoLoad = true;
  protected _autoLoadDelay = 0;

  protected isBlankForm: boolean;

  protected readonly injector: Injector;
  protected readonly platform = inject(PlatformService);
  protected readonly cd = inject(ChangeDetectorRef);
  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly destroySubject = new Subject<void>();
  protected loadingSubject = new BehaviorSubject<boolean>(true);
  protected readyToInitialize = new BehaviorSubject<boolean>(false);

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
  @Input() stats: S;

  @Input({ required: true }) data: T;

  @Input() i18nContextSuffix: string;

  @Output() readyEvent = new EventEmitter();
  @Output() loadedEvent = new EventEmitter();
  @Output() readyToInitializeEvent = new EventEmitter();

  @ViewChild(RevealComponent, { static: false }) protected reveal: RevealComponent;

  protected constructor(
    protected dataType: new () => T,
    protected statsType: new () => S,
    @Optional() protected options?: O
  ) {
    this.injector = inject(Injector);
  }

  ngOnInit() {}

  ngAfterViewInit() {
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    this.destroySubject.next();
  }

  abstract start(opts?: any): Promise<void>;

  markAsReady(opts = { emitEvent: true }) {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
      if (opts?.emitEvent) {
        this.readyEvent.emit();
      }
    }
  }

  async initializeReveal() {
    await this.reveal.initialize();
  }

  async waitIdle(opts: WaitForOptions) {
    if (this.readyToInitialize.value) return;
    await firstTruePromise(this.readyToInitialize, { stop: this.destroySubject, ...opts });
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

  protected markAsLoading(opts = { emitEvent: true }) {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) {
        this.markForCheck();
        this.loadedEvent.emit();
      }
    }
  }

  protected markAsReadyToInitialize(opts = { emitEvent: true }) {
    if (!this.readyToInitialize.value) {
      this.readyToInitialize.next(true);
      if (opts.emitEvent !== false) {
        this.markForCheck();
        this.readyToInitializeEvent.emit();
      }
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected abstract computeStats(data: T, opts?: IComputeStatsOpts<S>): Promise<S>;
}
