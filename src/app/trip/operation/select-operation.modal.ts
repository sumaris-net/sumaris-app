import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Injector, Input, OnInit, Optional, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  AppEntityEditorModal,
  EntitiesTableDataSource,
  isNil,
  isNilOrBlank,
  isNotNil,
  isNotNilOrBlank,
  sleep,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { TableElement } from '@e-is/ngx-material-table';
import { SelectOperationByTripTable } from '@app/trip/operation/select-operation-by-trip.table';
import { OperationForm } from '@app/trip/operation/operation.form';
import { OperationSaveOptions, OperationService } from '@app/trip/operation/operation.service';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { AppDataEditorOptions } from '@app/data/form/data-editor.class';
import { Promise, setTimeout } from '@rx-angular/cdk/zone-less/browser';
import { UntypedFormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { Observable } from 'rxjs';
import { RootDataEntityUtils } from '@app/data/services/model/root-data-entity.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { TripService } from '@app/trip/trip/trip.service';
import { ContextService } from '@app/shared/context.service';

// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

export interface ISelectOperationModalOptions {
  filter: OperationFilter;
  programLabel?: string;
  enableGeolocation?: boolean;
  gearIds?: number[];
  selectedOperation?: Operation;
  allowParentOperation: boolean;
  allowMultiple: boolean;
}

@Component({
  selector: 'app-select-operation-modal',
  templateUrl: './select-operation.modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectOperationModal extends AppEntityEditorModal<Operation> implements OnInit, ISelectOperationModalOptions {
  datasource: EntitiesTableDataSource<Operation, OperationFilter>;
  saveOptions: OperationSaveOptions = {};

  protected readonly tripService = inject(TripService);
  protected readonly context = inject(ContextService);

  @RxStateProperty() tripId: number;
  @RxStateProperty() trip: Trip;
  @RxStateSelect() protected readonly gearId$: Observable<number>;

  @ViewChild('table', { static: true }) table: SelectOperationByTripTable;
  @ViewChild('form', { static: true }) opeForm: OperationForm;
  @ViewChild('measurementsForm', { static: true }) measurementsForm: MeasurementsForm;

  @Input() filter: OperationFilter;
  @Input() enableGeolocation: boolean;
  @Input() gearIds: number[];
  @Input() selectedOperation: Operation;
  @Input() allowMultiple: boolean;
  @Input() allowParentOperation: boolean;
  @Input() programLabel: string;
  @Input() strategyId: number;
  @Input() acquisitionLevel: string;

  get loading(): boolean {
    return this.table && this.table.loading;
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
  }

  ngOnInit() {
    // Init table
    if (!this.table) throw new Error('Missing table child component');
    if (!this.filter) throw new Error("Missing argument 'filter'");

    this.filter = OperationFilter.fromObject(this.filter);
    this.table.filter = this.filter;
    // this.usageMode = 'FIELD';
    this.loadData();
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

  async closeRow(event?: any): Promise<boolean> {
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

  protected registerForms(): void {}

  async cancel() {
    await this.viewCtrl.dismiss();
  }

  get form(): UntypedFormGroup {
    return this.opeForm.form;
  }

  async save(event: Event, opts?: OperationSaveOptions & { emitEvent?: boolean; updateRoute?: boolean; openTabIndex?: number }): Promise<boolean> {
    if (this.loading || this.saving) {
      console.debug('[data-editor] Skip save: editor is busy (loading or saving)');
      return false;
    }
    if (!this.dirty) {
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

    // Force to pass specific saved options to dataService.save()
    const saved = await super.save(event, <OperationSaveOptions>{
      ...this.saveOptions,
      trip: this.trip,
      updateLinkedOperation: this.opeForm.isParentOperation || this.opeForm.isChildOperation, // Apply updates on child operation if it exists
      ...opts,
    });

    // Continue to mark as saving, to avoid option menu to open
    this.markAsSaving();

    try {
      // Display form error on top
      if (!saved) {
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
        this.scrollToTop();
      } else {
        // Workaround, to make sure the editor is not dirty anymore
        // Mark trip as dirty
        if (RootDataEntityUtils.isReadyToSync(this.trip)) {
          RootDataEntityUtils.markAsDirty(this.trip);
          this.trip = await this.tripService.save(this.trip);
          // Update the context
          this.context.setValue('trip', this.trip);
        }
      }

      return saved;
    } finally {
      this.markAsSaved();
    }
  }

  async setValue(data: Operation) {
    try {
      const isNewData = isNil(data?.id);
      const jobs: Promise<any>[] = [this.opeForm.setValue(data)];

      // Get gear, from the physical gear
      const gearId = toNumber(data?.physicalGear?.gear?.id, null);

      // Set measurements form
      this.measurementsForm.gearId = gearId;
      this.measurementsForm.programLabel = this.programLabel;
      const isChildOperation = data.parentOperation || isNotNil(data.parentOperationId);
      const acquisitionLevel = isChildOperation ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;

      // Propagate acquisition level, if changed
      if (this.acquisitionLevel !== acquisitionLevel) {
        this.measurementsForm.unload();
        this.measurementsForm.acquisitionLevel = acquisitionLevel;
        this.measurementsForm.markAsReady();
        this.acquisitionLevel = acquisitionLevel;
      }

      // Do not wait measurements forms when no default gear (because of requiredGear=true)
      if (this.isNewData && isNil(gearId)) {
        this.measurementsForm.pmfms = [];
      }
      jobs.push(this.measurementsForm.setValue((data && data.measurements) || []));

      await Promise.all(jobs);

      console.debug('[operation] children setValue() [OK]');

      // If new data, autofill the table
      if (isNewData) {
        this.opeForm.fillWithTripDates();
      }
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

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
