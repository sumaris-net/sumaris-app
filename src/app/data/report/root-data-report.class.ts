import { AfterViewInit, ChangeDetectorRef, Directive, Injector, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppErrorWithDetails, isNil, isNotNilOrBlank, PlatformService } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { RootDataEntity } from '../services/model/root-data-entity.model';

@Directive()
export abstract class AppRootDataReport<
  T extends RootDataEntity<T, ID>,
  ID = number> implements AfterViewInit, OnDestroy {

  protected readonly route: ActivatedRoute;
  protected readonly cd: ChangeDetectorRef;

  protected readonly platform: PlatformService;
  protected readonly translate: TranslateService;

  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);

  protected _autoLoad = true;
  protected _autoLoadDelay = 0;
  protected _pathIdAttribute: string;

  error: string;
  $defaultBackHref = new Subject<string>();

  @Input() embedded = false;

  constructor(injector: Injector) {

    //this.dataType = dataType;
    this.cd = injector.get(ChangeDetectorRef);
    this.route = injector.get(ActivatedRoute);


    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);

    // NOTE: pathIdParam is optional. On which case it may be not set ???
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam;

  }

  ngAfterViewInit() {
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
  }

  async start() {
    await this.platform.ready();
    this.markAsReady();
    try {
      await this.loadFromRoute();
    } catch (err) {
      // NOTE: Test if setError work correctly
      this.setError(err);
    } finally {
      this.markAsLoaded();
    }
  };

  async load(id: number) {
    const data = await this.loadData(id);

    this.$defaultBackHref.next(this.computeDefaultBackHref(data));

    this.markAsReady();
    this.markAsLoaded();
  };

  protected abstract loadData(id: number): Promise<T>;

  // NOTE: an interface for opts ???
  setError(err: string | AppErrorWithDetails, opts?: {
    detailsCssClass?: string;
    emitEvent?: boolean;
  }) {
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

  markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  // NOTE : Can have parrent. Can take param from interface ?
  protected async computeTitle(): Promise<string> {
    return 'dummy';
  }

  // NOTE : Can have parrent. Can take param from interface ?
  protected abstract computeDefaultBackHref(data: T): string;

  protected async loadFromRoute(): Promise<void> {
    const route = this.route.snapshot;
    const id: number = route.params[this._pathIdAttribute];
    if (isNil(id)) {
      throw new Error(`[loadFromRoute] id for param ${this._pathIdAttribute} is nil`);
    }

    await this.load(id);

    return;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoaded() {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }

}
