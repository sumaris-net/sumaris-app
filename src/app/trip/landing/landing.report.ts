import { AfterViewInit, ChangeDetectorRef, Directive, Injector, Input, ViewChild } from '@angular/core';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';
import { LandingService } from '@app/trip/services/landing.service';
import { ActivatedRoute } from '@angular/router';
import {
  AppErrorWithDetails,
  DateFormatPipe,
  EntityServiceLoadOptions,
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
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';

export class LandingReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class LandingReport<T extends Landing = Landing> implements AfterViewInit {

  private readonly route: ActivatedRoute;
  private readonly platform: PlatformService;
  private readonly cd: ChangeDetectorRef;
  private readonly _pathParentIdAttribute: string;
  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;
  protected readonly _readySubject = new BehaviorSubject<boolean>(false);
  protected readonly _loadingSubject = new BehaviorSubject(true);
  protected readonly translate :TranslateService;
  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly dateFormatPipe: DateFormatPipe;
  protected readonly programRefService: ProgramRefService;
  protected readonly settings: LocalSettingsService;

  defaultBackHref: string = null;
  $title = new Subject();
  error: string;
  slidesOptions: Partial<IRevealOptions>;
  data: T;
  parent: ObservedLocation;
  stats: any = {};
  weightDisplayedUnit: WeightUnitSymbol;
  pmfms: IPmfm[];
  i18nPmfmPrefix: string;
  i18nContext = {
    prefix: '',
    suffix: ''
  }

  @Input() showToolbar = true;
  @Input() showError = true;
  @Input() debug = !environment.production;

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;

  get loading(): boolean {
    return this._loadingSubject.value;
  }
  get loaded(): boolean {
    return !this._loadingSubject.value;
  }

  protected constructor(
    injector: Injector,
    options?: LandingReportOptions
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
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'landingId' ;
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
  }
  ngAfterViewInit() {

    // Load data
    if (this._autoLoad) {
      setTimeout(() => this.start(), this._autoLoadDelay);
    }
  }

  async start() {
    await this.platform.ready();
    this.markAsReady();

    try {
      await this.loadFromRoute();
    }
    catch(err) {
      this.setError(err);
    }
    finally {
      this.markAsLoaded();
    }
  }


  async load(id?: number, opts?: EntityServiceLoadOptions & {[key: string]: string}) {

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
    this.i18nContext.suffix = i18nSuffix === 'legacy' ? '': i18nSuffix;

    // Compute agg data
    this.stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup || {};

    let pmfms = await this.programRefService.loadProgramPmfms(parent.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: this.stats.taxonGroup?.id
    });

    // Apply weight conversion, if need
    if (this.weightDisplayedUnit) {
      pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit);
    }
    this.pmfms = pmfms;
    this.parent = parent;

    this.data = await this.onDataLoaded(data as T, pmfms);
    this.stats.sampleCount = data.samples?.length || 0;

    const title = await this.computeTitle(this.data, this.parent);
    this.$title.next(title);

    this.markAsLoaded();
    this.cd.detectChanges();

    await this.slides.initialize();
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    if (this._readySubject.value) return;
    await waitForTrue(this._readySubject, opts);
  }

  setError(err: string | AppErrorWithDetails, opts?: {emitEvent?: boolean; detailsCssClass?: string;}) {
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

  /* -- protected function -- */

  protected abstract computeTitle(data: T, parent?: ObservedLocation): Promise<string>;



  protected onDataLoaded(data: Landing, pmfms: IPmfm[]): Promise<T> {

    // FOR DEV ONLY : add more data
    if (this.debug && !environment.production && data.samples.length < 5) this.addFakeSamplesForDev(data);

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

  protected markAsReady() {
    this._readySubject.next(true);
  }

  protected markAsLoaded(opts = {emitEvent: true}) {
    if (this._loadingSubject.value) {
      this._loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected markAsLoading(opts = {emitEvent: true}) {
    if (!this._loadingSubject.value) {
      this._loadingSubject.next(true);
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
