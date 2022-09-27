import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';
import { TranslateService } from '@ngx-translate/core';
import { AppErrorWithDetails, arrayDistinct, DateFormatPipe, isNil, isNilOrBlank, isNotNilOrBlank, LocalSettingsService, PlatformService, WaitForOptions } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { LandingReport } from '../landing/landing.report';
import { LandingService } from '../services/landing.service';
import { Landing } from '../services/model/landing.model';
import { MeasurementFormValues, MeasurementValuesUtils } from '../services/model/measurement.model';
import { ObservedLocation } from '../services/model/observed-location.model';
import { ObservedLocationService } from '../services/observed-location.service';


export interface LandingReportItems {
  stats: {
    //taxonGroup: TaxonGroupRef,
    sampleCount: number,
  },
  data: Landing,
  pmfms: IPmfm[],
}

@Component({
  selector: 'app-observed-location',
  templateUrl: './observed-location.report.html',
  styleUrls: ['./observed-location.report.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObservedLocationReport implements AfterViewInit {

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

  protected readonly _readySubject = new BehaviorSubject<boolean>(false);
  protected readonly _loadingSubject = new BehaviorSubject<boolean>(true);

  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;

  defaultBackHref: string = null;
  error: string;
  slidesOptions: Partial<IRevealOptions>;
  data: ObservedLocation;
  nbControlledVessel: number = 0;
  weightDisplayedUnit: WeightUnitSymbol;
  pmfms: IPmfm[];
  pmfmsValues: MeasurementFormValues;
  i18nContext = {
    prefix: '',
    suffix: ''
  };
  landingReportItems: LandingReportItems[];

  $title = new Subject();

  @Input() showToolbar = true;
  @Input() showError = true;

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;
  @ViewChildren("landingReport") childrens: QueryList<LandingReport>;

  get loading(): boolean {return this._loadingSubject.value;}
  get loaded(): boolean {return !this._loadingSubject.value;}

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

    await this.computeTitle(data);
    this.computeDefaultBackHref(data);
    this.data = data;

    const program = await this.programRefService.loadByLabel(data.program.label);
    this.weightDisplayedUnit = program
      .getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;
    this.i18nContext.prefix = 'TRIP.SAMPLE.PMFM.';
    this.i18nContext.suffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
    if (this.i18nContext.suffix === 'legacy') {this.i18nContext.suffix = ''}

    this.pmfms = await this.programRefService.loadProgramPmfms(
      data.program.label,
      {
        acquisitionLevel: AcquisitionLevelCodes.OBSERVED_LOCATION
      }
    )
    // data.value
    this.pmfmsValues = MeasurementValuesUtils
      .normalizeValuesToForm(data.measurementValues, this.pmfms);
    this.nbControlledVessel = arrayDistinct(this.data.landings, ['vesselSnapshot.id']).length;

    await this.fillLangingReportItems(data.landings, program);

    this.markAsLoaded();
    this.cd.detectChanges();

    await this.waitIdle({stop: this.destroySubject});

    this.slides.initialize();
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
    if(this._loadingSubject.value) {
      this._loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected async computeTitle(data: ObservedLocation) {
    const title = await this.translate.get('OBSERVED_LOCATION.REPORT.TITLE', {
      location: data.location.name,
      dateTime: this.dateFormatPipe.transform(data.controlDate, {time: true}),
    }).toPromise();
    this.$title.next(title)
  }

  protected computeDefaultBackHref(data: ObservedLocation) {
    this.defaultBackHref = `/observations/${data.id}?tab=1`;
  }

  protected computeSlidesOptions() {
    const mobile = this.settings.mobile;
    this.slidesOptions = {
      autoInitialize: false,
      disableLayout: mobile,
      touch: mobile,
    };
  }

  protected async fillLangingReportItems(landings: Landing[], program: Program) {
    const result:LandingReportItems[] = await Promise.all(landings.map(async (landing) => {
      const data = await this.landingService.load(landing.id);
      const weightDisplayedUnit = await program.getProperty(ProgramProperties.LANDING_WEIGHT_DISPLAYED_UNIT) as WeightUnitSymbol;
      const taxonGroup = (data.samples || [])
        .find(s => !!s.taxonGroup?.name)?.taxonGroup || {} as TaxonGroupRef;
      let pmfms = await this.programRefService.loadProgramPmfms(program.label, {
        acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
        taxonGroupId: taxonGroup?.id,
      });
      if (this.weightDisplayedUnit) {
        pmfms = PmfmUtils.setWeightUnitConversions(pmfms, weightDisplayedUnit);
      }
      const result = {
        stats: {
          taxonGroup: taxonGroup,
          sampleCount: data.samples?.length || 0,
        },
        data: data, // Missing onDataLoaded normaly done by LandingReport
        pmfms: pmfms,
      }
      return result;
    }));
    this.landingReportItems = result;
  }

  protected async waitIdle(opts: WaitForOptions) {
    await Promise.all(
      this.childrens.map(c => c.waitIdle(opts))
    );
  }

}
