import { AfterViewInit, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppErrorWithDetails, EntityServiceLoadOptions, isNil, isNilOrBlank, isNotNilOrBlank, PlatformService } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { LandingService } from '../services/landing.service';
import { ObservedLocation } from '../services/model/observed-location.model';
import { ObservedLocationService } from '../services/observed-location.service';

@Component({
  selector: 'app-observed-location',
  templateUrl: './observed-location.report.html',
  styleUrls: ['./observed-location.report.scss']
})
export class ObservedLocationReport implements AfterViewInit {

  private readonly route: ActivatedRoute;
  private readonly platform: PlatformService;
  private readonly cd: ChangeDetectorRef;
  private readonly translate: TranslateService;
  private readonly observedLocationService: ObservedLocationService;

  protected readonly _readySubject = new BehaviorSubject<boolean>(false);
  protected readonly _loadingSubject = new BehaviorSubject<boolean>(true);

  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;

  defaultBackHref: string = null;
  error: string;

  $title = new Subject();

  @Input() showToolbar = true;

  constructor(
    injector: Injector,
  ) {
    this.route = injector.get(ActivatedRoute);
    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.cd = injector.get(ChangeDetectorRef);

    this.observedLocationService = injector.get(ObservedLocationService);

    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam;

    if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\'.');
    }
  }

  ngAfterViewInit() {
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  setError(err: string | AppErrorWithDetails, opts?: {
    emitEvent?: boolean;
    detailsCssClass?: string;
  }) {
    if (!err) {
      this.error = undefined;
    } else if (typeof err === 'string') {
      console.error(`[${this.constructor.name}] Error: ${err}`);
      this.error = err as string;
    } else {
      console.log(`[${this.constructor.name}] Error: ${err.message}`, err);
      let userMessage: string = err.message && this.translate.instant(err.message) || err;
      const detailMessage: string = (!err.details || typeof (err.details === 'string'))
        ? err.details as string
        : err.details.message;
      if (isNotNilOrBlank(detailMessage)) {
        const cssClass = opts?.detailsCssClass || 'hidden-xs hidden-sm';
        userMessage += `<br/><small class="${cssClass}" title="${detailMessage}">`;
        userMessage += detailMessage.length < 70
          ? detailMessage
          : detailMessage.substring(0, 67) + '...';
        userMessage += '</small>';
      }
      this.error = userMessage;
    }
    if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  async start() {
    await this.platform.ready();
    this.markAsReady();
    try {
      await this.loadFromRoute();
    } catch (err) {
      this.setError(err);
    } finally {
      this.markAsLoaded();
    }
  }

  async load(id: number) {
    const data = await this.observedLocationService.load(id, {withLanding: true});
    if (!data) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    await this.computeTitle();
    this.computeDefaultBackHref(data);

    this.markAsLoaded();
    this.cd.detectChanges();
  }

  protected loadFromRoute(): Promise<void> {
    const route = this.route.snapshot;
    let id: number = route.params[this._pathIdAttribute];
    if (isNil(id)) {
      throw new Error(`[loadFromRoute] id for param ${this._pathIdAttribute} is nil`);
    }
    return this.load(id);
  }

  protected markAsReady() {
    this._readySubject.next(true);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoaded(opts = {emitEvent: true}) {
    if(!this._loadingSubject.value) {
      this._loadingSubject.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected async computeTitle() {
    const title = await this.translate.get('OBSERVED_LOCATION.REPORT.TITLE').toPromise();
    this.$title.next(title)
  }

  protected computeDefaultBackHref(data: ObservedLocation) {
    this.defaultBackHref = `/observations/${data.id}?tab=1`;
  }

}
