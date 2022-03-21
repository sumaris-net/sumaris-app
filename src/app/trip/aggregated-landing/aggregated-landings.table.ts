import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import {
  AccountService,
  AppTable,
  ConfigService,
  CORE_CONFIG_OPTIONS, DateUtils,
  EntitiesTableDataSource,
  filterNotNil,
  firstNotNilPromise,
  isNil,
  isNotEmptyArray,
  isNotNil,
  NetworkService,
  referentialToString,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean
} from '@sumaris-net/ngx-components';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { BehaviorSubject } from 'rxjs';
import { AggregatedLanding, VesselActivity } from '../services/model/aggregated-landing.model';
import { AggregatedLandingService } from '../services/aggregated-landing.service';
import * as momentImported from 'moment';
import { Moment } from 'moment';
import { ObservedLocation } from '../services/model/observed-location.model';
import { TableElement } from '@e-is/ngx-material-table';
import { MeasurementValuesUtils } from '../services/model/measurement.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { AggregatedLandingModal } from './aggregated-landing.modal';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AggregatedLandingFormOption } from './aggregated-landing.form';
import { AggregatedLandingFilter } from '@app/trip/services/filter/aggregated-landing.filter';
import { switchMap } from 'rxjs/internal/operators';
import { map } from 'rxjs/operators';

const moment = momentImported;

