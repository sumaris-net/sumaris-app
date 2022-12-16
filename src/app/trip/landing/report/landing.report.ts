import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, Optional, ViewChild } from '@angular/core';
import { RevealComponent } from '@app/shared/report/reveal/reveal.component';
import { IRevealOptions } from '@app/shared/report/reveal/reveal.utils';
import { LandingService } from '@app/trip/services/landing.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AccountService,
  AppErrorWithDetails,
  DateFormatService,
  DateUtils,
  Department,
  Entity,
  EntityAsObjectOptions,
  EntityServiceLoadOptions,
  FilesUtils,
  firstFalsePromise,
  FirstOptions,
  Image,
  isInt,
  isNil,
  isNilOrBlank, isNilOrNaN,
  isNotEmptyArray,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LocalSettingsService,
  NetworkService,
  Person,
  PlatformService,
  toDateISOString,
  toNumber,
  TranslateContextService,
  WaitForOptions,
  waitForTrue
} from '@sumaris-net/ngx-components';
import { BehaviorSubject, Subject } from 'rxjs';
import { Landing } from '@app/trip/services/model/landing.model';
import { TranslateService } from '@ngx-translate/core';
import { ObservedLocation } from '@app/trip/services/model/observed-location.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { AcquisitionLevelCodes, WeightUnitSymbol } from '@app/referential/services/model/model.enum';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { environment } from '@environments/environment';
import { Moment } from 'moment';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Share } from '@capacitor/share';
import { FileTransferService } from '@app/shared/service/file-transfer.service';
import { decodeUTF8 } from 'tweetnacl-util';
import { filter, first, map, takeUntil } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import { v4 as uuidv4 } from 'uuid';
import { Popovers } from '@app/shared/popover/popover.utils';
import { PopoverController } from '@ionic/angular';

export class LandingReportOptions {
  pathIdAttribute?: string;
  pathParentIdAttribute?: string;
}

export interface LandingStats {
  sampleCount: number;
  images?: Image[];
}

export class ReportFileContent<T extends Entity<T> = Entity<any>, S = any> {
  // File metadata
  reportUrl: string;
  recorderPerson: Person;
  recorderDepartment: Department;
  creationDate: Moment;

  data: T;
  stats: Partial<S>;

  asObject(opts?: EntityAsObjectOptions) {
    const target: any = Object.assign({}, this);
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || null;
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || null;
    target.data = this.data.asObject(opts);

    // Clean unused properties
    if (opts?.minify) {
      if (target.recorderDepartment) {
        delete target.recorderDepartment.creationDate;
        delete target.recorderDepartment.comments;
      }
    }

    return target;
  }
}

