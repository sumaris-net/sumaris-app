import { AfterViewInit, ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormArray, FormBuilder } from '@angular/forms';
import { filterNotNil, firstNotNilPromise, FormArrayHelper, isNil, isNotEmptyArray, isNotNilOrNaN, ObjectMap, remove, removeAll, round, WaitForOptions } from '@sumaris-net/ngx-components';
import { MeasurementsForm } from '../measurement/measurements.form.component';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { Measurement, MeasurementUtils } from '../services/model/measurement.model';
import { ExpenseValidatorService } from '../services/validator/expense.validator';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';
import { TypedExpenseForm } from './typed-expense.form';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

type TupleType = 'quantity' | 'unitPrice' | 'total';

class TupleValue {
  computed: boolean;
  type: TupleType;
}

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense.form.html',
  styleUrls: ['./expense.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseForm extends MeasurementsForm implements OnInit, AfterViewInit {

  mobile: boolean;
  $estimatedTotalPmfm = new BehaviorSubject<IPmfm>(undefined);
  $fuelTypePmfm = new BehaviorSubject<IPmfm>(undefined);
  $fuelPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  fuelTuple: ObjectMap<TupleValue> = undefined;
  $engineOilPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  engineOilTuple: ObjectMap<TupleValue> = undefined;
  $hydraulicOilPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  hydraulicOilTuple: ObjectMap<TupleValue> = undefined;
  $miscPmfms = new BehaviorSubject<IPmfm[]>(undefined);
  totalPmfms: IPmfm[];
  calculating = false;


  baitMeasurements: Measurement[];
  applyingBaitMeasurements = false;
  addingNewBait = false;
  removingBait = false;
  baitsHelper: FormArrayHelper<number>;
  baitsFocusIndex = -1;
  allData: Measurement[];

  /** The index of the active tab. */
  private _selectedTabIndex = 0;
  get selectedTabIndex(): number | null {
    return this._selectedTabIndex;
  }
  @Input() set selectedTabIndex(value: number | null) {
    if (value !== this._selectedTabIndex) {
      this._selectedTabIndex = value;
      this.markForCheck();
    }
  }

  @Output() selectedTabChange = new EventEmitter<MatTabChangeEvent>();

  @ViewChild('iceExpenseForm') iceForm: TypedExpenseForm;
  @ViewChildren('baitExpenseForm') baitForms: QueryList<TypedExpenseForm>;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  get baitsFormArray(): FormArray {
    // 'baits' FormArray is just a array of number of fake rankOrder
    return this.form.get('baits') as FormArray;
  }

  get dirty(): boolean {
    return super.dirty || (this.iceForm && !!this.iceForm.dirty) || (this.baitForms && !!this.baitForms.find(form => form.dirty));
  }

  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
    return super.valid && (!this.iceForm || !this.iceForm.valid) && (!this.baitForms || !this.baitForms.some(form => !form.valid));
  }

  get invalid(): boolean {
    return super.invalid || (this.iceForm && this.iceForm.invalid) || (this.baitForms && this.baitForms.some(form => form.invalid));
  }

  get pending(): boolean {
    return super.pending || (this.iceForm && !!this.iceForm.pending) || (this.baitForms && this.baitForms.some(form => form.pending));
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsReady(opts);
    this.iceForm?.markAsReady(opts);
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready(opts);
    if (this.iceForm) await this.iceForm.ready(opts);
  }

  constructor(
    injector: Injector,
    protected validatorService: ExpenseValidatorService,
    protected formBuilder: FormBuilder,
    protected programRefService: ProgramRefService
  ) {
    super(injector, validatorService, formBuilder, programRefService);
    this.mobile = this.settings.mobile;
    this.keepRankOrder = true;
    this.tabindex = 0;
  }

  ngOnInit() {
    super.ngOnInit();

    this.initBaitHelper();

    this.registerSubscription(
      filterNotNil(this.$pmfms)
        // Wait form controls ready
        .pipe(mergeMap((pmfms) => this.ready().then(_ => pmfms)))
        .subscribe(pmfms => {
          const expensePmfms: IPmfm[] = pmfms.slice();
          // dispatch pmfms
          this.$estimatedTotalPmfm.next(remove(expensePmfms, this.isEstimatedTotalPmfm));
          this.$fuelTypePmfm.next(remove(expensePmfms, this.isFuelTypePmfm));

          this.$fuelPmfms.next(removeAll(expensePmfms, this.isFuelPmfm));
          this.fuelTuple = this.getValidTuple(this.$fuelPmfms.getValue());

          this.$engineOilPmfms.next(removeAll(expensePmfms, this.isEngineOilPmfm));
          this.engineOilTuple = this.getValidTuple(this.$engineOilPmfms.getValue());

          this.$hydraulicOilPmfms.next(removeAll(expensePmfms, this.isHydraulicPmfm));
          this.hydraulicOilTuple = this.getValidTuple(this.$hydraulicOilPmfms.getValue());

          // remaining pmfms go to miscellaneous part
          this.$miscPmfms.next(expensePmfms);

          // register total pmfms for calculated total
          this.registerTotalSubscription(pmfms.filter(pmfm => this.isTotalPmfm(pmfm) && !this.isEstimatedTotalPmfm(pmfm)));

        })
    );
  }

  ngAfterViewInit() {

    // listen to bait forms children view changes
    this.registerSubscription(this.baitForms.changes
      .subscribe(() => {

        // on applying bait measurements, set them after forms are ready
        if (this.applyingBaitMeasurements) {
          this.applyingBaitMeasurements = false;
          this.applyBaitMeasurements();
          // set all as enabled
          this.baitForms.forEach(baitForm => {
            baitForm.markAsReady();
            if (this._enable) baitForm.enable();
          });
        }

        // on adding a new bait, prepare the new form
        if (this.addingNewBait) {
          this.addingNewBait = false;
          this.baitForms.last.value = [];
          this.baitForms.last.markAsReady();
          if (this._enable) this.baitForms.last.enable();
        }

        // on removing bait, total has to be recalculate
        if (this.removingBait) {
          this.removingBait = false;
          this.calculateTotal();
        }

        // check all bait children forms having totalValueChange registered,
        this.baitForms.forEach(baitForm => {
          // add it if missing
          if (baitForm.totalValueChanges.observers.length === 0) {
            this.registerSubscription(baitForm.totalValueChanges.subscribe(() => this.calculateTotal()));
          }
        });

    }));

    // add totalValueChange subscription on iceForm
    this.registerSubscription(this.iceForm.totalValueChanges.subscribe(() => this.calculateTotal()));


  }

  realignInkBar() {
    if (this.tabGroup) this.tabGroup.realignInkBar();
  }

  initBaitHelper() {
    this.baitsHelper = new FormArrayHelper<number>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'baits'),
      (data) => this.validatorService.getBaitControl(data),
      (v1, v2) => v1 === v2,
      value => isNil(value),
      {
        allowEmptyArray: false
      }
    );
    if (this.baitsHelper.size() === 0) {
      // add at least one bait
      this.baitsHelper.resize(1);
    }
    this.markForCheck();
  }

  protected getValue(): Measurement[] {
    const values = super.getValue();

    // reset computed values from tuples
    this.resetComputedTupleValues(values, this.fuelTuple);
    this.resetComputedTupleValues(values, this.engineOilTuple);
    this.resetComputedTupleValues(values, this.hydraulicOilTuple);

    // add ice values
    values.push(...(this.iceForm.value || []));

    // add bait values
    this.baitForms
      .map(form => form.value)
      .filter(isNotEmptyArray)
      .forEach(value => values.push(...value));

    this.allData = values;
    return values;
  }

  async applyValue(data: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {

    // Make a copy of data to keep ice and bait measurements
    this.allData = this.allData || data.slice();

    await super.applyValue(data, opts);

    // set ice value
    await this.setIceValue(this.allData);

    // set bait values
    await this.setBaitValue(this.allData);

    // initial calculation of tuples
    this.calculateInitialTupleValues(this.fuelTuple);
    this.calculateInitialTupleValues(this.engineOilTuple);
    this.calculateInitialTupleValues(this.hydraulicOilTuple);
    this.registerTupleSubscription(this.fuelTuple);
    this.registerTupleSubscription(this.engineOilTuple);
    this.registerTupleSubscription(this.hydraulicOilTuple);

    // compute total
    this.calculateTotal();
  }

  async setIceValue(data: Measurement[]) {

    if (!this.iceForm.$pmfms.getValue()) {
      if (this.debug) console.debug('[expense-form] waiting for ice pmfms');
      await firstNotNilPromise(this.iceForm.$pmfms);
    }

    // filter data before set to ice form
    this.iceForm.value = MeasurementUtils.filter(data, this.iceForm.$pmfms.getValue());

  }

  async setBaitValue(data: Measurement[]) {

    if (!this.baitForms.first.$pmfms.getValue()) {
      if (this.debug) console.debug('[expense-form] waiting for bait pmfms');
      await firstNotNilPromise(this.baitForms.first.$pmfms);
    }

    // filter data before set to each bait form
    this.baitMeasurements = MeasurementUtils.filter(data, this.baitForms.first.$pmfms.getValue());

    // get max rankOrder (should be = nbBaits)
    const nbBait = getMaxRankOrder(this.baitMeasurements);
    const baits = [...Array(nbBait).keys()];

    this.applyingBaitMeasurements = true;
    // resize 'baits' FormArray and patch main form to adjust number of bait children forms
    this.baitsHelper.resize(Math.max(1, nbBait));
    this.form.patchValue({baits});
    // tell baitForms to call 'changes' event
    this.baitForms.setDirty();
  }

  applyBaitMeasurements() {
    // set filtered bait measurements to each form, which will also filter with its rankOrder
    this.baitForms.forEach(baitForm => {
      baitForm.value = this.baitMeasurements;
    });
  }

  addBait() {
    // just add a new fake rankOrder value in 'baits' array, the real rankOrder is driven by template index
    this.addingNewBait = true;
    this.baitsHelper.add(getMaxRankOrder(this.baitsFormArray.value) + 1);
    if (!this.mobile) {
      this.baitsFocusIndex = this.baitsHelper.size() - 1;
    }
  }

  removeBait(index: number) {
    this.removingBait = true;
    if (!this.baitsHelper.allowEmptyArray && this.baitsHelper.size() === 1) {
      this.baitForms.first.value = [];
    }
    this.baitsHelper.removeAt(index);
  }

  registerTupleSubscription(tuple: ObjectMap<TupleValue>) {
    if (!tuple) return; // Skip
    Object.keys(tuple).forEach(pmfmId => {
      this.registerSubscription(this.form.get(pmfmId).valueChanges
        .pipe(
          filter(() => !this.applyingValue && !this.calculating),
          debounceTime(250)
        )
        .subscribe(value => this.calculateTupleValues(tuple, pmfmId, value)));
    });
  }

  calculateTupleValues(tuple: ObjectMap<TupleValue>, sourcePmfmId: string, value: any) {
    if (this.calculating) return;

    try {
      if (this.debug) {
        console.debug('[expenseForm] calculateTupleValues:', JSON.stringify(tuple), sourcePmfmId, value);
      }
      this.calculating = true;

      // get current values (not computed)
      const values = {quantity: undefined, unitPrice: undefined, total: undefined};
      Object.keys(tuple).forEach(pmfmId => {
        if (!tuple[pmfmId].computed) {
          values[tuple[pmfmId].type] = this.form.get(pmfmId).value || undefined;
        }
      });

      // choose which part is to calculate
      let targetType: TupleType;
      switch (tuple[sourcePmfmId].type) {
        case "quantity":
          if (values.unitPrice) {
            targetType = "total";
            values.total = value && round(value * values.unitPrice) || undefined;
          } else if (values.total) {
            targetType = "unitPrice";
            values.unitPrice = value && value > 0 && round(values.total / value) || undefined;
          }
          break;
        case "unitPrice":
          if (values.quantity) {
            targetType = "total";
            values.total = value && round(value * values.quantity) || undefined;
          } else if (values.total) {
            targetType = "quantity";
            values.quantity = value && value > 0 && round(values.total / value) || undefined;
          }
          break;
        case "total":
          if (values.quantity) {
            targetType = "unitPrice";
            values.unitPrice = value && values.quantity > 0 && round(value / values.quantity) || undefined;
          } else if (values.unitPrice) {
            targetType = "quantity";
            values.quantity = value && values.unitPrice > 0 && round(value / values.unitPrice) || undefined;
          }
          break;
      }

      if (targetType) {
        // set values and tuple computed state
        const patch = {};
        Object.keys(tuple).forEach(targetPmfmId => {
          if (targetPmfmId === sourcePmfmId) {
            tuple[targetPmfmId].computed = false;
          }
          if (tuple[targetPmfmId].type === targetType) {
            tuple[targetPmfmId].computed = true;
            patch[targetPmfmId] = values[targetType];
          }
        });
        this.form.patchValue(patch);
        Object.keys(patch).forEach(pmfmId => this.form.get(pmfmId).markAsPristine());
      }

    } finally {
      this.calculating = false;
    }
  }

  calculateInitialTupleValues(tuple: ObjectMap<TupleValue>) {
    if (tuple) {
      const pmfmIdWithValue = Object.keys(tuple).find(pmfmId => {
        return !tuple[pmfmId].computed && isNotNilOrNaN(this.form.get(pmfmId).value);
      });
      if (pmfmIdWithValue) {
        this.calculateTupleValues(tuple, pmfmIdWithValue, this.form.get(pmfmIdWithValue).value);
      }
    }
  }

  resetComputedTupleValues(values: Measurement[], tuples: ObjectMap<TupleValue>) {
    if (tuples && values && values.length) {
      values.forEach(value => {
        const tuple = tuples[value.pmfmId.toString()];
        if (tuple && tuple.computed) {
          value.numericalValue = undefined;
        }
      });
    }
  }

  registerTotalSubscription(totalPmfms: IPmfm[]) {
    if (isNotEmptyArray(totalPmfms)) {
      this.totalPmfms = totalPmfms;
      totalPmfms.forEach(totalPmfm => {
        this.registerSubscription(this.form.get(totalPmfm.id.toString()).valueChanges
          .pipe(
            filter(() => !this.applyingValue),
            debounceTime(250)
          )
          .subscribe(() => this.calculateTotal())
        );
      });
    }
  }

  private calculateTotal() {
    let total = 0;
    // sum each total field from main form
    (this.totalPmfms || []).forEach(totalPmfm => {
      total += this.form.get(totalPmfm.id.toString()).value;
    });

    // add total from ice form
    total += this.iceForm.total;

    // add total from each bait form
    this.baitForms.forEach(baitForm => {
      total += baitForm.total;
    });

    this.form.patchValue({calculatedTotal: round(total)});
  }

  getValidTuple(pmfms: IPmfm[]): ObjectMap<TupleValue> {
    if (pmfms) {
      const quantityPmfm = pmfms.find(this.isQuantityPmfm);
      const unitPricePmfm = pmfms.find(this.isUnitPricePmfm);
      const totalPmfm = pmfms.find(this.isTotalPmfm);
      if (quantityPmfm && unitPricePmfm && totalPmfm) {
        const tuple: ObjectMap<TupleValue> = {};
        tuple[quantityPmfm.id.toString()] = {computed: false, type: "quantity"};
        tuple[unitPricePmfm.id.toString()] = {computed: false, type: "unitPrice"};
        tuple[totalPmfm.id.toString()] = {computed: false, type: "total"};
        return tuple;
      }
    }
    return {};
  }

  isEstimatedTotalPmfm(pmfm: IPmfm): boolean {
    return pmfm.label === 'TOTAL_COST'; // todo use PmfmIds with config
  }

  isFuelTypePmfm(pmfm: IPmfm): boolean {
    return pmfm.label === 'FUEL_TYPE';
  }

  isFuelPmfm(pmfm: IPmfm): boolean {
    return pmfm.label.startsWith('FUEL_');
  }

  isEngineOilPmfm(pmfm: IPmfm): boolean {
    return pmfm.label.startsWith('ENGINE_OIL_');
  }

  isHydraulicPmfm(pmfm: IPmfm): boolean {
    return pmfm.label.startsWith('HYDRAULIC_OIL_');
  }

  isQuantityPmfm(pmfm: IPmfm): boolean {
    return pmfm.label.endsWith('VOLUME');
  }

  isUnitPricePmfm(pmfm: IPmfm): boolean {
    return pmfm.label.endsWith('UNIT_PRICE');
  }

  isTotalPmfm(pmfm: IPmfm): boolean {
    return pmfm.label.endsWith('COST');
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.calculating = true;
    super.enable(opts);
    this.iceForm && this.iceForm.enable(opts);
    this.baitForms && this.baitForms.forEach(form => form.enable(opts));
    this.calculating = false;
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.calculating = true;
    super.disable(opts);
    this.iceForm && this.iceForm.disable(opts);
    this.baitForms && this.baitForms.forEach(form => form.disable(opts));
    this.calculating = false;
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsPristine(opts);
    this.iceForm && this.iceForm.markAsPristine(opts);
    this.baitForms && this.baitForms.forEach(form => form.markAsPristine(opts));
  }

  markAsUntouched(opts?: { onlySelf?: boolean }) {
    super.markAsUntouched(opts);
    this.iceForm && this.iceForm.markAsUntouched(opts);
    this.baitForms && this.baitForms.forEach(form => form.markAsUntouched());
  }

  markAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsTouched(opts);
    this.iceForm && this.iceForm.markAsTouched(opts);
    this.baitForms && this.baitForms.forEach(form => form.markAsTouched(opts));
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAllAsTouched(opts);
    this.iceForm && this.iceForm.markAllAsTouched(opts);
    this.baitForms && this.baitForms.forEach(form => form.markAllAsTouched(opts));
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
