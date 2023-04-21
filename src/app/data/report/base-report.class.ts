import { AfterViewInit, ChangeDetectorRef, Directive, Injector, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IRevealExtendedOptions, RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { TranslateService } from '@ngx-translate/core';
import {
  AppErrorWithDetails,
  DateFormatService,
  firstFalsePromise,
  isNotNil,
  isNotNilOrBlank, isNumber,
  LatLongPattern,
  LocalSettingsService,
  PlatformService,
  WaitForOptions, waitForTrue
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { ModalController } from '@ionic/angular';

export interface BaseReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
}

export interface IReportStats {
  i18nSuffix: string;
}

@Directive()
export abstract class AppBaseReport<
  T = any,
  ID = number,
  S extends IReportStats = IReportStats>
  implements OnInit, AfterViewInit, OnDestroy {

  protected logPrefix = 'base-report';

  protected readonly route: ActivatedRoute;
  protected readonly cd: ChangeDetectorRef;
  protected readonly dateFormat: DateFormatService;
  protected readonly settings: LocalSettingsService;
  protected readonly modalCtrl: ModalController;

  protected readonly injector: Injector;
  protected readonly platform: PlatformService;
  protected readonly translate: TranslateService;
  protected readonly programRefService: ProgramRefService;

  protected readonly destroySubject = new Subject();
  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);

  protected _autoLoad = true;
  protected _autoLoadDelay = 0;
  protected _pathIdAttribute: string;
  protected _pathParentIdAttribute: string;

  error: string;
  revealOptions: Partial<IRevealExtendedOptions>;

  $defaultBackHref = new BehaviorSubject<string>('');
  $title = new BehaviorSubject<string>('');

  @Input() mobile: boolean;
  @Input() modal: boolean;
  @Input() showError = true;
  @Input() showToolbar = true;
  @Input() debug = !environment.production;

  @Input() data: T;
  @Input() stats: S;
  @Input() i18nContext: {prefix:string, suffix:string} = {
    prefix: '',
    suffix: '',
  };
  @Input() embedded = false;

  @ViewChild('reveal', {read: RevealComponent, static: false}) protected reveal: RevealComponent;

  get loaded(): boolean { return !this.loadingSubject.value; }
  get loading(): boolean { return this.loadingSubject.value; }

  get modalName(): string {
    return this.constructor.name;
  }

  get latLongFormat(): LatLongPattern{
    return this.settings?.latLongFormat;
  }

  protected constructor(
    injector: Injector,
    @Optional() options?: BaseReportOptions,
  ) {
    if (!environment.production) {
      this.debug = true;
    }

    this.injector = injector;

    this.cd = injector.get(ChangeDetectorRef);
    this.route = injector.get(ActivatedRoute);
    this.dateFormat = injector.get(DateFormatService);
    this.settings = injector.get(LocalSettingsService);
    this.modalCtrl = injector.get(ModalController);

    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.programRefService = injector.get(ProgramRefService);

    this.mobile = this.settings.mobile;

    this._pathParentIdAttribute = options?.pathParentIdAttribute;
    // NOTE: In route.snapshot data is optional. On which case it may be not set ???
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'id';
  }

  async ngOnInit() {
    this.modal = isNotNil(this.modal) ? this.modal : !!(await this.modalCtrl.getTop());
  }

  ngAfterViewInit() {
    console.debug(`[${this.constructor.name}.ngAfterViewInit]`);
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    console.debug(`[${this.constructor.name}.ngOnDestroy]`);
    this.destroySubject.next();
  }

  async start(opts?: any) {
    console.debug(`[${this.constructor.name}.start]`);
    await this.platform.ready();
    this.markAsReady();
    try {
      // Load data
      this.data = await this.ngOnStart(opts);

      this.$defaultBackHref.next(this.computeDefaultBackHref(this.data, this.stats));
      this.$title.next(await this.computeTitle(this.data, this.stats));
      this.revealOptions = this.computeSlidesOptions();

      this.markAsLoaded();

      // Update the view: initialise reveal
      await this.updateView();

    } catch (err) {
      console.error(err);
      this.setError(err);
      this.markAsLoaded();
    }
  };

  async reload(opts?: any) {
    if (!this.loaded) return; // skip

    console.debug(`[${this.constructor.name}.reload]`);
    this.markAsLoading();
    return this.start(opts);
  }

  cancel() {
    if (this.modal) {
      this.modalCtrl.dismiss();
    }
  }

  protected abstract ngOnStart(opts: any): Promise<T>;

  protected abstract loadFromRoute(opts?: any): Promise<T>;

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeTitle(data: T, stats: S): Promise<string>;

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeDefaultBackHref(data: T, stats: S): string;

  protected abstract computePrintHref(data: T, stats: S): string;

  protected getIdFromPathIdAttribute<ID>(pathIdAttribute: string): ID {
    const route = this.route.snapshot;
    const id = route.params[pathIdAttribute] as ID;
    if (isNotNil(id)) {
      if (typeof id === 'string' && isNumber(id)) {
        return (+id) as any as ID;
      }
      return id;
    }
    return undefined;
  }

  protected computeSlidesOptions(): Partial<IRevealExtendedOptions> {
    if (this.debug) console.debug(`[${this.logPrefix}.computeSlidesOptions]`);
    const mobile = this.settings.mobile;
    return {
      // Custom reveal options
      autoInitialize: false,
      autoPrint: false,
      // Reveal options
      pdfMaxPagesPerSlide: 1,
      disableLayout: mobile,
      touch: mobile,
      printHref: this.computePrintHref(this.data, this.stats)
    };
  }

  async updateView() {
    if (this.debug) console.debug(`[${this.logPrefix}.updateView]`);

    this.cd.detectChanges();
    if (!this.embedded) await this.reveal.initialize();
  }

  markAsReady() {
    if (this.debug) console.debug(`[${this.logPrefix}.markAsReady]`, arguments);
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  protected markForCheck() {
    if (this.debug) console.debug(`[${this.logPrefix}.markForCheck]`);
    this.cd.markForCheck();
  }

  protected markAsLoading() {
    if (this.debug) console.debug(`[${this.logPrefix}.markAsLoading]`);
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
    }
  }

  protected markAsLoaded(opts = {emitEvent: true}) {
    if (this.debug) console.debug(`[${this.logPrefix}.markAsLoaded]`);
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  async waitIdle(opts: WaitForOptions) {
    if (this.debug) console.debug(`[${this.logPrefix}.waitIdle]`);
    if (this.loaded) return;
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    if (this.debug) console.debug(`[${this.logPrefix}.ready]`);
    if (this.readySubject.value) return;
    await waitForTrue(this.readySubject, opts);
  }

  setError(err: string | AppErrorWithDetails, opts?: {
    detailsCssClass?: string;
    emitEvent?: boolean;
  }) {
    if (!err) {
      this.error = undefined;
    } else if (typeof err === 'string') {
      this.error = err as string;
    } else {
      // NOTE: Case when `|| err` is possible ?
      let userMessage: string = err.message && this.translate.instant(err.message) || err;
      // NOTE: replace || by && ???
      const detailMessage: string = (!err.details || typeof (err.message) === 'string')
        ? err.details as string
        : err.details.message;
      // NOTE: !isNotNilOrBlank ??? (invert the test)
      if (isNotNilOrBlank(detailMessage)) {
        const cssClass = opts?.detailsCssClass || 'hidden-xs hidden-sm';
        userMessage += `<br/><small class="${cssClass}" title="${detailMessage}">`;
        userMessage += detailMessage.length < 70
          ? detailMessage
          : detailMessage.substring(0, 67) + '...';
        userMessage += '</small>';
      }
      this.error = userMessage;
      if (!opts || opts.emitEvent !== false) this.markForCheck();
    }
  }

}