@Component({
  selector: 'app-landing-report',
  styleUrls: ['./landing.report.scss'],
  templateUrl: './landing.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// tslint:disable-next-line:directive-class-suffix
export class LandingReport<T extends Landing = Landing, S extends LandingStats = LandingStats> implements AfterViewInit, OnDestroy {

  private readonly router: Router;
  private readonly route: ActivatedRoute;
  private readonly platform: PlatformService;
  private readonly cd: ChangeDetectorRef;
  private readonly accountService: AccountService;
  private readonly fileTransferService: FileTransferService;
  private readonly _pathParentIdAttribute: string;
  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;

  protected readonly network: NetworkService;
  protected readonly translate: TranslateService;
  protected readonly translateContext: TranslateContextService;
  protected readonly observedLocationService: ObservedLocationService;
  protected readonly landingService: LandingService;
  protected readonly dateFormat: DateFormatService;
  protected readonly programRefService: ProgramRefService;
  protected readonly settings: LocalSettingsService;
  protected readonly destroySubject = new Subject();

  readonly readySubject = new BehaviorSubject<boolean>(false);
  readonly loadingSubject = new BehaviorSubject<boolean>(true);

  $title = new BehaviorSubject<string>('');
  $defaultBackHref = new Subject<string>();
  error: string;
  revealOptions: Partial<IRevealOptions>;
  weightDisplayedUnit: WeightUnitSymbol;
  i18nPmfmPrefix: string;

  @Input() mobile: boolean;
  @Input() parent: ObservedLocation;
  @Input() embedded = false;
  @Input() data: T;
  @Input() pmfms: IPmfm[];
  @Input() stats: Partial<S> = {};
  @Input() i18nContext = {
    prefix: 'LANDING.REPORT.',
    suffix: ''
  }

  @Input() showToolbar = true;
  @Input() showError = true;
  @Input() debug = !environment.production;

  @ViewChild(RevealComponent, {static: false}) reveal!: RevealComponent;

  get loading(): boolean {
    return this.loadingSubject.value;
  }
  get loaded(): boolean {
    return !this.loadingSubject.value;
  }

  constructor(
    private injector: Injector,
    @Optional() options?: LandingReportOptions
  ) {
    this.router = injector.get(Router);
    this.route = injector.get(ActivatedRoute);
    this.platform = injector.get(PlatformService);
    this.translate = injector.get(TranslateService);
    this.translateContext = injector.get(TranslateContextService);
    this.accountService = injector.get(AccountService);
    this.network = injector.get(NetworkService);
    this.fileTransferService = injector.get(FileTransferService);
    this.observedLocationService = injector.get(ObservedLocationService);
    this.landingService = injector.get(LandingService);
    this.dateFormat = injector.get(DateFormatService);
    this.programRefService = injector.get(ProgramRefService);
    this.settings = injector.get(LocalSettingsService);
    this.cd = injector.get(ChangeDetectorRef);
    this.mobile = this.settings.mobile;

    this._pathParentIdAttribute = options?.pathParentIdAttribute || 'observedLocationId';
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || options?.pathIdAttribute || 'landingId';
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
    const mobile = this.settings.mobile;
    this.revealOptions = {
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

    try {
      const parentId = toNumber(opts?.[this._pathParentIdAttribute], undefined);
      let [data, parent] = await Promise.all([
        this.landingService.load(id),
        Promise.resolve(null),
        isNotNilOrNaN(parentId) ? this.observedLocationService.load(parentId) : Promise.resolve(null)
      ]);

      // Make sure to load the parent
      if (!parent || (data && parent.id !== data.observedLocationId)) {
        parent = await this.observedLocationService.load(data.observedLocationId);
      }

      if (!data || !parent) throw new Error('ERROR.LOAD_ENTITY_ERROR');

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

      const defaultBackHref = await this.computeDefaultBackHref(this.data, this.parent);
      this.$defaultBackHref.next(defaultBackHref);

      this.error = null;
      this.markAsLoaded();
      this.cd.detectChanges();

      await this.reveal.initialize();
    }
    catch (err) {
      console.error(err);
      throw err;
    }
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
    this.readySubject.next(true);
  }


  /* -- protected function -- */

  protected async computeTitle(data: T, parent?: ObservedLocation): Promise<string> {
    const titlePrefix = await this.translateContext.get('LANDING.TITLE_PREFIX',
      this.i18nContext.suffix,
      {
      location: data.location?.name || '',
      date: this.dateFormat.transform(data.dateTime, {time: false})
    }).toPromise();
    const title = await this.translate.get('LANDING.REPORT.TITLE').toPromise();
    return titlePrefix + title;
  }

  protected async computeDefaultBackHref(data: T, parent?: ObservedLocation): Promise<string> {
    return `/observations/${parent.id}/landing/${data.id}?tab=1`;
  }

  protected onDataLoaded(data: T, pmfms: IPmfm[]): Promise<T> {
    // FOR DEV ONLY : add more data
    //if (this.debug && !environment.production && data.samples.length < 5) this.addFakeSamplesForDev(data);

    // Compute sample count
    this.stats.sampleCount = data.samples?.length || 0;

    // Remove technical label (starting with #)
    (data.samples || []).forEach(sample => {
      // Remove invalid sample label
      if (sample.label?.startsWith('#')) sample.label = null;
    });

    // Compute images, with title
    this.stats.images = (data.samples || [])
      .filter(s => isNotEmptyArray(s.images))
      .flatMap(s => {
        // Add title to image
        s.images.forEach(image => {
          image.title = image.title || s.label || `#${s.rankOrder}`;
        })
        return s.images;
      });
    return Promise.resolve(data as T);
  }

  protected loadFromRoute(): Promise<void> {
    const route = this.route.snapshot;
    let id = toNumber(route?.params[this._pathIdAttribute]);
    if (isNilOrNaN(id)) throw new Error(`[loadFromRoute] id for param ${this._pathIdAttribute} is nil`);
    // Convert as number, if need
    return this.load(+id, route.params);
  }

  protected async loadFromInput() {
    await this.ready({ stop: this.destroySubject });
    await this.onDataLoaded(this.data, this.pmfms);
    this.markAsLoaded();
    this.cd.detectChanges();
  }

  protected async exportToJson(event?: Event) {

    const filename = this.getExportFileName('json');
    const encoding = this.getExportEncoding('json');
    const content  = await this.getReportFileContent();
    const jsonContent = content.asObject({minify: true});

    // Write to file
    FilesUtils.writeTextToFile(
      JSON.stringify(jsonContent), {
        type: 'application/json',
        filename,
        encoding
      }
    );
  }



  protected async showSharePopover(event?: UIEvent) {

    const {url} = await this.uploadReportFile();

    // Use Capacitor plugin
    if (this.mobile && this.platform.isCapacitor()) {
      await Share.share({
        title: this.$title.value,
        text: 'Really awesome thing you need to see right meow',
        url,
        dialogTitle: this.translate.instant('COMMON.SHARE.DIALOG_TITLE'),
      });
    }
    else {
      await Popovers.showText(
        this.injector.get(PopoverController),
        event,
        {
          text: url,
          editing: false,
          autofocus: false,
          multiline: false
        }
      )
    }
  }

  protected async uploadReportFile(): Promise<{url: string}> {
    const filename = this.getExportFileName('json');
    const content  = await this.getReportFileContent();
    const json = content.asObject({ minify: true });
    const arrayUt8 = decodeUTF8(JSON.stringify(json));
    //const base64 = encodeBase64(arrayUt8);

    const blob = new Blob([arrayUt8], {type: "application/json"});
    blob['lastModifiedDate'] = (new Date()).toISOString();
    blob['name'] = filename;

    const { fileName, message } = await this.fileTransferService.uploadResource(<File>blob, {
      resourceType: 'report',
      resourceId: uuidv4() + '.json',
      reportProgress: false
    })
      .pipe(
        map(event => {
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
        }),
        filter(body => !!body),
        first(),
        takeUntil(this.destroySubject)
      ).toPromise();

    if (message !== "OK" || !fileName) {
      console.error('Failed to upload report data!');
      // TODO throw error ?
      return;
    }

    const appUrl = window.location.href;
    const shareUrl = `${appUrl}/share/report/${fileName}`;
    return { url: shareUrl};
  }

  protected async getReportFileContent(): Promise<ReportFileContent> {
    // Wait data loaded
    await this.waitIdle({timeout: 5000});

    const content  = new ReportFileContent();
    content.data = this.data;
    content.stats = this.stats;
    content.reportUrl = this.router.url;
    content.creationDate = DateUtils.moment();
    if (this.accountService.isLogin()) {
      content.recorderPerson = this.accountService.person;
      content.recorderDepartment = this.accountService.department;
    }

    return content;
  }

  protected getExportFileName(format = 'json', params?: any): string {
    const key = `${this.i18nContext.prefix}EXPORT_${format.toUpperCase()}_FILENAME`;
    const filename = this.translateContext.instant(key, this.i18nContext.suffix, params || {title: this.$title.value});
    if (filename !== key) return filename;
    return `export.${format}`; // Default filename
  }

  protected getExportEncoding(format = 'json'): string {
    const key = `FILE.${format.toUpperCase()}.ENCODING`;
    const encoding = this.translate.instant(key);
    if (encoding !== key) return encoding;
    return 'UTF-8'; // Default encoding
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