@Component({
  selector: 'app-aggregated-landings-table',
  templateUrl: 'aggregated-landings.table.html',
  styleUrls: ['./aggregated-landings.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AggregatedLandingsTable extends AppTable<AggregatedLanding, AggregatedLandingFilter> implements OnInit, OnDestroy {

  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;
  filterIsEmpty = true;
  offline = false;
  showLabelForPmfmIds: number[];

  $currentDate = new BehaviorSubject<Moment>(undefined);
  $dates = new BehaviorSubject<Moment[]>(undefined);
  $pmfms = new BehaviorSubject<DenormalizedPmfmStrategy[]>(undefined);
  referentialToString = referentialToString;
  measurementValueToString = MeasurementValuesUtils.valueToString;

  loadingPmfms = false;

  private _onRefreshDates = new EventEmitter<any>();
  private _onRefreshPmfms = new EventEmitter<any>();
  private _programLabel: string;
  private _acquisitionLevel: string;
  private _nbDays: number;
  private _startDate: Moment;

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

  @Input() set programLabel(value: string) {
    if (this._programLabel !== value && isNotNil(value)) {
      this._programLabel = value;
      if (!this.loadingPmfms) this._onRefreshPmfms.emit();
    }
  }

  get programLabel(): string {
    return this._programLabel;
  }

  @Input()
  set acquisitionLevel(value: string) {
    if (this._acquisitionLevel !== value && isNotNil(value)) {
      this._acquisitionLevel = value;
      if (!this.loadingPmfms) this._onRefreshPmfms.emit();
    }
  }

  @Input()
  set parent(value: ObservedLocation | undefined) {
    this.setParent(value);
  }

  @Input() showToolbar = true;
  @Input() useSticky = true;

  constructor(
    injector: Injector,
    public network: NetworkService,
    protected accountService: AccountService,
    protected service: AggregatedLandingService,
    protected referentialRefService: ReferentialRefService,
    protected programRefService: ProgramRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected formBuilder: FormBuilder,
    protected alertCtrl: AlertController,
    protected translate: TranslateService,
    protected configService: ConfigService,
    protected cd: ChangeDetectorRef,
  ) {

    super(injector,
      ['vessel'],
      new EntitiesTableDataSource<AggregatedLanding, AggregatedLandingFilter>(AggregatedLanding, service, null, {
        prependNewElements: false,
        suppressErrors: environment.production,
        debug: !environment.production,
        serviceOptions: {
          saveOnlyDirtyRows: true,
        },
      }),
      null
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

    this.registerSubscription(this._onRefreshDates
      .pipe(
        // Get the DB timezone
        switchMap(_ => this.configService.config),
        map(config => config.getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE))
      )
      .subscribe(dbTimezone => this.refreshDates(dbTimezone)));

    this.registerSubscription(this._onRefreshPmfms.subscribe(() => this.refreshPmfms()));

    this.registerSubscription(filterNotNil(this.$dates).subscribe(() => this.updateColumns()));


  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$pmfms.complete();
    this.$pmfms.unsubscribe();
    this._onRefreshPmfms.complete();
    this._onRefreshPmfms.unsubscribe();
    this._onRefreshDates.complete();
    this._onRefreshDates.unsubscribe();
  }

  markAsReady(opts?: { emitEvent?: boolean }) {
    console.log('TODO marking as ready')
    super.markAsReady(opts);
  }

  async ready() {
    await super.ready();

    // Wait pmfms load, and controls load
    await firstNotNilPromise(this.$pmfms);
  }

  setParent(parent: ObservedLocation|undefined) {
    // Filter on parent
    if (!parent) {
      this.setFilter(null); // Null filter will return EMPTY observable, in the data service
    }
    else {
      const filter = new AggregatedLandingFilter();
      this.startDate = parent.startDateTime;
      filter.observedLocationId = parent.id;
      filter.programLabel = this._programLabel;
      filter.locationId = parent.location && parent.location.id;
      filter.startDate = parent.startDateTime;
      filter.endDate = parent.endDateTime || parent.startDateTime.clone().add(this._nbDays, 'day');
      this.setFilter(filter);
    }
  }

  setFilter(filter: AggregatedLandingFilter, opts?: { emitEvent: boolean }) {

    // Don't refilter if actual filter is equal
    if (this.filter && this.filter.equals(filter))
      return;

    super.setFilter(filter, opts);
  }

  getActivities(row: TableElement<AggregatedLanding>, date: Moment): VesselActivity[] {
    const activities = row.currentData?.vesselActivities.filter(activity => activity.date.isSame(date)) || [];
    return isNotEmptyArray(activities) ? activities : undefined;
  }

  trackByFn(index: number, row: TableElement<AggregatedLanding>): number {
    return row.currentData?.vesselSnapshot?.id;
  }

  clickRow(event: MouseEvent | undefined, row: TableElement<AggregatedLanding>): boolean {
    if (event && event.defaultPrevented || this.loading) return false;
    if (!this.mobile) return false;

    this.markAsLoading();
    this.openModal(event, row, this.$currentDate.getValue())
      .then(() => this.markAsLoaded());

  }

  clickCell($event: MouseEvent, row: TableElement<AggregatedLanding>, date: Moment) {
    if ($event) $event.stopPropagation();
    if (this.debug)
      console.debug('clickCell', $event, row.currentData.vesselSnapshot.exteriorMarking + '|' + row.currentData.vesselActivities.length, date.toISOString());

    this.markAsLoading();
    this.openModal($event, row, date)
      .then(() => this.markAsLoaded());
  }

  async openModal(event: MouseEvent | undefined, row: TableElement<AggregatedLanding>, date?: Moment) {
    this.editRow(event, row);
    const modal = await this.modalCtrl.create({
      component: AggregatedLandingModal,
      componentProps: {
        data: row.currentData.clone(),
        options: <AggregatedLandingFormOption>{
          dates: this.$dates.getValue(),
          initialDate: date,
          programLabel: this._programLabel,
          acquisitionLevel: this._acquisitionLevel,
        },
      },
      backdropDismiss: false
    });

    await modal.present();
    const res = await modal.onDidDismiss();

    if (res && res.data) {

      if (res.data.aggregatedLanding) {
        console.debug('[aggregated-landings-table] data to update:', res.data.aggregatedLanding);

        row.currentData.vesselActivities.splice(0, row.currentData.vesselActivities.length, ...res.data.aggregatedLanding.vesselActivities);
        this.markAsDirty();
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

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected updateColumns() {
    if (!this.$dates.getValue()) return;
    this.displayedColumns = this.getDisplayColumns();
    if (!this.loading) this.markForCheck();
  }

  protected getDisplayColumns(): string[] {

    const additionalColumns = [];
    if (this.mobile && this.$currentDate.getValue()) {
      additionalColumns.push(this.$currentDate.getValue().valueOf().toString());
    } else {
      additionalColumns.push(...(this.$dates.getValue()?.map(date => date.valueOf().toString()) || []));
    }

    return RESERVED_START_COLUMNS
      .concat(this.columns)
      .concat(additionalColumns)
      .concat(RESERVED_END_COLUMNS);
  }

  private async refreshDates(dbTimeZone: string) {
    if (!dbTimeZone || isNil(this._startDate) || isNil(this._nbDays)) return;

    // DEBUG
    console.debug(`[aggregated-landings-table] Computing dates... {dbTimeZone: '${dbTimeZone}'}`);

    // Clear startDate hour
    const startDay = DateUtils.resetTime(this._startDate, dbTimeZone);

    const dates: Moment[] = [];
    for (let d = 0; d < this._nbDays; d++) {
      dates[d] = startDay.clone().add(d, 'day');
    }

    // DEBUG
    if (this.debug)
      console.debug(`[aggregated-landings-table] Calendar will use this dates: ${dates.map(d => d.format()).join(', ')}`);

    const today = DateUtils.resetTime(moment(), dbTimeZone);
    this.$currentDate.next(dates.find(date => date.isSame(today) || startDay));

    this.$dates.next(dates);
  }

  private async refreshPmfms() {
    if (isNil(this._programLabel) || isNil(this._acquisitionLevel)) return;

    this.loadingPmfms = true;

    // DEBUG
    if (this.debug) console.debug(`[aggregated-landing-table] Loading pmfms... {program: '${this.programLabel}', acquisitionLevel: '${this._acquisitionLevel}''}̀̀`);

    // Load pmfms
    const pmfms = (await this.programRefService.loadProgramPmfms(
      this._programLabel,
      {
        acquisitionLevel: this._acquisitionLevel,
      })) || [];

    if (!pmfms.length && this.debug) {
      console.debug(`[aggregated-landings-table] No pmfm found (program=${this.programLabel}, acquisitionLevel=${this._acquisitionLevel}). Please fill program's strategies !`);
    }

    this.showLabelForPmfmIds = [PmfmIds.REFUSED_SURVEY];

    // Apply
    this.loadingPmfms = false;
    this.$pmfms.next(pmfms);

  }

}

