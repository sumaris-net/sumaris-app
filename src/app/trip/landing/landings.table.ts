import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';

import { AccountService, AppValidatorService, isNil, isNotEmptyArray, isNotNil, JobUtils, Person, toBoolean } from '@sumaris-net/ngx-components';
import { LandingService } from './landing.service';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { AcquisitionLevelCodes, LocationLevelIds, PmfmIds, VesselIds } from '@app/referential/services/model/model.enum';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { Moment } from 'moment';
import { Trip } from '../trip/trip.model';
import { ObservedLocation } from '../observedlocation/observed-location.model';
import { Landing } from './landing.model';
import { LandingEditor, ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { LandingFilter } from './landing.filter';
import { LandingValidatorService } from '@app/trip/landing/landing.validator';
import { VesselSnapshotFilter } from '@app/referential/services/filter/vessel.filter';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ObservedLocationContextService } from '@app/trip/observedlocation/observed-location-context.service';
import { RxState } from '@rx-angular/state';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, Observable, Subscription, tap } from 'rxjs';
import { DataQualityStatusEnum, DataQualityStatusIds, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export const LANDING_RESERVED_START_COLUMNS: string[] = [
  'quality',
  'vessel',
  'vesselType',
  'vesselBasePortLocation',
  'location',
  'dateTime',
  'observers',
  'creationDate',
  'recorderPerson',
  'samplesCount',
];
export const LANDING_RESERVED_END_COLUMNS: string[] = ['comments'];

export const LANDING_TABLE_DEFAULT_I18N_PREFIX = 'LANDING.TABLE.';
export const LANDING_I18N_PMFM_PREFIX = 'LANDING.PMFM.';

class LandingDivider extends Landing {}

@Component({
  selector: 'app-landings-table',
  templateUrl: 'landings.table.html',
  styleUrls: ['landings.table.scss'],
  providers: [{ provide: AppValidatorService, useExisting: LandingValidatorService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingsTable extends BaseMeasurementsTable<Landing, LandingFilter> implements OnInit, OnDestroy {
  private _parentDateTime: Moment;
  private _parentObservers: Person[];
  private _detailEditor: LandingEditor;
  private _footerRowsSubscription: Subscription;

  protected vesselSnapshotService: VesselSnapshotService;
  protected referentialRefService: ReferentialRefService;
  protected qualitativeValueAttributes: string[];
  protected vesselSnapshotAttributes: string[];

  protected footerColumns: string[] = [];
  protected showObservedCount: boolean;
  @RxStateSelect() protected readonly observedCount$: Observable<number>;
  @RxStateProperty() protected observedCount: number;
  minObservedSpeciesCount: number;
  maxObservedSpeciesCount: number;

  unknownVesselId = VesselIds.UNKNOWN;

  showRowError = false;
  errorDetails: any;

  statusList = DataQualityStatusList.filter((s) => s.id !== DataQualityStatusIds.VALIDATED);
  statusById = DataQualityStatusEnum;
  readonly filterForm: UntypedFormGroup = this.formBuilder.group({
    observedLocationId: [null],
    dataQualityStatus: [null],
  });

  @Output() openTrip = new EventEmitter<TableElement<Landing>>();
  @Output() newTrip = new EventEmitter<TableElement<Landing>>();
  @Output() openSale = new EventEmitter<TableElement<Landing>>();
  @Output() newSale = new EventEmitter<TableElement<Landing>>();

  @Input() canDelete = true;
  @Input() showFabButton = false;
  @Input() includedPmfmIds: number[] = null;
  @Input() useFooterSticky = true;

  @Input() set detailEditor(value: LandingEditor) {
    if (value !== this._detailEditor) {
      this._detailEditor = value;
      // TODO: should be set with another setter, configure from a ProgramProperties option
      this.inlineEdition = value === 'trip' || value === 'sale';
    }
  }

  get detailEditor(): LandingEditor {
    return this._detailEditor;
  }

  get isTripDetailEditor(): boolean {
    return this._detailEditor === 'trip';
  }

  get isSaleDetailEditor(): boolean {
    return this._detailEditor === 'sale';
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

  get showQualityColumn(): boolean {
    return this.getShowColumn('quality');
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    protected context: ObservedLocationContextService
  ) {
    super(injector, Landing, LandingFilter, injector.get(LandingService), injector.get(AppValidatorService), {
      reservedStartColumns: LANDING_RESERVED_START_COLUMNS,
      reservedEndColumns: LANDING_RESERVED_END_COLUMNS,
      mapPmfms: (pmfms) => this.mapPmfms(pmfms),
      i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
      i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX,
      initialState: {
        requiredStrategy: true,
        requiredGear: false,
        acquisitionLevel: AcquisitionLevelCodes.LANDING,
      },
      watchAllOptions: {
        mapFn: (landings) => this.mapLandings(landings),
      },
    });

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
    this.showObserversColumn = false;

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
    this.logPrefix = '[landings-table] ';
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
        levelId: LocationLevelIds.PORT,
      },
      mobile: this.mobile,
    });

    this.registerSubscription(
      this.pmfms$
        .pipe(
          filter(isNotEmptyArray),
          distinctUntilChanged(),
          tap((pmfms) => this.onPmfmsLoaded(pmfms))
        )
        .pipe(debounceTime(250))
        .subscribe()
    );

    // Add footer listener
    this.registerSubscription(this.pmfms$.subscribe((pmfms) => this.addFooterListener(pmfms)));
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.openTrip.unsubscribe();
    this.newTrip.unsubscribe();
    this.openSale.unsubscribe();
  }

  // Change visibility to public
  setError(error: string, opts?: { emitEvent?: boolean; showOnlyInvalidRows?: boolean; errorDetails?: any }) {
    super.setError(error, opts);
    this.errorDetails = opts?.errorDetails;

    // If error
    if (error) {
      // Add filter on invalid rows (= not controlled)
      if (!opts || opts.showOnlyInvalidRows !== false) {
        this.showRowError = true;
        const filter = this.filter || new LandingFilter();
        filter.dataQualityStatus = 'MODIFIED'; // = not controlled landings
        this.setFilter(filter);
      }
    }
    // No errors
    else {
      // Remove filter on invalid rows
      if (!opts || opts.showOnlyInvalidRows !== true) {
        this.showRowError = false;
      }
    }
  }

  // Change visibility to public
  resetError(opts?: { emitEvent?: boolean; showOnlyInvalidRows?: boolean }) {
    this.setError(undefined, opts);
  }

  protected onPmfmsLoaded(pmfms: IPmfm[]) {
    if (this.isSaleDetailEditor) {
      if (this.inlineEdition) {
        const pmfmIds = pmfms.map((p) => p.id).filter(isNotNil);
        // Listening on column 'IS_OBSERVED' value changes, to enable/disable column 'NON_OBSERVATION_REASON''
        const hasIsObservedAndReasonPmfms = pmfmIds.includes(PmfmIds.IS_OBSERVED) && pmfmIds.includes(PmfmIds.NON_OBSERVATION_REASON);
        if (hasIsObservedAndReasonPmfms) {
          this.registerSubscription(
            this.registerCellValueChanges('isObserved', `measurementValues.${PmfmIds.IS_OBSERVED}`, true).subscribe((isObservedValue) => {
              if (!this.editedRow) return; // Should never occur
              const row = this.editedRow;
              const controls = (row.validator.get('measurementValues') as UntypedFormGroup).controls;
              if (!isObservedValue) {
                if (row.validator.enabled) controls[PmfmIds.NON_OBSERVATION_REASON].enable();
                controls[PmfmIds.NON_OBSERVATION_REASON].setValidators(Validators.required);
                controls[PmfmIds.NON_OBSERVATION_REASON].updateValueAndValidity();
              } else {
                controls[PmfmIds.NON_OBSERVATION_REASON].disable();
                controls[PmfmIds.NON_OBSERVATION_REASON].setValue(null);
                controls[PmfmIds.NON_OBSERVATION_REASON].setValidators(null);
              }
            })
          );
        }
      }
    }
  }

  mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    const includedPmfmIds = this.includedPmfmIds || this.context.program?.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);
    // Keep selectivity device, if any
    return pmfms.filter((p) => p.required || includedPmfmIds?.includes(p.id));
  }

  setParent(parent: ObservedLocation | Trip | undefined) {
    if (isNil(parent?.id)) {
      this._parentDateTime = undefined;
      this.setFilter(LandingFilter.fromObject({}));
    } else if (parent instanceof ObservedLocation) {
      this._parentDateTime = parent.startDateTime;
      this._parentObservers = parent.observers;
      this.context.observedLocation = parent;
      this.setFilter(LandingFilter.fromObject({ observedLocationId: parent.id }), { emitEvent: true /*refresh*/ });
    } else if (parent instanceof Trip) {
      this._parentDateTime = parent.departureDateTime;
      this.context.trip = parent;
      this.setFilter(LandingFilter.fromObject({ tripId: parent.id }), { emitEvent: true /*refresh*/ });
    }
  }

  async getMaxRankOrderOnVessel(vessel: VesselSnapshot): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows
      .filter((row) => vessel.equals(row.currentData.vesselSnapshot))
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
      if (this.debug) console.debug('[landings-table] Asking for new landing...');

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
      this.openTrip.emit(row);
    } else {
      // New trip
      this.newTrip.emit(row);
    }
  }

  confirmAndEditSale(event?: MouseEvent, row?: TableElement<Landing>): boolean {
    if (event) event.stopPropagation();

    if (!this.confirmEditCreate(event, row)) {
      return false;
    }

    const saleIds = row.currentData.saleIds;
    if (isNotNil(saleIds) && saleIds.length === 1) {
      // Edit sale
      this.openSale.emit(row);
    } else {
      // New sale
      this.newSale.emit(row);
    }
  }

  get canCancelOrDeleteSelectedRows(): boolean {
    // IMAGINE-632: User can only delete landings or samples created by himself or on which he is defined as observer
    if (this.accountService.isAdmin()) {
      return true;
    }

    if (this.selection.isEmpty()) return false;

    return this.selection.selected.every((row) => this.canCancelOrDelete(row));
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
    return this._parentObservers?.some((o) => o.id === personId) || false;
  }

  resetFilter(value?: any, opts?: { emitEvent: boolean }) {
    super.resetFilter(<LandingFilter>{ ...value, observedLocationId: this.context.observedLocation.id }, opts);
    this.resetError();
  }

  clearFilterValue(key: keyof LandingFilter, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.filterForm.get(key).reset(null);
  }

  protected addFooterListener(pmfms: IPmfm[]) {
    this.showObservedCount = this.isSaleDetailEditor && !!(pmfms && pmfms.find((pmfm) => pmfm.id === PmfmIds.IS_OBSERVED));

    // Should display observed count: add column to footer
    if (this.showObservedCount && !this.footerColumns.includes('footer-observedCount')) {
      this.footerColumns = [...this.footerColumns, 'footer-observedCount'];
    }
    // If observed count not displayed
    else if (!this.showObservedCount) {
      // Remove from footer columns
      this.footerColumns = this.footerColumns.filter((column) => column !== 'footer-observedCount');

      // Reset counter
      this.observedCount = 0;
    }

    this.showFooter = this.footerColumns.length > 0;

    // DEBUG
    console.debug('[landings-table] Show footer ?', this.showFooter);

    // Remove previous rows listener
    if (!this.showFooter && this._footerRowsSubscription) {
      this.unregisterSubscription(this._footerRowsSubscription);
      this._footerRowsSubscription.unsubscribe();
      this._footerRowsSubscription = null;
    } else if (this.showFooter && !this._footerRowsSubscription) {
      this._footerRowsSubscription = this.dataSource
        .connect(null)
        .pipe(
          debounceTime(500),
          filter((_) => !this.filterCriteriaCount) // Only if no filter criteria
        )
        .subscribe((rows) => this.updateFooter(rows));
    }
  }

  protected updateFooter(rows: TableElement<Landing>[] | readonly TableElement<Landing>[]) {
    // Update observed count
    this.observedCount = (rows || []).map((row) => toBoolean(row.currentData.measurementValues[PmfmIds.IS_OBSERVED])).filter((val) => !!val).length;
  }

  isDivider(index: number, item: TableElement<Landing>): boolean {
    console.log('isDivider', index, typeof item.currentData);
    return !item.currentData.id;
    // TODO JVF: return item.currentData instanceof LandingDivider;
  }

  isLanding(index: number, item: TableElement<Landing>): boolean {
    console.log('isLanding', index, typeof item.currentData);
    return !!item.currentData.id;
    // TODO JVF: return !(item.currentData instanceof LandingDivider);
  }

  protected mapLandings(data: Landing[]): Landing[] {
    // Split landings with pets from others
    if (this.isSaleDetailEditor) {
      const landingsWithPets = [];
      const landingsWithoutPets = data.reduce((acc, landing) => {
        if (toBoolean(landing.measurementValues[PmfmIds.IS_PETS])) {
          landingsWithPets.push(landing);
        } else {
          acc.push(landing);
        }
        return acc;
      }, []);

      if (landingsWithPets.length > 0) {
        landingsWithoutPets.push(new LandingDivider(), ...landingsWithPets);
      }

      return landingsWithoutPets;
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
