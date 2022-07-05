import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AppSlidesComponent, IRevealOptions } from '@app/shared/report/slides/slides.component';
import { LandingService } from '@app/trip/services/landing.service';
import { ActivatedRoute } from '@angular/router';
import { isNilOrBlank } from '@sumaris-net/ngx-components/src/app/shared/functions';
import { BehaviorSubject, Subject } from 'rxjs';
import { Landing } from '@app/trip/services/model/landing.model';
import { TranslateService } from '@ngx-translate/core';
import { DateFormatPipe, LocalSettingsService, PlatformService, sleep } from '@sumaris-net/ngx-components';
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
export class AuctionControlReport implements OnInit {

  private readonly _pathParentIdAttribute: string;
  private readonly _pathIdAttribute: string;
  private readonly _$loading = new BehaviorSubject(true);

  $title = new Subject();
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

  get loading(): boolean {
    return this._$loading.value;
  }
  get loaded(): boolean {
    return !this._$loading.value;
  }

  @ViewChild(AppSlidesComponent) slides!: AppSlidesComponent;

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
  }

  ngOnInit() {
    const route = this.route.snapshot;
    if (!route || isNilOrBlank(this._pathIdAttribute)) {
      throw new Error('Unable to load from route: missing \'route\' or \'options.pathIdAttribute\'.');
    }
    const parentId = route.params[this._pathParentIdAttribute];
    const id = route.params[this._pathIdAttribute];
    this.load(id, parentId);
  }

  ngAfterViewInit() {
  }


  async load(id: number, parentId: number) {

    await this.platform.ready();

    //await sleep(5000);

    const [data, parent] = await Promise.all([
      this.landingService.load(id),
      this.observedLocationService.load(parentId)
    ]);


    this.data = data;
    this.parent = parent;

    // Compute agg data
    this.stats.taxonGroup = (data.samples || []).find(s => !!s.taxonGroup?.name)?.taxonGroup || {};
    this.stats.sampleCount = data.samples?.length || 0;

    this.pmfms = await this.programRefService.loadProgramPmfms(parent.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.SAMPLE,
      taxonGroupId: this.stats.taxonGroup?.id
    })

    const title = await this.translate.get('AUCTION_CONTROL.REPORT.TITLE', {
      vessel: data.vesselSnapshot.name,
      date: this.dateFormatPipe.transform(data.dateTime),
    }).toPromise();
    this.$title.next(title);

    this._$loading.next(false);
    this.cd.detectChanges();

    await this.slides.initialize();

  }
}
