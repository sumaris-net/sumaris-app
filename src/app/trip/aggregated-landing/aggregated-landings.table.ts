import {ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit} from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {FormBuilder} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';
import {
  AccountService,
  AppTable,
  EntitiesTableDataSource,
  filterNotNil,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  NetworkService,
  PlatformService,
  referentialToString,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean
} from '@sumaris-net/ngx-components';
import {VesselSnapshotService} from '@app/referential/services/vessel-snapshot.service';
import {BehaviorSubject} from 'rxjs';
import {AggregatedLanding, VesselActivity} from '../services/model/aggregated-landing.model';
import {AggregatedLandingService} from '../services/aggregated-landing.service';
import * as momentImported from 'moment';
import {Moment} from 'moment';
import {ObservedLocation} from '../services/model/observed-location.model';
import {TableElement} from '@e-is/ngx-material-table';
import {MeasurementValuesUtils} from '../services/model/measurement.model';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {AggregatedLandingModal} from './aggregated-landing.modal';
import {VesselSnapshot} from '@app/referential/services/model/vessel-snapshot.model';
import {environment} from '@environments/environment';
import {ProgramRefService} from '@app/referential/services/program-ref.service';
import {AggregatedLandingFormOption} from './aggregated-landing.form';
import {AggregatedLandingFilter} from '@app/trip/services/filter/aggregated-landing.filter';

const moment = momentImported;

