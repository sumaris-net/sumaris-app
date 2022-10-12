import { AfterViewInit, ChangeDetectorRef, Directive, Injector, Input, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { RevealComponent, IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { AppErrorWithDetails, DateFormatPipe, firstFalsePromise, isNil, isNotNil, isNotNilOrBlank, isNumber, LocalSettingsService, PlatformService, WaitForOptions } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataEntity } from '../services/model/data-entity.model';
import { ModalController } from '@ionic/angular';

export interface RootDataReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
}

@Directive()
export abstract class AppRootDataReport<T extends DataEntity<T, ID>, ID = number>
  implements OnInit, AfterViewInit, OnDestroy {

  protected readonly route: ActivatedRoute;
  protected readonly cd: ChangeDetectorRef;
  protected readonly dateFormatPipe: DateFormatPipe;
  protected readonly settings: LocalSettingsService;
  protected readonly modalCtrl: ModalController;

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
  // NOTE: Interface for this ?
  i18nContext = {
    prefix: '',
    suffix: '',
  }

  $defaultBackHref = new Subject<string>();
  $title = new Subject<string>();

  @Input() modal: boolean;
  @Input() showError = true;
  @Input() showToolbar = true;
  @Input() id: ID;
  @Input() data: T;
  @Input() stats: any = {};
  @Input() debug = !environment.production;

  @ViewChild('reveal', {read: RevealComponent, static: false}) reveal: RevealComponent;

  get loaded(): boolean { return !this.loadingSubject.value; }

  get modalName(): string {
    return this.constructor.name;
  }

  protected constructor(
    injector: Injector,
    @Optional() options?: RootDataReportOptions,
  ) {
    console.debug(`[${this.constructor.name}.constructor]`, arguments);

    this.cd = injector.get(ChangeDetectorRef);
    this.route = injector.get(ActivatedRoute);
    this.dateFormatPipe = injector.get(DateFormatPipe);
    this.settings = injector.get(LocalSettingsService);
    this.modalCtrl = injector.get(ModalController);

    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.programRefService = injector.get(ProgramRefService);

    this._pathParentIdAttribute = options?.pathParentIdAttribute;
    // NOTE: In route.snapshot data is optional. On which case it may be not set ???
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'id';

    this.revealOptions = this.computeSlidesOptions();
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

  async start() {
    console.debug(`[${this.constructor.name}.start]`);
    await this.platform.ready();
    try {
      // Load data by id
      if (isNotNil(this.id)) {
        await this.load(this.id);
        this.markAsLoaded();
      }
      // Load data by route
      else {
        await this.loadFromRoute();
        this.markAsLoaded();
      }

      // Update the view: initialise reveal
      await this.updateView();

    } catch (err) {
      // NOTE: Test if setError work correctly
      this.setError(err);
    }
  };

  async load(id: ID): Promise<void> {
    console.debug(`[${this.constructor.name}.id]`, arguments);
    const data = await this.loadData(id);

    this.data = data;

    this.$defaultBackHref.next(this.computeDefaultBackHref(data));
    this.$title.next(await this.computeTitle(data));
    this.revealOptions.printHref = this.revealOptions.printHref || this.computePrintHref(data);
  };

  protected abstract loadData(id: ID): Promise<T>;

  // NOTE: an interface for opts ???
  setError(err: string | AppErrorWithDetails, opts?: {
    detailsCssClass?: string;
    emitEvent?: boolean;
  }) {
    console.debug(`[${this.constructor.name}.setError]`, arguments);
    if (!err) {
      this.error = undefined;
    } else if (typeof err === 'string') {
      console.error(`[${this.constructor.name}] Error: ${err}`);
      this.error = err as string;
    } else {
      console.error(`[${this.constructor.name}] Error: ${err.message}`, err);
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

  cancel() {
    if (this.modal) {
      this.modalCtrl.dismiss();
    }
  }

  markAsReady() {
    console.debug(`[${this.constructor.name}.markAsReady]`, arguments);
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeTitle(data: T): Promise<string>;

  // NOTE : Can have parent. Can take param from interface ?
  protected abstract computeDefaultBackHref(data: T): string;

  protected abstract computePrintHref(data: T): string;

  protected computeSlidesOptions(): Partial<IRevealExtendedOptions> {
    console.debug(`[${this.constructor.name}.computeSlidesOptions]`);
    const mobile = this.settings.mobile;
    return {
      // Custom reveal options
      autoInitialize: false,
      autoPrint: false,
      // Reveal options
      pdfMaxPagesPerSlide: 1,
      disableLayout: mobile,
      touch: mobile
    };
  }

  protected async loadFromRoute(): Promise<void> {
    console.debug(`[${this.constructor.name}.loadFromRoute]`);
    const id = this.getIdFromPathIdAttribute(this._pathIdAttribute);
    await this.load(id);
    this.markAsLoaded();
  }

  async updateView() {
    console.debug(`[${this.constructor.name}.updateView]`);
    this.cd.detectChanges();
    await this.reveal.initialize();
  }

  protected markForCheck() {
    console.debug(`[${this.constructor.name}.markForCheck]`);
    this.cd.markForCheck();
  }

  protected markAsLoaded() {
    console.debug(`[${this.constructor.name}.markAsLoaded]`);
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }

  protected async waitIdle(opts: WaitForOptions) {
    console.debug(`[${this.constructor.name}.waitIdle]`);
    if (this.loaded) return;
    await firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  protected getIdFromPathIdAttribute(pathIdAttribute: string): ID {
    console.debug(`[${this.constructor.name}.getIdFromPathIdAttribute]`, arguments);
    const route = this.route.snapshot;
    const id = route.params[pathIdAttribute] as ID;
    if (isNil(id)) {
      throw new Error(`[getIdFromPathIdAttribute] id for param ${pathIdAttribute} is nil`);
    }
    if (typeof id === 'string' && isNumber(id)) {
      return (+id) as any as ID;
    }
    return id;
  }

}
