import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, OnInit, Optional, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  AppEntityEditorModal,
  DateUtils,
  EntitiesTableDataSource,
  isEmptyArray,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  PlatformService,
  sleep,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { TableElement } from '@e-is/ngx-material-table';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';
import { OperationForm } from '@app/trip/operation/operation.form';
import { OperationSaveOptions, OperationService } from '@app/trip/operation/operation.service';
import { MapPmfmEvent, MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { AppDataEditorOptions } from '@app/data/form/data-editor.class';
import { Promise, setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { TripService } from '@app/trip/trip/trip.service';
import { ContextService } from '@app/shared/context.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import moment from 'moment/moment';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { RxState } from '@rx-angular/state';
import { Observable } from 'rxjs';
import { MatTabGroup } from '@angular/material/tabs';

// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

export interface ISelectOperationModalOptions {
  filter: OperationFilter;
  programLabel?: string;
  enableGeolocation?: boolean;
  gearIds?: number[];
  selectedOperation?: Operation;
  allowParentOperation: boolean;
  allowMultiple: boolean;
  strategyId: number;
  acquisitionLevel: string;
  allowNewOperation: boolean;
  isInlineFishingArea: boolean;
  defaultNewOperation: Operation;
  trip?: Trip;
  debug?: boolean;
}

@Component({
  selector: 'app-select-operation-modal',
  templateUrl: './select-operation.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class SelectOperationModal extends AppEntityEditorModal<Operation> implements OnInit, ISelectOperationModalOptions {
  datasource: EntitiesTableDataSource<Operation, OperationFilter>;

  private _forceMeasurementAsOptionalOnFieldMode = false;

  @RxStateProperty() tripId: number;
  @RxStateProperty() physicalGear: PhysicalGear;

  @RxStateSelect() protected readonly gearId$: Observable<number>;

  @ViewChild('table', { static: true }) table: SelectOperationByTripTable;
  @ViewChild('form', { static: true }) opeForm: OperationForm;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  @Input() filter: OperationFilter;
  @Input() enableGeolocation: boolean;
  @Input() gearIds: number[];
  @Input() selectedOperation: Operation;
  @Input() allowMultiple: boolean;
  @Input() allowParentOperation: boolean;
  @Input() programLabel: string;
  @Input() strategyId: number;
  @Input() acquisitionLevel: string;
  @Input() allowNewOperation: boolean;
  @Input() defaultNewOperation: Operation;
  @Input() gearId: number;
  @Input() trip: Trip;
  @Input() requiredStrategy: boolean;
  @Input() isInlineFishingArea: boolean = false;

  protected readonly tripService = inject(TripService);
  protected readonly context = inject(ContextService);

  protected readonly platformService = inject(PlatformService);

  protected readonly dateTimePattern: string;
  protected readonly xsMobile: boolean;

  readonly forceOptionalExcludedPmfmIds: number[];

  displayAttributes: {
    gear?: string[];
    [key: string]: string[];
  } = {};

  get loading(): boolean {
    return this.table && this.table.loading;
  }

  get forceMeasurementAsOptional(): boolean {
    return this._forceMeasurementAsOptionalOnFieldMode && this.isOnFieldMode;
  }

  get canValidate(): boolean {
    return (this.enabled && this.valid && this.isNewOperation) || this.hasSelection();
  }

  get isNewOperation(): boolean {
    return this.selectedTabIndex === 1;
  }

  constructor(
    injector: Injector,
    protected router: Router,
    protected viewCtrl: ModalController,
    protected dataService: OperationService,
    protected cd: ChangeDetectorRef,
    @Optional() options?: AppDataEditorOptions
  ) {
    super(injector, Operation, options);

    this.dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    this.displayAttributes.gear = this.settings.getFieldDisplayAttributes('gear');
    this.xsMobile = this.mobile && !this.platformService.is('tablet');

    this.tabCount = 2;

    this.forceOptionalExcludedPmfmIds = [
      PmfmIds.SURVIVAL_SAMPLING_TYPE,
      PmfmIds.HAS_ACCIDENTAL_CATCHES,
      // Let the user save OP, even if not set
      //PmfmIds.HAS_INDIVIDUAL_MEASURES
    ];
  }

  ngOnInit() {
    super.ngOnInit();

    // Init table
    if (!this.table) throw new Error('Missing table child component');
    if (!this.filter) throw new Error("Missing argument 'filter'");

    this.filter = OperationFilter.fromObject(this.filter);
    this.table.filter = this.filter;
    this.loadData();

    this.selectedTabIndex = this.debug ? 1 : 0;

    if (this.allowNewOperation && this.defaultNewOperation) {
      setTimeout(() => this.setValue(this.defaultNewOperation));
    }
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();
  }

  loadData() {
    // Load data
    setTimeout(() => {
      this.table.onRefresh.next('modal');
      this.markForCheck();
    }, 200);
  }

  async selectRow(row: TableElement<Operation>) {
    if (row && this.table) {
      // Select the clicked row, then close
      this.table.selection.setSelection(row);
      await this.closeRow();
    }
  }

  async closeRow(): Promise<boolean> {
    try {
      if (this.hasSelection()) {
        const items = (this.table.selection.selected || [])
          .map((row) => row.currentData)
          .map((source) => Operation.fromObject(source, { withBatchTree: false, withSamples: false }))
          .filter(isNotNil);
        await this.viewCtrl.dismiss(items[0] || null);
      }
      return true;
    } catch (err) {
      // nothing to do
      return false;
    }
  }

  protected registerForms(): void {
    this.addForms([
      this.opeForm,
      this.measurementsForm,
      // Will be included by (ngInit)= (see template)
    ]);
  }

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  get form(): UntypedFormGroup {
    return this.opeForm.form;
  }

  async save(event: Event, opts?: OperationSaveOptions & { emitEvent?: boolean; updateRoute?: boolean; openTabIndex?: number }): Promise<boolean> {
    if (this.loading || this.saving || this.disabled) {
      console.debug('[data-editor] Skip save: editor is busy (loading or saving)');
      return false;
    }
    if (!this.opeForm.dirty) {
      console.debug('[data-editor] Skip save: editor not dirty');
      return true;
    }

    // Workaround to avoid the option menu to be selected
    if (this.mobile) await sleep(50);

    // Save new gear to the trip
    const physicalGear = await this.getOrAddPhysicalGear({ emitEvent: false });
    if (!physicalGear) {
      this.markForCheck();
      return false; // Stop if failed
    }

    const option = { opts, withOperation: true, withLanding: true };
    const operation = await this.getValue();

    if (isEmptyArray(this.trip.operations)) {
      this.trip.operations = [];
    }

    operation.measurements = this.measurementsForm.getValue();

    this.trip.operations.push(operation);
    this.trip = await this.tripService.save(this.trip, option);

    try {
      // Display form error on top
      if (isNil(this.trip.id)) {
        let error = this.error;
        if (isNilOrBlank(error)) {
          // DEBUG
          //console.debug('[operation] Computing form error...');

          if (this.opeForm.invalid) {
            error = this.opeForm.formError;
          }
          if (this.measurementsForm.invalid) {
            error = (isNotNilOrBlank(error) ? error + ', ' : '') + this.measurementsForm.formError;
          }

          this.setError(error);
        }
        return false;
      }
    } finally {
      this.markAsSaved();
      // await this.modalCtrl.dismiss(this.trip);
      return true;
    }
  }

  async setValue(data: Operation) {
    try {
      const isNewData = isNil(data?.id);

      // Get gear, from the physical gear
      const gearId = toNumber(data?.physicalGear?.gear?.id, null);

      // Set measurements form
      this.measurementsForm.gearId = gearId;
      this.measurementsForm.requiredGear = false;
      this.measurementsForm.programLabel = this.programLabel;
      const isChildOperation = data.parentOperation || isNotNil(data.parentOperationId);
      const acquisitionLevel = isChildOperation ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;

      this.measurementsForm.unload();
      this.measurementsForm.acquisitionLevel = acquisitionLevel;
      // Do not wait measurements forms when no default gear (because of requiredGear=true)

      // if (this.isNew && isNil(gearId)) {
      //   this.measurementsForm.pmfms = [];
      // }

      this.opeForm.markAsReady();
      await this.opeForm.setValue(data);

      await this.measurementsForm.ready();
      this.measurementsForm.markAsReady();
      await this.measurementsForm.setValue((data && data.measurements) || []);

      console.debug('[operation] children setValue() [OK]');

      // If new data, autofill the table
      if (isNewData) {
        this.opeForm.fillWithTripDates();
      }
      this.enable();
    } catch (err) {
      const error = err?.message || err;
      console.debug('[operation] Error during setValue(): ' + error, err);
      this.setError(error);
    }
  }

  async getOrAddPhysicalGear(opts?: { emitEvent: boolean }): Promise<boolean> {
    if (this.loading || this.saving) return false;
    if (!this.dirty) return true; // Skip

    const physicalGear = this.opeForm.physicalGearControl.value;
    if (!physicalGear || isNotNil(physicalGear.id)) return true; // Skip

    // DEBUG
    console.debug('[operation-page] Saving new physical gear...');

    this.markAsSaving();
    this.resetError();

    try {
      const savedPhysicalGear = await this.tripService.getOrAddGear(this.trip.id, physicalGear);

      // Update form with the new gear
      this.opeForm.physicalGearControl.patchValue(savedPhysicalGear, { emitEvent: false });

      // Update the current trip object
      if (!this.trip.gears?.some((g) => PhysicalGear.equals(g, savedPhysicalGear))) {
        this.trip.gears.push(savedPhysicalGear);
      }

      return true;
    } catch (err) {
      this.setError(err);
      return false;
    } finally {
      this.markAsSaved(opts);
    }
  }

  hasSelection(): boolean {
    const table = this.table;
    return table && table.selection.hasValue() && table.selection.selected.length === 1;
  }

  protected computeTitle(): Promise<string> {
    return Promise.resolve("'TRIP.OPERATION.PARENT.TITLE' | translate");
  }

  protected getFirstInvalidTabIndex(): number {
    // find invalids tabs (keep order)
    const invalidTabs = [this.opeForm.invalid || this.measurementsForm.invalid];

    // Open the first invalid tab
    return invalidTabs.indexOf(true);
  }

  protected async mapPmfms(event: MapPmfmEvent) {
    if (!event || !event.detail.success) return; // Skip (missing callback)
    let pmfms: IPmfm[] = event.detail.pmfms;

    // If PMFM date/time, set default date, in on field mode
    if (this.isNew && this.isOnFieldMode && pmfms?.some(PmfmUtils.isDate)) {
      pmfms = pmfms.map((p) => {
        if (PmfmUtils.isDate(p)) {
          p = p.clone();
          p.defaultValue = DateUtils.markNoTime(DateUtils.resetTime(moment()));
        }
        return p;
      });
    }

    event.detail.success(pmfms);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
