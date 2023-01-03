import { ChangeDetectionStrategy, Component, Inject, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';

import { BaseMeasurementsTable } from '../measurement/measurements-table.class';
import { createPromiseEventEmitter, IEntitiesService, isNotNil, LoadResult, ReferentialRef, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { IPhysicalGearModalOptions, PhysicalGearModal } from './physical-gear.modal';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from './physicalgear.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PhysicalGearFilter } from './physical-gear.filter';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { environment } from '@environments/environment';
import { BehaviorSubject, merge, Subscription } from 'rxjs';
import { OverlayEventDetail } from '@ionic/core';

export const GEAR_RESERVED_START_COLUMNS: string[] = ['gear'];
export const GEAR_RESERVED_END_COLUMNS: string[] = ['subGearsCount', 'lastUsed', 'comments'];


@Component({
  selector: 'app-physical-gears-table',
  templateUrl: 'physical-gears.table.html',
  styleUrls: ['physical-gears.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearTable extends BaseMeasurementsTable<PhysicalGear, PhysicalGearFilter> implements OnInit, OnDestroy {

  touchedSubject = new BehaviorSubject<boolean>(false);
  filterForm: UntypedFormGroup;
  modalOptions: Partial<IPhysicalGearModalOptions>;

  @Input() canDelete = true;
  @Input() canSelect = true;
  @Input() copyPreviousGears: (event: Event) => Promise<PhysicalGear>;
  @Input() showToolbar = true;
  @Input() useSticky = false;
  @Input() title: string = null;
  @Input() defaultGear: ReferentialRef = null;
  @Input() canEditGear = true;
  @Input() showError = true;
  @Input() showFilter = false;
  @Input() showPmfmDetails = false;
  @Input() compactFields = true;
  @Input() mobile: boolean;
  @Input() minRowCount = 0;

  @Input() set tripId(tripId: number) {
    this.setTripId(tripId);
  }

  get tripId(): number {
    return this.filterForm.get('tripId').value;
  }

  @Input() set showSelectColumn(show: boolean) {
    this.setShowColumn('select', show);
  }

  @Input() set showLastUsedColumn(show: boolean) {
    this.setShowColumn('lastUsed', show);
  }

  @Input() set showGearColumn(show: boolean) {
    this.setShowColumn('gear', show);
  }

  get showGearColumn(): boolean {
    return this.getShowColumn('gear');
  }

  @Input() set allowChildrenGears(value: boolean) {
    this.setModalOption('allowChildrenGears', value);
  }

  get allowChildrenGears(): boolean {
    return this.getModalOption('allowChildrenGears') as boolean;
  }

  @Input() set showSubGearsCountColumn(show: boolean) {
    this.setShowColumn('subGearsCount', show);
  }

  get showSubGearsCountColumn(): boolean {
    return this.getShowColumn('subGearsCount');
  }

  get valid() {
    return super.valid && (this.totalRowCount >= this.minRowCount);
  }

  get invalid() {
    return super.invalid || (this.totalRowCount < this.minRowCount);
  }

  get touched(): boolean {
    return this.touchedSubject.value;
  }

  @Output() openSelectPreviousGearModal = createPromiseEventEmitter<PhysicalGear>();

  markAllAsTouched(opts?: { emitEvent?: boolean }) {
    this.touchedSubject.next(true);
    super.markAllAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.touchedSubject.next(false);
    super.markAsPristine(opts);
  }

  constructor(
    injector: Injector,
    formBuilder: UntypedFormBuilder,
    @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) dataService: IEntitiesService<PhysicalGear, PhysicalGearFilter>
  ) {
    super(injector,
      PhysicalGear, PhysicalGearFilter,
      dataService,
      null, // No validator = no inline edition
      {
        reservedStartColumns: GEAR_RESERVED_START_COLUMNS,
        reservedEndColumns: GEAR_RESERVED_END_COLUMNS,
        mapPmfms: (pmfms) => pmfms.filter(p => p.required)
      });

    this.filterForm = formBuilder.group({
      'tripId': [null],
      'startDate': [null, Validators.compose([Validators.required, SharedValidators.validDate])],
      'endDate': [null, Validators.compose([SharedValidators.validDate, SharedValidators.dateRangeEnd('startDate')])],
    });

    this.defaultSortBy = 'id';
    this.inlineEdition = false;
    this.i18nColumnPrefix = 'TRIP.PHYSICAL_GEAR.TABLE.';
    this.i18nPmfmPrefix = 'TRIP.PHYSICAL_GEAR.PMFM.';
    this.autoLoad = true;
    this.canEdit = true;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;

    // Excluded columns, by default
    this.excludesColumns.push('lastUsed');
    this.excludesColumns.push('subGearsCount');
    this.excludesColumns.push('actions'); // not need, because PMFM columns order change is not supported

    // FOR DEV ONLY ----
    this.logPrefix = '[physical-gears-table] ';
    this.debug = !environment.production;
  }

  ngOnInit() {

    super.ngOnInit();

    this.mobile = toBoolean(this.mobile, this.settings.mobile);
    this._enabled = this.canEdit;

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          // DEBUG
          //tap(json => console.debug("filter changed:", json)),

          filter(() => this.filterForm.valid)
        )
        // Applying the filter
        .subscribe((json) => this.setFilter({
            ...this.filter, // Keep previous filter
            ...json
          },
          {emitEvent: true /*always apply*/}))
    );

    if (this.minRowCount > 0) {
      this.registerSubscription(
        merge(
          this.touchedSubject,
          this.dataSource.rowsSubject
        )
       .pipe(
          debounceTime(100),
          //tap(() => console.debug(this.logPrefix + 'Updating minRowCount error'))
          filter(_ => this.enabled)
        )
        .subscribe(_ => {
          if (this.totalRowCount < this.minRowCount) {
            const error = this.translate.instant((this.minRowCount === 1
              ? 'TRIP.PHYSICAL_GEAR.ERROR.NOT_ENOUGH_SUB_GEAR'
              : 'TRIP.PHYSICAL_GEAR.ERROR.NOT_ENOUGH_SUB_GEARS'),
              {minRowCount: this.minRowCount});
            this.setError(error);
          }
          else {
            this.resetError();
          }
        })
      )
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.openSelectPreviousGearModal.unsubscribe();
  }

  setTripId(tripId: number, opts?: { emitEvent: boolean; }) {
    this.setFilter(<PhysicalGearFilter>{
      ...this.filterForm.value,
      tripId
    }, opts);
  }

  updateView(res: LoadResult<PhysicalGear> | undefined, opts?: { emitEvent?: boolean }): Promise<void> {
    return super.updateView(res, opts);
  }

  setModalOption(key: keyof IPhysicalGearModalOptions, value: IPhysicalGearModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  getModalOption(key: keyof IPhysicalGearModalOptions): IPhysicalGearModalOptions[typeof key] {
    return this.modalOptions[key];
  }

  setFilter(value: Partial<PhysicalGearFilter>, opts?: { emitEvent: boolean }) {

    value = PhysicalGearFilter.fromObject(value);

    // Update the form content
    if (!opts || opts.emitEvent !== false) {
      this.filterForm.patchValue(value.asObject(), {emitEvent: false});
    }

    super.setFilter(value as PhysicalGearFilter, opts);
  }

  /* -- protected function -- */

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onNewRow.observers.length) {
      this.onNewRow.emit();
      return true;
    }

    const { data, role } = await this.openDetailModal();
    if (data && role !== 'delete') {
      if (this.debug) console.debug("Adding new gear:", data);
      await this.addEntityToTable(data, {confirmCreate: false, editing: false});
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<PhysicalGear>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit(row);
      return true;
    }

    // Clone to keep original object unchanged
    const gear = PhysicalGear.fromObject(row.currentData).clone();

    // Convert measurementValues to model, in order to force values of not required PMFM to be converted later, in the modal's form
    gear.measurementValues = MeasurementValuesUtils.asObject(gear.measurementValues, {minify: true});

    const { data, role } = await this.openDetailModal(gear);
    if (data && role !== 'delete') {
      await this.updateEntityToTable(data, row);
    }
    else {
      this.editedRow = null;
    }
    return true;
  }


  async openDetailModal(dataToOpen?: PhysicalGear): Promise<OverlayEventDetail<PhysicalGear | undefined>> {

    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new PhysicalGear();
      await this.onNewEntity(dataToOpen);
    }
    dataToOpen.tripId = this.tripId;

    const subscription = new Subscription();
    const showSearchButton = isNew && this.openSelectPreviousGearModal.observers.length > 0;
    const hasTopModal = !!(await this.modalCtrl.getTop());

    const modal = await this.modalCtrl.create({
      component: PhysicalGearModal,
      componentProps: <IPhysicalGearModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        data: dataToOpen.clone(), // Do a copy, because edition can be cancelled
        isNew,
        tripId: this.tripId,
        canEditGear: this.canEditGear,
        canEditRankOrder: this.canEditRankOrder,
        showSearchButton,
        onAfterModalInit: (modal: PhysicalGearModal) => {
          subscription.add(
            modal.onSearchButtonClick.subscribe(event => this.openSelectPreviousGearModal.emit(event))
          )
        },
        onDelete: (event, data) => this.deleteEntity(event, data),
        mobile: this.mobile,
        i18nSuffix: this.i18nColumnSuffix,
        showGear: this.showGearColumn,
        // Override using given options
        ...this.modalOptions
      },
      cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
      backdropDismiss: false,
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data, role} = await modal.onDidDismiss();

    subscription.unsubscribe();

    if (data && this.debug) console.debug(this.logPrefix + 'Modal result: ', data, role);

    return {data: (data instanceof PhysicalGear) ? data : undefined, role};
  }

  async deleteEntity(event: Event, data: PhysicalGear): Promise<boolean> {
    const row = await this.findRowByEntity(data);

    // Row not exists: OK
    if (!row) return true;

    const confirmed = await this.canDeleteRows([row]);
    if (confirmed) {
      return this.deleteRow(null, row, {interactive: false /*already confirmed*/});
    }
    return confirmed;
  }

  markAsReady(opts?: { emitEvent?: boolean }) {
    super.markAsReady(opts);
  }

  /* -- protected methods -- */

  protected async onNewEntity(data: PhysicalGear): Promise<void> {
    console.debug(this.logPrefix + 'Initializing new row data...');

    await super.onNewEntity(data);

    // Default gear
    if (isNotNil(this.defaultGear)) {
      data.gear = this.defaultGear;
    }

    // Link to parent
    data.tripId = this.tripId;
  }

  protected async findRowByEntity(physicalGear: PhysicalGear): Promise<TableElement<PhysicalGear>> {
    return PhysicalGear && this.dataSource.getRows().find(r => r.currentData.equals(physicalGear));
  }
}


