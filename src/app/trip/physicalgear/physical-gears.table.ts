import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';

import { AppMeasurementsTable } from '../measurement/measurements.table.class';
import { createPromiseEventEmitter, IEntitiesService, InMemoryEntitiesService, isNotNil, ReferentialRef, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { IPhysicalGearModalOptions, PhysicalGearModal } from './physical-gear.modal';
import { PHYSICAL_GEAR_DATA_SERVICE_TOKEN } from './physicalgear.service';
import { AcquisitionLevelCodes } from '../../referential/services/model/model.enum';
import { PhysicalGearFilter } from './physical-gear.filter';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { debounceTime, filter } from 'rxjs/operators';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';

export const GEAR_RESERVED_START_COLUMNS: string[] = ['gear'];
export const GEAR_RESERVED_END_COLUMNS: string[] = ['lastUsed', 'comments'];


@Component({
  selector: 'app-physical-gears-table',
  templateUrl: 'physical-gears.table.html',
  styleUrls: ['physical-gears.table.scss'],
  providers: [
    {
      provide: PHYSICAL_GEAR_DATA_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(PhysicalGear, PhysicalGearFilter, {
        equals: PhysicalGear.equals
      })
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalGearTable extends AppMeasurementsTable<PhysicalGear, PhysicalGearFilter> implements OnInit, OnDestroy {

  filterForm: FormGroup;
  modalOptions: Partial<IPhysicalGearModalOptions>;

  set value(data: PhysicalGear[]) {
    this.memoryDataService.value = data;
  }

  get value(): PhysicalGear[] {
    return this.memoryDataService.value;
  }

  @Input() canDelete = true;
  @Input() canSelect = true;
  @Input() copyPreviousGears: (event: UIEvent) => Promise<PhysicalGear>;
  @Input() showToolbar = true;
  @Input() useSticky = false;
  @Input() tripId: number;
  @Input() title: string = null;
  @Input() defaultGear: ReferentialRef = null;
  @Input() canEditGear = true;
  @Input() showFilter = false;
  @Input() mobile: boolean;
  @Input() i18nSuffix: string;
  @Input() showFabButton = false;

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

  protected memoryDataService: InMemoryEntitiesService<PhysicalGear>;

  @Output() openSelectPreviousGearModal = createPromiseEventEmitter<PhysicalGear>();

  constructor(
    injector: Injector,
    formBuilder: FormBuilder,
    protected cd: ChangeDetectorRef,
    @Inject(PHYSICAL_GEAR_DATA_SERVICE_TOKEN) dataService?: IEntitiesService<PhysicalGear, PhysicalGearFilter>
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
    this.memoryDataService = (this.dataService as InMemoryEntitiesService<PhysicalGear>);

    this.filterForm = formBuilder.group({
      'startDate': [null, Validators.compose([Validators.required, SharedValidators.validDate])],
      'endDate': [null, Validators.compose([SharedValidators.validDate, SharedValidators.dateRangeEnd('startDate')])],
    });

    this.i18nColumnPrefix = 'TRIP.PHYSICAL_GEAR.LIST.';
    this.autoLoad = true;
    this.canEdit = true;

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.PHYSICAL_GEAR;

    // Excluded columns, by default
    this.excludesColumns.push('lastUsed');

    // FOR DEV ONLY ----
    //this.debug = !environment.production;
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

  }

  ngOnDestroy() {

    super.ngOnDestroy();
    this.openSelectPreviousGearModal.unsubscribe();
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

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onNewRow.observers.length) {
      this.onNewRow.emit();
      return true;
    }

    const newGear = await this.openDetailModal();
    if (newGear) {
      if (this.debug) console.debug("Adding new gear:", newGear);
      await this.addEntityToTable(newGear);
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<PhysicalGear>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    if (this.onOpenRow.observers.length) {
      this.onOpenRow.emit({id, row});
      return true;
    }

    const gear = PhysicalGear.fromObject({
      ...row.currentData,
      // Convert measurementValues as JSON, in order to force values of not required PMFM to be converted, in the form
      measurementValues: MeasurementValuesUtils.asObject(row.currentData.measurementValues, {minify: true})
    });

    const updatedGear = await this.openDetailModal(gear);
    if (updatedGear) {
      await this.updateEntityToTable(updatedGear, row);
    }
    else {
      this.editedRow = null;
    }
    return true;
  }

  async openDetailModal(dataToOpen?: PhysicalGear): Promise<PhysicalGear | undefined> {

    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new PhysicalGear();
      await this.onNewEntity(dataToOpen);
    }
    dataToOpen.tripId = this.tripId;

    const hasTopModal = !!(await this.modalCtrl.getTop());

    const modal = await this.modalCtrl.create({
      component: PhysicalGearModal,
      componentProps: <IPhysicalGearModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        data: dataToOpen.clone(), // Do a copy, because edition can be cancelled
        isNew,
        canEditGear: this.canEditGear,
        canEditRankOrder: this.canEditRankOrder,
        onReady: (modal) => {
          if (this.openSelectPreviousGearModal.observers.length) {
            modal.onSearchButtonClick.subscribe(event => this.openSelectPreviousGearModal.emit(event))
          }
        },
        onDelete: (event, PhysicalGear) => this.deleteEntity(event, PhysicalGear),
        mobile: this.mobile,
        i18nSuffix: this.i18nSuffix,
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
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug("[physical-gear-table] Modal result: ", data);

    return (data instanceof PhysicalGear) ? data : undefined;
  }

  async deleteEntity(event: UIEvent, data: PhysicalGear): Promise<boolean> {
    const row = await this.findRowByEntity(data);

    // Row not exists: OK
    if (!row) return true;

    const confirmed = await this.canDeleteRows([row]);
    if (confirmed) {
      return this.deleteRow(null, row, {interactive: false /*already confirmed*/, skipIfLoading: false});
    }
    return confirmed;
  }

  markAsReady(opts?: { emitEvent?: boolean }) {
    super.markAsReady(opts);
  }

  /* -- protected methods -- */

  protected async onNewEntity(data: PhysicalGear): Promise<void> {
    console.debug('[physical-gear-table] Initializing new row data...');

    await super.onNewEntity(data);

    // Default gear
    if (isNotNil(this.defaultGear)) {
      data.gear = this.defaultGear;
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async findRowByEntity(physicalGear: PhysicalGear): Promise<TableElement<PhysicalGear>> {
    return PhysicalGear && (await this.dataSource.getRows()).find(r => r.currentData.equals(physicalGear));
  }

}


