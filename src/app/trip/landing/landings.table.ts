import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';

import { AccountService, AppValidatorService, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { LandingService } from './landing.service';
import { BaseMeasurementsTable } from '../../data/measurement/measurements-table.class';
import { AcquisitionLevelCodes, LocationLevelIds } from '@app/referential/services/model/model.enum';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Moment } from 'moment';
import { Trip } from '../trip/trip.model';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { Landing } from './landing.model';
import { LandingEditor } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { LandingFilter } from './landing.filter';
import { LandingValidatorService } from '@app/trip/landing/landing.validator';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';

export const LANDING_RESERVED_START_COLUMNS: string[] = ['vessel', 'vesselType', 'vesselBasePortLocation', 'location', 'dateTime', 'observers', 'creationDate', 'recorderPerson', 'samplesCount'];
export const LANDING_RESERVED_END_COLUMNS: string[] = ['comments'];

export const LANDING_TABLE_DEFAULT_I18N_PREFIX = 'LANDING.TABLE.';
export const LANDING_I18N_PMFM_PREFIX = 'LANDING.PMFM.';

@Component({
  selector: 'app-landings-table',
  templateUrl: 'landings.table.html',
  styleUrls: ['landings.table.scss'],
  providers: [
    {provide: AppValidatorService, useExisting: LandingValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingsTable extends BaseMeasurementsTable<Landing, LandingFilter> implements OnInit, OnDestroy {

  private _parentDateTime;
  private _parentObservers;
  private _detailEditor: LandingEditor;
  private _strategyPmfmId: number;

  protected cd: ChangeDetectorRef;
  protected vesselSnapshotService: VesselSnapshotService;
  protected referentialRefService: ReferentialRefService;
  protected qualitativeValueAttributes: string[];
  protected locationAttributes: string[];
  protected vesselSnapshotAttributes: string[];

  @Output() onOpenTrip = new EventEmitter<TableElement<Landing>>();
  @Output() onNewTrip = new EventEmitter<TableElement<Landing>>();

  @Input() canDelete = true;
  @Input() showFabButton = false;
  @Input() showError = true;
  @Input() showToolbar = true;
  @Input() showPaginator = true;
  @Input() useSticky = true;

  @Input() set strategyPmfmId(value: number) {
    if (this._strategyPmfmId !== value) {
      this._strategyPmfmId = value;
      this.setShowColumn('strategy', isNotNil(this._strategyPmfmId));
    }
  }

  get strategyPmfmId(): number {
    return this._strategyPmfmId;
  }

  @Input() set detailEditor(value: LandingEditor) {
    if (value !== this._detailEditor) {
      this._detailEditor = value;
      // TODO: should be set with another setter, configure from a ProgramProperties option
      this.inlineEdition = value === 'trip';
    }
  }

  get detailEditor(): LandingEditor {
    return this._detailEditor;
  }

  get isTripDetailEditor(): boolean {
    return this._detailEditor === 'trip';
  }

  @Input()
  set showBasePortLocationColumn(value: boolean) {
    this.setShowColumn('vesselBasePortLocation', value);
  }

  get showBasePortLocationColumn(): boolean {
    return this.getShowColumn('vesselBasePortLocation');
  }

  @Input()
  set showObserversColumn(value: boolean) {
    this.setShowColumn('observers', value);
  }

  get showObserversColumn(): boolean {
    return this.getShowColumn('observers');
  }

  @Input()
  set showDateTimeColumn(value: boolean) {
    this.setShowColumn('dateTime', value);
  }

  get showDateTimeColumn(): boolean {
    return this.getShowColumn('dateTime');
  }

  @Input()
  set showIdColumn(value: boolean) {
    this.setShowColumn('id', value);
  }
  get showIdColumn(): boolean {
    return this.getShowColumn('id');
  }

  @Input()
  set showVesselTypeColumn(value: boolean) {
    this.setShowColumn('vesselType', value);
  }

  get showVesselTypeColumn(): boolean {
    return this.getShowColumn('vesselType');
  }

  @Input()
  set showLocationColumn(value: boolean) {
    this.setShowColumn('location', value);
  }

  get showLocationColumn(): boolean {
    return this.getShowColumn('location');
  }

  @Input()
  set showCreationDateColumn(value: boolean) {
    this.setShowColumn('creationDate', value);
  }

  get showCreationDateColumn(): boolean {
    return this.getShowColumn('creationDate');
  }

  @Input()
  set showRecorderPersonColumn(value: boolean) {
    this.setShowColumn('recorderPerson', value);
  }

  get showRecorderPersonColumn(): boolean {
    return this.getShowColumn('recorderPerson');
  }

  @Input()
  set showVesselBasePortLocationColumn(value: boolean) {
    this.setShowColumn('vesselBasePortLocation', value);
  }

  get showVesselBasePortLocationColumn(): boolean {
    return this.getShowColumn('vesselBasePortLocation');
  }

  @Input()
  set showSamplesCountColumn(value: boolean) {
    this.setShowColumn('samplesCount', value);
  }

  get showSamplesCountColumn(): boolean {
    return this.getShowColumn('samplesCount');
  }

  @Input()
  set parent(value: ObservedLocation | Trip | undefined) {
    this.setParent(value);
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService
  ) {
    super(injector,
      Landing, LandingFilter,
      injector.get(LandingService),
      injector.get(AppValidatorService),
      {
        reservedStartColumns: LANDING_RESERVED_START_COLUMNS,
        reservedEndColumns: LANDING_RESERVED_END_COLUMNS,
        mapPmfms: (pmfms) => pmfms.filter(p => p.required),
        requiredStrategy: false,
        i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
        i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX
      });
    this.cd = injector.get(ChangeDetectorRef);

    this.readOnly = false; // Allow deletion
    this.inlineEdition = false;
    this.confirmBeforeDelete = true;
    this.saveBeforeSort = false;
    this.saveBeforeFilter = false;
    this.saveBeforeDelete = false;

    this.autoLoad = false; // waiting parent to be loaded, or the call of onRefresh.next()

    this.vesselSnapshotService = injector.get(VesselSnapshotService);
    this.referentialRefService = injector.get(ReferentialRefService);

    this.defaultPageSize = -1; // Do not use paginator
    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.LANDING;
    this.showObserversColumn = false;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {

    this._enabled = this.canEdit;

    super.ngOnInit();

    // Vessels display attributes
    this.vesselSnapshotAttributes = this.settings.getFieldDisplayAttributes('vesselSnapshot', VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES);

    // Qualitative values display attributes
    this.qualitativeValueAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);

    this.registerAutocompleteField('location', {
      service: this.referentialRefService,
      filter: {
        entityName: 'Location',
        levelId: LocationLevelIds.PORT
      },
      mobile: this.mobile
    });


  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.onOpenTrip.unsubscribe();
    this.onNewTrip.unsubscribe();
  }

  setParent(data: ObservedLocation | Trip | undefined) {
    if (isNil(data?.id)) {
      this._parentDateTime = undefined;
      this.setFilter(LandingFilter.fromObject({}));
    } else if (data instanceof ObservedLocation) {
      this._parentDateTime = data.startDateTime;
      this._parentObservers = data.observers;
      this.setFilter(LandingFilter.fromObject({observedLocationId: data.id}), {emitEvent: true/*refresh*/});
    } else if (data instanceof Trip) {
      this._parentDateTime = data.departureDateTime;
      this.setFilter(LandingFilter.fromObject({tripId: data.id}), {emitEvent: true/*refresh*/});
    }
  }

  async getMaxRankOrderOnVessel(vessel: VesselSnapshot): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows
      .filter(row => vessel.equals(row.currentData.vesselSnapshot))
      .reduce((res, row) => Math.max(res, row.currentData.rankOrderOnVessel || 0), 0);
  }

  async getMaxRankOrder(): Promise<number> {
    // Expose as public (was protected)
    return super.getMaxRankOrder();
  }

  getLandingDate(landing?: Landing): Moment {
    if (!landing || !landing.dateTime) return undefined;

    // return nothing if the landing date equals parent date
    if (this._parentDateTime && landing.dateTime.isSame(this._parentDateTime)) {
      return undefined;
    }

    // default
    return landing.dateTime;
  }

  async addRow(event?: any): Promise<boolean> {

    if (this.isTripDetailEditor) {
      if (!this._enabled) return false;
      if (this.debug) console.debug("[landings-table] Asking for new landing...");

      // Force modal
      return this.openNewRowDetail(event);
    }

    // default behavior
    return super.addRow(event);
  }

  confirmAndEditTrip(event?: MouseEvent, row?: TableElement<Landing>): boolean {
    if (event) event.stopPropagation();

    if (!this.confirmEditCreate(event, row)) {
      return false;
    }

    if (isNotNil(row.currentData.tripId)) {
      // Edit trip
      this.onOpenTrip.emit(row);
    } else {
      // New trip
      this.onNewTrip.emit(row);
    }
  }


  get canCancelOrDeleteSelectedRows(): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
    if (this.accountService.isAdmin()) {
      return true;
    }

    if (this.selection.isEmpty()) return false;

    return this.selection.selected.every(row => this.canCancelOrDelete(row));
  }

  /* -- protected methods -- */

  canCancelOrDelete(row: TableElement<Landing>): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
    if (this.accountService.isAdmin()) {
      return true;
    }

    const personId = this.accountService.person?.id;
    const entity = this.toEntity(row);
    const recorder = entity.recorderPerson;
    if (personId === recorder?.id) {
      return true;
    }

    // When connected user is in observed location observers
    return this._parentObservers?.some(o => o.id === personId) || false;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}

