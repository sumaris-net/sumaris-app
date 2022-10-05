import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';
import { TranslateService } from '@ngx-translate/core';
import {
  AppErrorWithDetails,
  arrayDistinct,
  DateFormatPipe,
  firstFalsePromise,
  isNil,
  isNilOrBlank,
  isNotEmptyArray,
  isNotNilOrBlank,
  LocalSettingsService,
  PlatformService,
  WaitForOptions
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { LANDING_TABLE_DEFAULT_I18N_PREFIX } from '@app/trip/landing/landings.table';
import { LandingReport } from '@app/trip/landing/report/landing.report';
import { LandingService } from '@app/trip/services/landing.service';
import { Landing } from '@app/trip/services/model/landing.model';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';


@Component({
  selector: 'app-observed-location',
  templateUrl: './observed-location.report.html',
  styleUrls: ['../../landing/report/landing.report.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservedLocationReport<T extends ObservedLocation = ObservedLocation> implements AfterViewInit {

  private readonly route: ActivatedRoute;
  private readonly platform: PlatformService;
  private readonly dateFormatPipe: DateFormatPipe;
  private readonly cd: ChangeDetectorRef;
  private readonly translate: TranslateService;
  private readonly observedLocationService: ObservedLocationService;
  private readonly settings: LocalSettingsService;
  private readonly programRefService: ProgramRefService;
  private readonly landingService: LandingService;

  protected readonly destroySubject = new Subject();
  protected readonly readySubject = new BehaviorSubject<boolean>(false);
  protected readonly loadingSubject = new BehaviorSubject<boolean>(true);

  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;

  error: string;
  $title = new Subject();
  $defaultBackHref = new Subject<string>();
  slidesOptions: Partial<IRevealOptions>;
  i18nContext = {
    prefix: '',
    suffix: ''
  };

  // Data and Co.
  data: T;
  stats: {
    vesselCount?: number;
  } = {}
  pmfms: IPmfm[];
  landingPmfms: IPmfm[];
  landingEditor: LandingEditor;
  landingI18nColumnPrefix: string;
  landingShowSampleCount: boolean;
  landingSamplesPmfms: IPmfm[][];


  @Input() showToolbar = true;
  @Input() showError = true;

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;
  @ViewChildren("landingReport") children!: QueryList<LandingReport>;

  get loading(): boolean {
    return this.loadingSubject.value || this.children.some(c => c.loading);
  }
  get loaded(): boolean {return !this.loading && !this.children.some(c => c.loading);}

  constructor(injector: Injector) {
    this.route = injector.get(ActivatedRoute);
    this.cd = injector.get(ChangeDetectorRef);
    this.dateFormatPipe = injector.get(DateFormatPipe);

    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.settings = injector.get(LocalSettingsService);
    this.programRefService = injector.get(ProgramRefService);
    this.landingService = injector.get(LandingService);

    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam;
    this.landingI18nColumnPrefix = LANDING_TABLE_DEFAULT_I18N_PREFIX;

    this.computeSlidesOptions();

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
      console.error(`[${this.constructor.name}] Error: ${err.message}`, err);
      let userMessage: string = err.message && this.translate.instant(err.message) || err;
      const detailMessage: string = (!err.details || typeof(err.details) === 'string')
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

  protected async loadFromRoute() {
    const route = this.route.snapshot;
    let id: number = route.params[this._pathIdAttribute];
    if (isNil(id)) {
      throw new Error(`[loadFromRoute] id for param ${this._pathIdAttribute} is nil`);
    }

    await this.load(id);

    await this.updateView();
  }

  async load(id: number) {
    const data = await this.observedLocationService.load(id, {withLanding: true});
    if (!data) {
      throw new Error('ERROR.LOAD_ENTITY_ERROR');
    }

    // Compute title and back
    await this.computeTitle(data);
    this.computeDefaultBackHref(data);

    const program = await this.programRefService.loadByLabel(data.program.label);
    this.i18nContext.prefix = 'OBSERVED_LOCATION.PMFM.';
    this.i18nContext.suffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    if (this.i18nContext.suffix === 'legacy') {this.i18nContext.suffix = ''}
    this.landingEditor = program.getProperty(ProgramProperties.LANDING_EDITOR);
    // Force landing editor to default for testing
    //this.landingEditor = 'landing'
    this.landingShowSampleCount = program.getPropertyAsBoolean(ProgramProperties.LANDING_SAMPLES_COUNT_ENABLE);

    // Load full landings
    data.landings = await Promise.all(data.landings.map(landing => this.landingService.load(landing.id)));

    // Load pmfms
    const pmfms = await this.programRefService.loadProgramPmfms(
      program.label, {acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION}
    );
    const landingPmfms = await this.programRefService.loadProgramPmfms(
      program.label, {acquisitionLevel: AcquisitionLevelCodes.LANDING}
    );

    // Apply data
    this.pmfms = pmfms;
    this.landingPmfms = landingPmfms;
    this.landingSamplesPmfms = await this.loadLandingsPmfms(data.landings, program);
    this.data = await this.onDataLoaded(data as T);

    this.markAsReady();
    this.markAsLoaded();

    // Wait all sections loaded
    await this.waitIdle({stop: this.destroySubject});
  }

  async updateView() {

    // Make sure all sections has been rendered
    this.cd.detectChanges();

    // Run slides
    await this.slides.initialize();
  }

  protected async onDataLoaded(data: T): Promise<T> {
    this.stats.vesselCount = arrayDistinct(data.landings, ['vesselSnapshot.id']).length;
    return data;
  }

  protected markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
    if (!this.children.length && isNotEmptyArray(this.data?.landings)) {
      this.cd.detectChanges();
    }
    this.children.map(c => c.markAsReady());
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoaded(opts = {emitEvent: true}) {
    if(this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected async computeTitle(data: ObservedLocation) {
    const title = await this.translate.get('OBSERVED_LOCATION.REPORT.TITLE', {
      location: data.location.name,
      dateTime: this.dateFormatPipe.transform(data.startDateTime, {time: true}),
    }).toPromise();
    this.$title.next(title)
  }

  protected computeDefaultBackHref(data: ObservedLocation) {
    this.$defaultBackHref.next(`/observations/${data.id}?tab=1`);
  }

  protected computeSlidesOptions() {
    const mobile = this.settings.mobile;
    this.slidesOptions = {
      autoInitialize: false,
      disableLayout: mobile,
      touch: mobile,
    };
  }

  protected async loadLandingsPmfms(landings: Landing[], program: Program): Promise<IPmfm[][]> {
    const weightDisplayedUnit = await program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;
    return Promise.all(
      landings.map(async (landing) => {
        const taxonGroup = (landing.samples || [])
          .find(s => !!s.taxonGroup?.name)?.taxonGroup || {} as TaxonGroupRef;
        const pmfms = await this.programRefService.loadProgramPmfms(program.label, {
          acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
          taxonGroupId: taxonGroup?.id,
        });
        if (weightDisplayedUnit) {
          PmfmUtils.setWeightUnitConversions(pmfms, weightDisplayedUnit);
        }
        return pmfms;
      })
    );
  }

  protected async waitIdle(opts: WaitForOptions) {
    if (this.loaded) return; // skip
    await firstFalsePromise(this.loadingSubject, opts);
    await Promise.all(
      this.children.map(c => c.waitIdle(opts))
    );
  }

  isQualitativePmfm(pmfm: IPmfm) {
    return pmfm.isQualitative && pmfm.qualitativeValues?.length <= 3;
  }

  isNotQualitativePmfm(pmfm: IPmfm) {
    return !pmfm.isQualitative || !pmfm.qualitativeValues?.length || (pmfm.qualitativeValues.length > 3);
  }
}