@Component({
  selector: 'app-aggregated-landings-table',
  templateUrl: 'aggregated-landings.table.html',
  styleUrls: ['./aggregated-landings.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AggregatedLandingsTable extends AppTable<AggregatedLanding, AggregatedLandingFilter> implements OnInit, OnDestroy {

  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  filterIsEmpty = true;
  offline = false;
  mobile: boolean;

  private _onRefreshDates = new EventEmitter<any>();
  private _onRefreshPmfms = new EventEmitter<any>();
  private _program: string;
  private _acquisitionLevel: string;
  private _nbDays: number;
  private _startDate: Moment;
  $dates = new BehaviorSubject<Moment[]>(undefined);
  $pmfms = new BehaviorSubject<DenormalizedPmfmStrategy[]>(undefined);

  set nbDays(value: number) {
    if (value && value !== this._nbDays) {
      this._nbDays = value;
      this._onRefreshDates.emit();
    }
  }

  set startDate(value: Moment) {
    if (value && (!this._startDate || !value.isSame(this._startDate))) {
      this._startDate = value;
      this._onRefreshDates.emit();
    }
  }

  set program(value: string) {
    if (this._program !== value && isNotNil(value)) {
      this._program = value;
      this._onRefreshPmfms.emit();
    }
  }

  get program(): string {
    return this._program;
  }

  @Input()
  set acquisitionLevel(value: string) {
    if (this._acquisitionLevel !== value && isNotNil(value)) {
      this._acquisitionLevel = value;
      this._onRefreshPmfms.emit();
    }
  }

  constructor(
    public network: NetworkService,
    protected injector: Injector,
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: PlatformService,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected settings: LocalSettingsService,
    protected accountService: AccountService,
    protected service: AggregatedLandingService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected formBuilder: FormBuilder,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected cd: ChangeDetectorRef,
  ) {

    super(route, router, platform, location, modalCtrl, settings,
      ['vessel'],
      new EntitiesTableDataSource<AggregatedLanding, AggregatedLandingFilter>(AggregatedLanding, service, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        debug: !environment.production,
        serviceOptions: {
          saveOnlyDirtyRows: true
        }
      }),
      null,
      injector
    );
    this.i18nColumnPrefix = 'AGGREGATED_LANDING.TABLE.';

    this.readOnly = false; // Allow deletion
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;
    this.autoLoad = false;
    this.defaultPageSize = -1; // Do not use paginator
    this.mobile = this.settings.mobile;

    // default acquisition level
    this._acquisitionLevel = AcquisitionLevelCodes.LANDING;

    // FOR DEV ONLY ----
    this.debug = !environment.production;

  }

  ngOnInit() {
    super.ngOnInit();

    this.isAdmin = this.accountService.isAdmin();
    this.canEdit = this.isAdmin || this.accountService.isUser();
    this.canDelete = this.isAdmin;

    // Listen network
    this.offline = this.network.offline;

    this.registerSubscription(this._onRefreshDates.subscribe(() => this.refreshDates()));
    this.registerSubscription(this._onRefreshPmfms.subscribe(() => this.refreshPmfms()));

    this.registerSubscription(filterNotNil(this.$dates).subscribe(() => this.updateColumns()));
  }

  setParent(parent: ObservedLocation) {
    const filter = new AggregatedLandingFilter();
    // Filter on parent
    if (parent) {
      this.startDate = parent.startDateTime;
      filter.observedLocationId = parent.id;
      filter.programLabel = this._program;
      filter.locationId = parent.location && parent.location.id;
      filter.startDate = parent.startDateTime;
      filter.endDate = parent.endDateTime || moment(parent.startDateTime).add(this._nbDays, "day");
    }
    this.setFilter(filter);
  }

  setFilter(filter: AggregatedLandingFilter, opts?: { emitEvent: boolean }) {

    // Don't refilter if actual filter is equal
    if (this.filter && this.filter.equals(filter))
      return;

    super.setFilter(filter, opts);
  }

  referentialToString = referentialToString;
  measurementValueToString = MeasurementValuesUtils.valueToString;

  getActivities(row: TableElement<AggregatedLanding>, date: Moment): VesselActivity[] {
    const activities = row.currentData?.vesselActivities.filter(activity => activity.date.isSame(date)) || [];
    return isNotEmptyArray(activities) ? activities : undefined;
  }

  /* -- protected methods -- */
  protected markForCheck() {
    this.cd.markForCheck();
  }

  private refreshDates() {
    if (isNil(this._startDate) || isNil(this._nbDays)) return;

    const dates: Moment[] = [];
    for (let d = 0; d < this._nbDays; d++) {
      dates[d] = moment(this._startDate).add(d, "day");
    }
    this.$dates.next(dates);
  }

  protected updateColumns() {
    if (!this.$dates.getValue()) return;
    this.displayedColumns = this.getDisplayColumns();
    if (!this.loading) this.markForCheck();
  }

  protected getDisplayColumns(): string[] {

    const additionalColumns = [];
    if (this.mobile) {
      // add summary column
    } else {
      additionalColumns.push(...(this.$dates.getValue()?.map(date => date.valueOf().toString()) || []));
    }

    return RESERVED_START_COLUMNS
      .concat(this.columns)
      .concat(additionalColumns)
      .concat(RESERVED_END_COLUMNS);
  }

  private async refreshPmfms() {
    if (isNil(this._program) || isNil(this._acquisitionLevel)) return;

    // Load pmfms
    const pmfms = (await this.programRefService.loadProgramPmfms(
      this._program,
      {
        acquisitionLevel: this._acquisitionLevel
      })) || [];

    if (!pmfms.length && this.debug) {
      console.debug(`[aggregated-landings-table] No pmfm found (program=${this.program}, acquisitionLevel=${this._acquisitionLevel}). Please fill program's strategies !`);
    }

    this.$pmfms.next(pmfms);
  }

  clickRow(event: MouseEvent | undefined, row: TableElement<AggregatedLanding>): boolean {
    if (event && event.defaultPrevented || this.loading) return false;
    if (!this.mobile) return false;

    const today = moment().startOf("day");
    this.markAsLoading();
    this.openModal(event, row, today)
      .then(() => this.markAsLoaded());

  }

  clickCell($event: MouseEvent, row: TableElement<AggregatedLanding>, date: Moment) {
    if ($event) $event.stopPropagation();
    if (this.debug)
      console.debug('clickCell', $event, row.currentData.vesselSnapshot.exteriorMarking + "|" + row.currentData.vesselActivities.length, date.toISOString());

    this.markAsLoading();
    this.openModal($event, row, date)
      .then(() => this.markAsLoaded());
  }

  async openModal(event: MouseEvent|undefined, row: TableElement<AggregatedLanding>, date?: Moment) {
    this.editRow(event, row);
    const modal = await this.modalCtrl.create({
      component: AggregatedLandingModal,
      componentProps: {
        data: row.currentData.clone(),
        options: <AggregatedLandingFormOption>{
          dates: this.$dates.getValue(),
          initialDate: date,
          programLabel: this._program,
          acquisitionLevel: this._acquisitionLevel
        }
      },
      backdropDismiss: false,
      // cssClass: 'modal-large'
    });

    await modal.present();
    const res = await modal.onDidDismiss();

    if (res && res.data) {

      if (res.data.aggregatedLanding) {
        console.debug('data to update:', res.data.aggregatedLanding);

        row.currentData.vesselActivities.splice(0, row.currentData.vesselActivities.length, ...res.data.aggregatedLanding.vesselActivities);
        // this.markAsDirty();
        this.confirmEditCreate();
        this.markForCheck();
      }

      if (toBoolean(res.data.saveOnDismiss, false)) {
        // call save
        await this.save();
      }

      if (res.data.tripToOpen) {
        // navigate to trip
        this.markAsLoading();
        this.markForCheck();

        try {
          await this.router.navigateByUrl(`/observations/${res.data.tripToOpen.observedLocationId}/trip/${res.data.tripToOpen.tripId}`);
        } finally {
          this.markAsLoaded();
          this.markForCheck();
        }
      }
    }
  }

  async addAggregatedRow(vessel: VesselSnapshot) {
    const row = await this.addRowToTable();
    row.currentData.vesselSnapshot = vessel;
    this.markForCheck();
    // TODO scroll to row
    // this.scrollToRow(row);
  }

  async vesselIdsAlreadyPresent(): Promise<number[]> {
    const rows = await this.dataSource.getRows();
    return (rows || []).map(row => row.currentData.vesselSnapshot.id);
  }

  // private scrollToRow(row: TableElement<AggregatedLanding>) {
  //   if (!row) return;
  //   const rect = row._elementRef.nativeElement.getBoundingClientRect();
  //   if ((rect.y <= 0) || ((rect.y+rect.height) > this.table._elementRef.nativeElement.getBoundingClientRect().height))
  //   {
  //     row.element.nativeElement.scrollIntoView();
  //   }
  // }
}

