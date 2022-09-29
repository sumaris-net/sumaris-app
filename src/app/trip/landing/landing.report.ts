import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, Optional, ViewChild } from '@angular/core';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';
import { LandingService } from '@app/trip/services/landing.service';
import { ActivatedRoute } from '@angular/router';
import {
  AppErrorWithDetails,
  DateFormatPipe,
  EntityServiceLoadOptions,
  firstFalsePromise,
  FirstOptions,
  isInt,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  LocalSettingsService,
  PlatformService,
  WaitForOptions,
  waitForTrue
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { Landing } from '@app/trip/services/model/landing.model';
import { TranslateService } from '@ngx-translate/core';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, PmfmIds, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ObservedLocationService } from '../services/observed-location.service';

export class LandingReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
}

@Component({
  selector: 'app-landing-report',
  styleUrls: ['./landing.report.scss'],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// tslint:disable-next-line:directive-class-suffix
export class LandingReport<T extends Landing = Landing> implements AfterViewInit, OnDestroy {

  private readonly route: ActivatedRoute;
  private readonly platform: PlatformService;
  private readonly cd: ChangeDetectorRef;
  private readonly _pathParentIdAttribute: string;
  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;
  protected readonly translate: TranslateService;
  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly dateFormatPipe: DateFormatPipe;
  protected readonly programRefService: ProgramRefService;
  protected readonly settings: LocalSettingsService;
  protected readonly destroySubject = new Subject();

  readonly readySubject = new BehaviorSubject<boolean>(false);
  readonly loadingSubject = new BehaviorSubject<boolean>(true);

  defaultBackHref: string = null;
  $title = new Subject();
  error: string;
  slidesOptions: Partial<IRevealOptions>;
  weightDisplayedUnit: WeightUnitSymbol;
  i18nPmfmPrefix: string;

  @Input() parent: ObservedLocation;
  @Input() embedded = false;
  @Input() data: T;
  @Input() pmfms: IPmfm[];
  @Input() stats: any = {};
  @Input() i18nContext = {
    prefix: '',
    suffix: ''
  }

  @Input() showToolbar = true;
  @Input() showError = true;
  @Input() debug = !environment.production;

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;

  get loading(): boolean {
    return this.loadingSubject.value;
  }
  get loaded(): boolean {
    return !this.loadingSubject.value;
  }

  constructor(
    injector: Injector,
    @Optional() options?: LandingReportOptions
  ) {
    this.route = injector.get(ActivatedRoute);
    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);
    this.dateFormatPipe = injector.get(DateFormatPipe);
    this.programRefService = injector.get(ProgramRefService);
    this.settings = injector.get(LocalSettingsService);
    this.cd = injector.get(ChangeDetectorRef);

    this._pathParentIdAttribute = options?.pathParentIdAttribute || 'observedLocationId';
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'landingId';
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
    const mobile = this.settings.mobile;
    this.slidesOptions = {
      autoInitialize: false,
      disableLayout: mobile,
      touch: mobile
    }
    if (!this.route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
    }
    if (!environment.production) {
      this.debug = true;
    }
  }

  ngAfterViewInit() {
    // Load data
    //if (this._autoLoad && !this.embedded) { // If !this.embeded start is never called
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  ngOnDestroy() {
    this.destroySubject.next();
  }

  async start() {
    await this.platform.ready();

    try {
      if (this.embedded) {
        await this.loadFromInput();
      } else {
        this.markAsReady();
        await this.loadFromRoute();
      }
    }
    catch (err) {
      this.setError(err);
    }
    finally {
      this.markAsLoaded();
    }
  }


  async load(id?: number, opts?: EntityServiceLoadOptions & { [key: string]: string }) {

    let parentId = opts && opts[this._pathParentIdAttribute] || undefined;

    //await sleep(2000);

    let [data, parent] = await Promise.all([
      this.landingService.load(id),
      isNotNil(parentId) ? this.observedLocationService.load(parentId) : Promise.resolve(null)
    ]);

    // Make sure to load the parent
    if (!parent || (data && parent.id !== data.observedLocationId)) {
      parent = await this.observedLocationService.load(data.observedLocationId);
    }

    if (!data || !parent) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    const program = await this.programRefService.loadByLabel(parent.program.label);
    this.weightDisplayedUnit = program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;
    let i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    this.i18nContext.suffix = i18nSuffix === 'legacy' ? '' : i18nSuffix;

    // Compute agg data
    const taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup;

    let pmfms = await this.programRefService.loadProgramPmfms(parent.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: taxonGroup?.id
    });

    // Apply weight conversion, if need
    if (this.weightDisplayedUnit) {
      pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit);
    }
    this.pmfms = pmfms;
    this.parent = parent;

    this.data = await this.onDataLoaded(data as T, this.pmfms);

    const title = await this.computeTitle(this.data, this.parent);
    this.$title.next(title);

    this.markAsLoaded();
    this.cd.detectChanges();

    await this.slides.initialize();
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    if (this.readySubject.value) return;
    await waitForTrue(this.readySubject, opts);
  }

  setError(err: string | AppErrorWithDetails, opts?: { emitEvent?: boolean; detailsCssClass?: string; }) {
    if (!err) {
      this.error = undefined;
    }
    else if (typeof err === 'string') {
      console.error('[report] Error: ' + (err || ''));
      this.error = err as string;
    }
    else {
      console.error('[report] Error: ' + err.message || '', err);
      let userMessage = err.message && this.translate.instant(err.message) || err;

      // Add details error (if any) under the main message
      const detailMessage = (!err.details || typeof err.details === 'string')
        ? err.details as string
        : err.details.message;
      if (isNotNilOrBlank(detailMessage)) {
        const cssClass = opts?.detailsCssClass || 'hidden-xs hidden-sm';
        userMessage += `<br/><small class="${cssClass}" title="${detailMessage}">`;
        userMessage += detailMessage.length < 70 ? detailMessage : detailMessage.substring(0, 67) + '...';
        userMessage += '</small>';
      }
      this.error = userMessage;
    }
    if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  waitIdle(opts?: FirstOptions): Promise<void> {
    return firstFalsePromise(this.loadingSubject, { stop: this.destroySubject, ...opts });
  }

  markAsReady() {
    console.log('markAsReady');
    this.readySubject.next(true);
  }


  /* -- protected function -- */

  protected async computeTitle(data: T, parent?: ObservedLocation): Promise<string> {
    const titlePrefix = await this.translate.get('LANDING.TITLE_PREFIX', {
      location: data.location?.name || '',
      date: this.dateFormatPipe.transform(data.dateTime, {time: false})
    }).toPromise();
    const title = await this.translate.get('LANDING.REPORT.TITLE').toPromise();
    this.defaultBackHref = `/observations/${parent.id}/landing/${data.id}?tab=1`;
    return titlePrefix + title;
  }

  protected onDataLoaded(data: T, pmfms: IPmfm[]): Promise<T> {
    // FOR DEV ONLY : add more data
    if (this.debug && !environment.production && data.samples.length < 5) this.addFakeSamplesForDev(data);
    this.stats.sampleCount = data.samples?.length || 0;
    return Promise.resolve(data as T);
  }

  protected loadFromRoute(): Promise<void> {
    const route = this.route.snapshot;
    if (!route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
    }
    let id = route.params[this._pathIdAttribute];
    if (isNil(id) || id === 'new') {
      return this.load(undefined, route.params);
    } else {
      // Convert as number, if need
      if (isInt(id)) {
        id = parseInt(id);
      }
      return this.load(id, route.params);
    }
  }

  protected async loadFromInput() {
    await this.ready({ stop: this.destroySubject });
    await this.onDataLoaded(this.data, this.pmfms);
    this.markAsLoaded();
    this.cd.detectChanges();
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsLoading(opts = { emitEvent: true }) {
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected addFakeSamplesForDev(data: Landing, count = 20) {
    if (environment.production || !data.samples.length) return; // Skip
    const samples = new Array(count);
    for (let i = 0; i < count; i++) {
      samples[i] = data.samples[i % data.samples.length].clone();
    }
    data.samples = samples;
  }
}
