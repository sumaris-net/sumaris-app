import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';

import {
  AccountService,
  AppValidatorService,
  DateUtils,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LoadResult,
  ObjectMap,
  Person,
  ReferentialRef,
  ReferentialUtils,
  removeDuplicatesFromArray,
  toBoolean,
  toNumber,
  UsageMode,
} from '@sumaris-net/ngx-components';
import { LandingService, LandingServiceWatchOptions } from './landing.service';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import {
  AcquisitionLevelCodes,
  LocationLevelIds,
  PmfmIds,
  QualitativeValueIds,
  StrategyTaxonPriorityLevels,
} from '@app/referential/services/model/model.enum';
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
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, Observable, Subscription, tap } from 'rxjs';
import { DataQualityStatusEnum, DataQualityStatusIds, DataQualityStatusList } from '@app/data/services/model/model.utils';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { first } from 'rxjs/operators';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';

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

@Component({
  selector: 'app-landings-table',
  templateUrl: 'landings.table.html',
  styleUrls: ['landings.table.scss'],
  providers: [{ provide: AppValidatorService, useExisting: LandingValidatorService }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingsTable extends BaseMeasurementsTable<Landing, LandingFilter> implements OnInit, OnDestroy {
  readonly pmfmIdsMap = PmfmIds;

  /** Offset to apply to SPECIES_LIST_ORIGIN.RANDOM landings (sale editor). */
  static readonly RANDOM_LANDINGS_RANK_ORDER_OFFSET = 100;
  readonly randomLandingsRankOrderOffset = LandingsTable.RANDOM_LANDINGS_RANK_ORDER_OFFSET;

  private _parentDateTime: Moment;
  private _parentObservers: Person[];
  private _footerRowsSubscription: Subscription;
  private _rowSubscription: Subscription;

  protected _detailEditor: LandingEditor;
  protected vesselSnapshotService: VesselSnapshotService;
  protected referentialRefService: ReferentialRefService;
  protected qualitativeValueAttributes: string[];
  protected vesselSnapshotAttributes: string[];

  protected footerColumns: string[] = [];
  protected showObservedCount: boolean;
  @RxStateSelect() protected readonly observedCount$: Observable<number>;
  @RxStateProperty() protected observedCount: number;
  protected showRowError = false;
  protected errorDetails: any;
  protected dividerPmfm: IPmfm;
  protected includedQualitativeValuesMap: ObjectMap<number[]> = {};

  protected statusList = DataQualityStatusList.filter((s) => s.id !== DataQualityStatusIds.VALIDATED);
  protected statusById = DataQualityStatusEnum;
  protected readonly isRowNotSelectable = (item: TableElement<Landing>): boolean => {
    return this.isSaleDetailEditor && !this.isLandingPets(item);
  };
  protected readonly isRowSelectable = (item: TableElement<Landing>): boolean => {
    return this.isSaleDetailEditor && this.isLandingPets(item);
  };

  readonly filterForm: UntypedFormGroup = this.formBuilder.group({
    observedLocationId: [null],
    dataQualityStatus: [null],
  });

  @Output() openTrip = new EventEmitter<TableElement<Landing>>();
  @Output() newTrip = new EventEmitter<TableElement<Landing>>();
  @Output() openSale = new EventEmitter<TableElement<Landing>>();
  @Output() newSale = new EventEmitter<TableElement<Landing>>();

  @Input() canDelete = true;
  @Input() canAdd = true;
  @Input() canAddOnUnknownVessel = false;
  @Input() showFabButton = false;
  @Input() showCancelRowButton = false;
  @Input() showConfirmRowButton = false;
  @Input() showAutoFillButton = false;
  @Input() includedPmfmIds: number[] = null;
  @Input() useFooterSticky = true;
  @Input() usageMode: UsageMode;
  @Input() minObservedSpeciesCount: number;
  @Input() unknownVesselId: number;

  @Input() set detailEditor(value: LandingEditor) {
    if (value !== this._detailEditor) {
      this._detailEditor = value;
      // TODO: should be set with another setter, configure from a ProgramProperties option
      this.inlineEdition = value === 'trip' || value === 'sale';
    }
  }

  @Input() dividerPmfmId: number;

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

  get parent(): ObservedLocation | Trip | undefined {
    return this.context.observedLocation || this.context.trip;
  }

  get showQualityColumn(): boolean {
    return this.getShowColumn('quality');
  }

  get filterDataQualityControl(): UntypedFormControl {
    return this.filterForm.controls.dataQualityStatus as UntypedFormControl;
  }

  @Input()
  set showTaxonGroupColumn(value: boolean) {
    this.setShowColumn(PmfmIds.TAXON_GROUP_ID.toString(), value);
  }

  get showTaxonGroupColumn(): boolean {
    return this.getShowColumn(PmfmIds.TAXON_GROUP_ID.toString());
  }

  get isOnFieldMode() {
    return this.usageMode === 'FIELD';
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
      onPrepareRowForm: (form) => this.onPrepareRowForm(form),
      i18nColumnPrefix: LANDING_TABLE_DEFAULT_I18N_PREFIX,
      i18nPmfmPrefix: LANDING_I18N_PMFM_PREFIX,
      initialState: {
        requiredStrategy: true,
        requiredGear: false,
        acquisitionLevel: AcquisitionLevelCodes.LANDING,
      },
      watchAllOptions: <LandingServiceWatchOptions>{
        mapResult: (res: LoadResult<Landing>) => this.mapLandings(res),
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
    if (this.inlineEdition && this.isSaleDetailEditor) {
      const pmfmIds = pmfms.map((p) => p.id).filter(isNotNil);
      // Listening on column 'IS_OBSERVED' value changes, to enable/disable column 'NON_OBSERVATION_REASON''
      const hasIsObservedAndReasonPmfms = pmfmIds.includes(PmfmIds.IS_OBSERVED) && pmfmIds.includes(PmfmIds.NON_OBSERVATION_REASON);
      if (hasIsObservedAndReasonPmfms) {
        this.registerSubscription(
          this.registerCellValueChanges('isObserved', `measurementValues.${PmfmIds.IS_OBSERVED}`, true).subscribe((isObservedValue) => {
            if (!this.editedRow) return; // Should never occur

            const row = this.editedRow;
            this.validatorService.updateFormGroup(row.validator, { pmfms });

            if (row.validator.dirty) this.markAsDirty();
          })
        );
      }
    }
  }

  async mapPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {
    const includedPmfmIds = this.includedPmfmIds || this.context.program?.getPropertyAsNumbers(ProgramProperties.LANDING_COLUMNS_PMFM_IDS);

    const hasTaxonGroupId = pmfms.some((pmfm) => pmfm.id === PmfmIds.TAXON_GROUP_ID);
    // Load taxon groups
    let taxonGroups: ReferentialRef[] = [];
    if (hasTaxonGroupId && isNotEmptyArray(this.context.strategy?.taxonGroups)) {
      const taxonGroupIds = this.context.strategy.taxonGroups
        .map((tg) => tg.taxonGroup.id).filter(isNotNil);
      taxonGroups = await this.referentialRefService.loadAllByIds(
        taxonGroupIds,
        'TaxonGroup'
      );

      // Disable taxon group that are selected randomly
      const disableRandomTaxonGroups = this.dividerPmfmId === PmfmIds.SPECIES_LIST_ORIGIN && pmfms.some((pmfm) => pmfm.id === PmfmIds.SPECIES_LIST_ORIGIN);
      if (disableRandomTaxonGroups) {
        const randomTaxonGroupIds = this.context.strategy.taxonGroups.filter(tg => tg.priorityLevel > StrategyTaxonPriorityLevels.ABSOLUTE);
        taxonGroups = taxonGroups.map(tg => {
          if (randomTaxonGroupIds.includes(tg.id)) {
            tg = tg.clone();
            tg.statusId = StatusIds.DISABLE;
          }
          return tg
        });
      }
    }

    // Reset divider (will be set below)
    this.dividerPmfm = null;

    return (
      pmfms
        // Keep required pmfms, and included (forced) pmfms
        .filter((p) => p.required || includedPmfmIds?.includes(p.id))
        .map((pmfm) => {
          // Hide the pmfm use for divider
          if (pmfm.id === this.dividerPmfmId) {
            pmfm = pmfm.clone();
            pmfm.hidden = true;

            // Remember the divider pmfm (will be used later)
            this.dividerPmfm = pmfm;
          }
          // Taxon group id
          else if (pmfm.id === PmfmIds.TAXON_GROUP_ID) {
            pmfm = pmfm.clone();
            pmfm.type = 'qualitative_value';
            pmfm.qualitativeValues = taxonGroups;
          }
          return pmfm;
        })
    );
  }

  onPrepareRowForm(form: UntypedFormGroup) {
    // Update measurement form
    if (this.isSaleDetailEditor) {
      this.validatorService.updateFormGroup(form, { pmfms: this.pmfms });
    }

    // Mark as dirty if row changes
    if (!this.showConfirmRowButton && this.canEdit && !this.dirty) {
      this._rowSubscription?.unsubscribe();
      const subscription = form.valueChanges
        .pipe(
          filter(() => form.dirty),
          first()
        )
        .subscribe(() => this.markAsDirty());
      subscription.add(() => this.unregisterSubscription(subscription));
      this.registerSubscription(subscription);
      this._rowSubscription = subscription;
    }
  }

  protected async onNewEntity(data: Landing): Promise<void> {
    console.debug(`${this.logPrefix}Initializing new row data...`);

    await super.onNewEntity(data);

    // Fill vessel
    if (isNil(data.vesselSnapshot?.id) && isNotNil(this.unknownVesselId)) {
      data.vesselSnapshot = VesselSnapshot.fromObject({
        id: this.unknownVesselId,
        name: this.translate.instant('LANDING.TABLE.UNKNOWN_VESSEL_NAME'),
      });
    }

    data.measurementValues = data.measurementValues || {};

    // Set divider value
    if (isNotNil(this.dividerPmfm) && isNil(data.measurementValues[this.dividerPmfmId])) {
      const defaultValueId = isNotNil(this.dividerPmfm.defaultValue) ? this.dividerPmfm.defaultValue : QualitativeValueIds.SPECIES_LIST_ORIGIN.PETS;
      data.measurementValues[this.dividerPmfmId] = this.dividerPmfm.qualitativeValues?.find((qv) => PmfmValueUtils.equals(qv.id, defaultValueId));
    }

    // Set IS_OBSERVED value
    // - use default value if exists,
    // - or 'true' if PETS ,
    // - or 'false' otherwise
    const isObservedPmfm = this.pmfms?.find((p) => p.id === PmfmIds.IS_OBSERVED);
    if (isObservedPmfm && isNil(data.measurementValues[PmfmIds.IS_OBSERVED])) {
      data.measurementValues[PmfmIds.IS_OBSERVED] = isNotNil(isObservedPmfm.defaultValue)
        ? isObservedPmfm.defaultValue
        : PmfmValueUtils.equals(data.measurementValues[PmfmIds.SPECIES_LIST_ORIGIN], QualitativeValueIds.SPECIES_LIST_ORIGIN.PETS);
    }

    const parent = this.parent || this.context.observedLocation || this.context.trip;

    // Fill program
    if (isNil(data.program)) {
      data.program = this.context.program || parent.program;
    }

    // Inherited values from parent
    if (parent instanceof Trip) {
      if (isNil(data.dateTime) && !this.showDateTimeColumn) {
        data.dateTime = data.dateTime || (this.isOnFieldMode ? DateUtils.moment() : parent.returnDateTime || parent.departureDateTime);
      }
      if (isNil(data.location) && !this.showLocationColumn) {
        data.location = data.location || parent.returnLocation || parent.departureLocation;
      }
      if (isNil(data.tripId)) {
        data.tripId = parent.id;
      }
    } else if (parent instanceof ObservedLocation) {
      if (isNil(data.dateTime) && !this.showDateTimeColumn) {
        data.dateTime = data.dateTime || (this.isOnFieldMode ? DateUtils.moment() : parent.startDateTime);
      }
      if (isNil(data.location) && !this.showLocationColumn) {
        data.location = data.location || parent.location;
      }
      if (isNil(data.observedLocationId)) {
        data.observedLocationId = parent.id;
      }
    }
  }

  setParent(parent: ObservedLocation | Trip | undefined) {
    console.debug(`${this.logPrefix}setParent()`, parent);
    if (isNil(parent?.id)) {
      this._parentDateTime = undefined;
      this.context.trip = undefined;
      this.context.observedLocation = undefined;
      this.setFilter(LandingFilter.fromObject({}));
    } else if (parent instanceof ObservedLocation) {
      this._parentDateTime = parent.startDateTime;
      this._parentObservers = parent.observers;
      this.context.trip = null;
      this.context.observedLocation = parent;
      this.setFilter(LandingFilter.fromObject({ observedLocationId: parent.id }), { emitEvent: true /*refresh*/ });
    } else if (parent instanceof Trip) {
      this._parentDateTime = parent.departureDateTime;
      this.context.observedLocation = null;
      this.context.trip = parent;
      this.setFilter(LandingFilter.fromObject({ tripId: parent.id }), { emitEvent: true /*refresh*/ });
    }
  }

  toggleSelectRow(event, row) {
    if (this.isSaleDetailEditor) {
      event.stopPropagation();
      if (this.isLandingPets(row)) {
        this.selection.toggle(row);
      }
    } else {
      super.toggleSelectRow(event, row);
    }
  }

  async masterToggle() {
    if (this.isSaleDetailEditor) {
      if (this.loading) return;
      if (this.isAllSelected()) {
        this.selection.clear();
      } else {
        const rows = this._dataSource.getRows().filter((row) => this.isLandingPets(row)); // Filter PETS
        this.selection.setSelection(...rows);
      }
    } else {
      await super.masterToggle();
    }
  }

  isAllSelected() {
    if (this.isSaleDetailEditor) {
      return (
        this.selection.selected.length === this.dataSource.getRows().filter((row) => this.isLandingPets(row)).length // Filter PETS
      );
    }
    return super.isAllSelected();
  }

  async getMaxRankOrderOnVessel(vessel: VesselSnapshot): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows
      .filter((row) => vessel.equals(row.currentData.vesselSnapshot))
      .reduce((res, row) => Math.max(res, row.currentData.rankOrderOnVessel || 0), 0);
  }

  async getMaxRankOrder(): Promise<number> {
    // Expose as public (was protected)

    if (this.isSaleDetailEditor) {
      // Max on PETS species only
      const rows = this.dataSource.getRows().filter((row) => this.isLandingPets(row)) || [];
      return Math.max(0, ...rows.map((row) => row.currentData.rankOrder || 0));
    }

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
    } else if (this.isSaleDetailEditor) {
      // Insert row after the last PETS landing
      const rows = this.dataSource.getRows();
      const lastPETSLanding = [...rows].reverse().find((row) => this.isLandingPets(row));
      const insertAt = lastPETSLanding ? rows.lastIndexOf(lastPETSLanding) + 1 : null;
      return super.addRow(event, insertAt);
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
    console.debug(`${this.logPrefix}Show footer ?`, this.showFooter);

    // Remove previous rows listener
    if (!this.showFooter) {
      this._footerRowsSubscription?.unsubscribe();
      this._footerRowsSubscription = null;
    }
    // Create footer subscription
    else if (!this._footerRowsSubscription) {
      const footerRowsSubscription = this.dataSource
        .connect(null)
        .pipe(
          debounceTime(500),
          filter((_) => !this.filterCriteriaCount) // Only if no filter criteria
        )
        .subscribe((rows) => this.updateFooter(rows));
      footerRowsSubscription.add(() => this.unregisterSubscription(footerRowsSubscription));
      this._footerRowsSubscription = footerRowsSubscription;
    }
  }

  async autoFillTable(): Promise<boolean> {
    console.debug(`${this.logPrefix}autoFillTable()`);

    const confirmed = await this.confirmEditCreate();
    if (!confirmed) return false; // Cannot add if some row are still editing

    const parent = this.parent;
    if (this.showTaxonGroupColumn && parent instanceof ObservedLocation) {
      // Get available taxon groups
      const availableTaxonGroups = (await this.programRefService.loadTaxonGroups(this.programLabel, { strategyId: this.strategyId }))
        // Exclude the absolute priority (e.g. =PETS in SIH-OBSVENTE)
        .filter((tg) => tg.priority !== StrategyTaxonPriorityLevels.ABSOLUTE);

      const data = this.dataSource.getData().filter(DataEntityUtils.isNotDivider);
      const existingTaxonGroups = removeDuplicatesFromArray(
        data.map((landing) => landing.measurementValues[PmfmIds.TAXON_GROUP_ID]).filter(isNotNil),
        'id'
      )
        .map((taxonGroup) => availableTaxonGroups.find((tg) => ReferentialUtils.equals(tg, taxonGroup)))
        .filter(isNotNil);

      const taxonGroupsToAdd = availableTaxonGroups
        // Exclude if already exists
        .filter((taxonGroup) => !existingTaxonGroups.some((tg) => ReferentialUtils.equals(tg, taxonGroup)));

      // DEBUG
      console.debug(`${this.logPrefix}autoFillTable() existingTaxonGroups`, existingTaxonGroups);
      console.debug(`${this.logPrefix}autoFillTable() taxonGroupsToAdd`, taxonGroupsToAdd);

      // Create useful functions
      let rankOrder = (await this.getMaxRankOrder()) + 1;
      const isRandomTaxon = (taxonNameOrGroup: TaxonGroupRef | TaxonNameRef) => {
        return taxonNameOrGroup?.priority !== StrategyTaxonPriorityLevels.ABSOLUTE;
      };
      const nextRankOrder = (taxonNameOrGroup: TaxonGroupRef | TaxonNameRef) => {
        return isRandomTaxon(taxonNameOrGroup)
          ? // Random species
            LandingsTable.RANDOM_LANDINGS_RANK_ORDER_OFFSET + (taxonNameOrGroup.priority - StrategyTaxonPriorityLevels.ABSOLUTE)
          : rankOrder++;
      };
      let dirty = false;

      if (isNotEmptyArray(existingTaxonGroups)) {
        for (const taxonGroup of existingTaxonGroups) {
          if (isRandomTaxon(taxonGroup)) {
            const rankOrder = nextRankOrder(taxonGroup);
            const existingLandings = data.filter((landing) =>
              PmfmValueUtils.equals(taxonGroup.id, landing.measurementValues[PmfmIds.TAXON_GROUP_ID])
            );

            for (const entity of existingLandings) {
              if (entity.rankOrder !== rankOrder) {
                entity.rankOrder = rankOrder;
                await this.addOrUpdateEntityToTable(entity, { confirmEditCreate: true, editing: false });
                // Mark as dirty
                dirty = true;
              }
            }
          }
        }
      }

      // Insert taxon groups that not exists yet
      if (isNotEmptyArray(taxonGroupsToAdd)) {
        const entities = [];
        for (const taxonGroup of taxonGroupsToAdd) {
          const entity = new Landing();

          // Set rankOrder
          entity.rankOrder = nextRankOrder(taxonGroup);

          entity.measurementValues = entity.measurementValues || {};

          // Set taxon group
          entity.measurementValues[PmfmIds.TAXON_GROUP_ID] = taxonGroup;

          // Set divider
          if (this.dividerPmfmId === PmfmIds.SPECIES_LIST_ORIGIN && taxonGroup.priority > StrategyTaxonPriorityLevels.ABSOLUTE) {
            entity.measurementValues[this.dividerPmfmId] = QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM.toString();
          }

          // Initialize entity
          await this.onNewEntity(entity);

          entities.push(entity);
        }

        await this.addEntitiesToTable(entities, { emitEvent: false });
        dirty = true;
      }

      // Mark as dirty
      if (dirty) {
        this.markAsLoading();
        await this.save({ keepEditing: false });
        this.emitRefresh();
        this.markAsDirty({ emitEvent: false /* done in markAsLoaded() */ });
      }
    }

    return true;
  }

  protected updateFooter(rows: TableElement<Landing>[] | readonly TableElement<Landing>[]) {
    // Update observed count
    this.observedCount = (rows || [])
      // Exclude divider rows
      .filter((row) => DataEntityUtils.isNotDivider(row.currentData))
      .map((row) => row.currentData.measurementValues)
      // Keep random selected species
      .filter(
        (measurementValues) =>
          isNil(this.dividerPmfmId) ||
          MeasurementValuesUtils.hasPmfmValue(measurementValues, this.dividerPmfmId, QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM)
      )
      .filter((measurementValues) => toBoolean(measurementValues[PmfmIds.IS_OBSERVED], true)).length;
  }

  isDivider(index: number, item: TableElement<Landing>): boolean {
    return item.currentData.__typename === 'divider';
  }

  isLanding(index: number, item: TableElement<Landing>): boolean {
    return item.currentData.__typename !== 'divider';
  }

  private isLandingPets(row: TableElement<Landing>): boolean {
    return MeasurementValuesUtils.hasPmfmValue(row.currentData.measurementValues, this.dividerPmfmId, QualitativeValueIds.SPECIES_LIST_ORIGIN.PETS);
  }

  trackByFn(index: number, row: TableElement<Landing>): number {
    return toNumber(row.currentData.id, -1 * row.id);
  }

  protected mapLandings(res: LoadResult<Landing>): LoadResult<Landing> {
    if (isNil(this.dividerPmfmId) || !res?.total) return res;

    // Get distinct pmfm values
    const dividerValues =
      this.dividerPmfm?.qualitativeValues ||
      removeDuplicatesFromArray(res.data.map((landing) => landing.measurementValues?.[this.dividerPmfmId]).filter(isNotNil));

    // Make sure to put random value at the end (if present)
    if (this.dividerPmfmId === PmfmIds.SPECIES_LIST_ORIGIN) {
      const randomValueIndex = dividerValues.findIndex((qv) => PmfmValueUtils.equals(qv, QualitativeValueIds.SPECIES_LIST_ORIGIN.RANDOM));
      if (randomValueIndex !== -1) {
        const randomValue = dividerValues.splice(randomValueIndex, 1)[0];
        dividerValues.push(randomValue);
      }
    }

    // Concat each divider and landings
    const entities = dividerValues.reduce((acc, dividerValue) => {
      const divider = Landing.fromObject({
        measurementValues: { [this.dividerPmfmId]: dividerValue },
      });
      DataEntityUtils.markAsDivider(divider);
      const landings = res.data.filter((landing: Landing) => PmfmValueUtils.equals(landing.measurementValues[this.dividerPmfmId], dividerValue));
      if (isEmptyArray(landings)) {
        acc.concat(divider);
      }
      return acc.concat([divider, ...landings]);
    }, []);

    return { data: entities, total: res.total };
  }

  updateQualitativeValues() {
    // Only PETS species for taxon group selection
    this.includedQualitativeValuesMap = {};
    this.includedQualitativeValuesMap[PmfmIds.TAXON_GROUP_ID] = this.context.strategy.taxonGroups
      .filter((tg) => tg.priorityLevel === StrategyTaxonPriorityLevels.ABSOLUTE)
      .map((tg) => tg.taxonGroup.id);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
