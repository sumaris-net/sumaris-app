import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
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
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ObservedLocationService } from '@app/trip/services/observed-location.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';

export class AppDataReportOptions {
  pathIdAttribute?: string;
}

@Component({
  selector: 'app-auction-control-report',
  styleUrls: ['auction-control.report.scss'],
  templateUrl: './auction-control.report.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuctionControlReport implements OnInit, AfterViewInit {

  private readonly _pathParentIdAttribute: string;
  private readonly _pathIdAttribute: string;
  private readonly _autoLoad = true;
  private readonly _autoLoadDelay = 0;
  protected readonly _readySubject = new BehaviorSubject<boolean>(false);
  protected readonly _loadingSubject = new BehaviorSubject(true);

  $title = new Subject();
  error: string;
  slidesOptions: Partial<IRevealOptions>;
  data: Landing;
  parent: ObservedLocation;
  stats: any = {};
  pmfms: IPmfm[];
  i18nPmfmPrefix: string;
  i18nContext = {
    prefix: '',
    suffix: ''
  }

  @Input() showError = true;

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;

  get loading(): boolean {
    return this._loadingSubject.value;
  }
  get loaded(): boolean {
    return !this._loadingSubject.value;
  }

  constructor(
    private route: ActivatedRoute,
    private platform: PlatformService,
    public translate: TranslateService,
    public observedLocationService: ObservedLocationService,
    public landingService: LandingService,
    public dateFormatPipe: DateFormatPipe,
    public programRefService: ProgramRefService,
    public settings: LocalSettingsService,
    private cd: ChangeDetectorRef
  ) {
    this._pathParentIdAttribute = 'observedLocationId';
    this._pathIdAttribute = this.route.snapshot.data?.pathIdParam || 'controlId' ;
    this.i18nContext.suffix = 'AUCTION_CONTROL.';
    this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
    const mobile = this.settings.mobile;
    this.slidesOptions = {
      autoInitialize: false,
      disableLayout: mobile,
      touch: mobile
    }
    if (!route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
    }
  }

  ngOnInit() {
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

    this.data = data;
    this.parent = parent;

    // Compute agg data
    this.stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup || {};
    this.stats.sampleCount = data.samples?.length || 0;

    this.pmfms = await this.programRefService.loadProgramPmfms(parent.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: this.stats.taxonGroup?.id
    });

    const title = await this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormatPipe.transform(data.dateTime),
    }).toPromise();
    this.$title.next(title);

    this._loadingSubject.next(false);
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
    this._loadingSubject.next(false);
    if (opts.emitEvent !== false) this.markForCheck();
  }

  protected markAsLoading(opts = {emitEvent: true}) {
    this._loadingSubject.next(true);
    if (opts.emitEvent !== false) this.markForCheck();
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }


}
