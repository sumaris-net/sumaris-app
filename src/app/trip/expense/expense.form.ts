import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Injector,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import {
  FormGetArrayPipe,
  isEmptyArray,
  isNotEmptyArray,
  isNotNilOrBlank,
  isNotNilOrNaN,
  ObjectMap,
  remove,
  removeAll,
  round,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { Observable } from 'rxjs';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { Measurement, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { ExpenseValidatorService } from './expense.validator';
import { TypedExpenseForm } from './typed-expense.form';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { RxState } from '@rx-angular/state';
import { MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

type TupleType = 'quantity' | 'unitPrice' | 'total';

class TupleValue {
  computed: boolean;
  type: TupleType;
}

export interface ExpenseFormState extends MeasurementsFormState {
  estimatedTotalPmfm: IPmfm;
  fuelTypePmfm: IPmfm;
  fuelPmfms: IPmfm[];
  engineOilPmfms: IPmfm[];
  hydraulicOilPmfms: IPmfm[];
  miscPmfms: IPmfm[];
  icePmfms: IPmfm[];
  baitPmfms: IPmfm[];
  gearPmfms: IPmfm[];
}

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense.form.html',
  styleUrls: ['./expense.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState, FormGetArrayPipe],
})
export class ExpenseForm extends MeasurementsForm<ExpenseFormState> implements OnInit, AfterViewInit {
  static TABS = {
    FLUID: 0,
    ICE: 1,
    BAIT: 2,
    GEAR: 3,
    MISC: 4,
  };

  @RxStateProperty() protected estimatedTotalPmfm: IPmfm;
  @RxStateSelect() protected estimatedTotalPmfm$: Observable<IPmfm>;
  @RxStateProperty() protected fuelTypePmfm: IPmfm;
  @RxStateSelect() protected fuelTypePmfm$: Observable<IPmfm>;
  @RxStateProperty() protected fuelPmfms: IPmfm[];
  @RxStateSelect() protected fuelPmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected engineOilPmfms: IPmfm[];
  @RxStateSelect() protected engineOilPmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected hydraulicOilPmfms: IPmfm[];
  @RxStateSelect() protected hydraulicOilPmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected miscPmfms: IPmfm[];
  @RxStateSelect() protected miscPmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected icePmfms: IPmfm[];
  @RxStateSelect() protected icePmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected baitPmfms: IPmfm[];
  @RxStateSelect() protected baitPmfms$: Observable<IPmfm[]>;
  @RxStateProperty() protected gearPmfms: IPmfm[];
  @RxStateSelect() protected gearPmfms$: Observable<IPmfm[]>;

  fuelTuple: ObjectMap<TupleValue> = undefined;
  engineOilTuple: ObjectMap<TupleValue> = undefined;
  hydraulicOilTuple: ObjectMap<TupleValue> = undefined;
  totalPmfms: IPmfm[];
  calculating = false;
  baitEditedIndex = -1;
  gearEditedIndex = -1;

  baitRankOrders = [];
  gearRankOrders = [];
  baitMeasurements: Measurement[];
  gearMeasurements: Measurement[];
  applyingBaitMeasurements = false;
  applyingGearMeasurements = false;
  addingNewBait = false;
  removingBait = false;
  addingNewGear = false;
  removingGear = false;
  baitsFocusIndex = -1;
  gearsFocusIndex = -1;
  allData: Measurement[];

  /** The index of the active tab. */
  private _selectedTabIndex = ExpenseForm.TABS.FLUID;
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
  @ViewChildren('gearExpenseForm') gearForms: QueryList<TypedExpenseForm>;
  @ViewChild('tabGroup', { static: true }) tabGroup: MatTabGroup;

  get dirty(): boolean {
    return (
      super.dirty ||
      (this.iceForm?.dirty) ||
      (this.baitForms?.some((form) => form.dirty)) ||
      (this.gearForms?.some((form) => form.dirty))
    );
  }

  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
    return (
      super.valid &&
      (this.iceForm?.valid ?? true) &&
      (this.baitForms?.toArray()?.every((form) => form.valid) ?? true) &&
      (this.gearForms?.toArray()?.every((form) => form.valid) ?? true)
    );
  }

  get invalid(): boolean {
    return (
      super.invalid ||
      (this.iceForm?.invalid) ||
      (this.baitForms?.some((form) => form.invalid)) ||
      (this.gearForms?.some((form) => form.invalid))
    );
  }

  get pending(): boolean {
    return (
      super.pending ||
      (this.iceForm?.pending) ||
      (this.baitForms?.some((form) => form.pending)) ||
      (this.gearForms?.some((form) => form.pending))
    );
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsReady(opts);
    this.iceForm?.markAsReady(opts);
    this.baitForms?.forEach((form) => form.markAsReady(opts));
    this.gearForms?.forEach((form) => form.markAsReady(opts));
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready(opts);
    if (this.iceForm) await this.iceForm.ready(opts);
    if (this.baitForms) await this.baitForms.forEach((form) => form.ready(opts));
    if (this.gearForms) await this.gearForms.forEach((form) => form.ready(opts));
  }

  constructor(
    injector: Injector,
    protected validatorService: ExpenseValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService
  ) {
    super(injector, validatorService, formBuilder, programRefService);
    this.mobile = this.settings.mobile;
    this.keepRankOrder = true;
    this.tabindex = 0;
  }

  ngOnInit() {
    super.ngOnInit();

    this._state.select('filteredPmfms').subscribe((pmfms) => {
      const expensePmfms: IPmfm[] = pmfms.slice();

      if (this.debug) console.debug('[expense] pmfms: ', pmfms);
      // dispatch pmfms
      this.estimatedTotalPmfm = remove(expensePmfms, this.isEstimatedTotalPmfm);
      this.fuelTypePmfm = remove(expensePmfms, this.isFuelTypePmfm);

      this.fuelPmfms = removeAll(expensePmfms, this.isFuelPmfm);
      this.fuelTuple = this.getValidTuple(this.fuelPmfms);

      this.engineOilPmfms = removeAll(expensePmfms, this.isEngineOilPmfm);
      this.engineOilTuple = this.getValidTuple(this.engineOilPmfms);

      this.hydraulicOilPmfms = removeAll(expensePmfms, this.isHydraulicPmfm);
      this.hydraulicOilTuple = this.getValidTuple(this.hydraulicOilPmfms);

      // remaining pmfms go to miscellaneous part
      this.miscPmfms = expensePmfms;

      // register total pmfms for calculated total
      this.registerTotalSubscription(pmfms.filter((pmfm) => this.isTotalPmfm(pmfm) && !this.isEstimatedTotalPmfm(pmfm)));
    });

    // Load other pmfms for typed expense
    this._state.connect(
      'icePmfms',
      this._state.select('programLabel').pipe(
        filter(isNotNilOrBlank),
        mergeMap((programLabel) => {
          return this.programRefService.watchProgramPmfms(programLabel, { acquisitionLevel: 'ICE_EXPENSE' });
        })
      )
    );
    this._state.connect(
      'baitPmfms',
      this._state.select('programLabel').pipe(
        filter(isNotNilOrBlank),
        mergeMap((programLabel) => {
          return this.programRefService.watchProgramPmfms(programLabel, { acquisitionLevel: 'BAIT_EXPENSE' });
        })
      )
    );
    this._state.connect(
      'gearPmfms',
      this._state.select('programLabel').pipe(
        filter(isNotNilOrBlank),
        mergeMap((programLabel) => {
          return this.programRefService.watchProgramPmfms(programLabel, { acquisitionLevel: 'GEAR_EXPENSE' });
        })
      )
    );
  }

  ngAfterViewInit() {
    // listen to bait forms children view changes
    this.registerSubscription(this.baitForms.changes.subscribe(() => this.refreshBaitForms()));

    // listen to gear forms children view changes
    this.registerSubscription(this.gearForms.changes.subscribe(() => this.refreshGearForms()));

    // add totalValueChange subscription on iceForm
    this.registerSubscription(this.iceForm.totalValueChanges.subscribe(() => this.calculateTotal()));
  }

  realignInkBar() {
    if (this.tabGroup && this.tabGroup._tabs.length > 0) {
      // Change selected tab if current cannot be show
      this.tabGroup.selectedIndex = this.getValidTab(this.selectedTabIndex);
      this.tabGroup.realignInkBar();
    }
  }

  // fixme : maybe useless, check in data editor
  protected getValidTab(index: number): number {
    const tabIndex = index ?? ExpenseForm.TABS.FLUID;
    if (tabIndex < 0 || tabIndex >= this.tabGroup._tabs.length) return 0;
    let validTab: boolean = false;
    switch (tabIndex) {
      case ExpenseForm.TABS.FLUID:
        validTab = isNotEmptyArray(this.fuelPmfms) || isNotEmptyArray(this.engineOilPmfms) || isNotEmptyArray(this.hydraulicOilPmfms);
        break;
      case ExpenseForm.TABS.ICE:
        validTab = isNotEmptyArray(this.icePmfms);
        break;
      case ExpenseForm.TABS.BAIT:
        validTab = isNotEmptyArray(this.baitPmfms);
        break;
      case ExpenseForm.TABS.GEAR:
        validTab = isNotEmptyArray(this.gearPmfms);
        break;
      case ExpenseForm.TABS.MISC:
        validTab = isNotEmptyArray(this.miscPmfms);
        break;
    }
    if (!validTab) {
      return this.getValidTab(tabIndex + 1);
    }
    return tabIndex;
  }

  getValue(): Measurement[] {
    const values = super.getValue();

    // reset computed values from tuples
    this.resetComputedTupleValues(values, this.fuelTuple);
    this.resetComputedTupleValues(values, this.engineOilTuple);
    this.resetComputedTupleValues(values, this.hydraulicOilTuple);

    // add ice values
    values.push(...(this.iceForm.value || []));

    // add bait values
    this.baitForms
      .map((form) => form.value)
      .filter(isNotEmptyArray)
      .forEach((value) => values.push(...value));

    // add gear values
    this.gearForms
      .map((form) => form.value)
      .filter(isNotEmptyArray)
      .forEach((value) => values.push(...value));

    this.allData = values;
    return values;
  }

  async applyValue(data: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    // Make a copy of data to keep ice, bait and gear measurements
    this.allData = this.allData || data?.slice();

    await super.applyValue(data, opts);

    if (this.debug) console.debug('[expense] this.allData: ', this.allData);

    try {
      // set ice value
      await this.setIceValue(this.allData);

      // set bait values
      await this.setBaitValue(this.allData);

      // set gear values
      await this.setGearValue(this.allData);

      // initial calculation of tuples
      this.calculateInitialTupleValues(this.fuelTuple);
      this.calculateInitialTupleValues(this.engineOilTuple);
      this.calculateInitialTupleValues(this.hydraulicOilTuple);
      this.registerTupleSubscription(this.fuelTuple);
      this.registerTupleSubscription(this.engineOilTuple);
      this.registerTupleSubscription(this.hydraulicOilTuple);

      // compute total
      this.calculateTotal();
    } catch (err) {
      if (this.destroyed) return; // Skip if component destroyed
      console.error('[expense-form] Cannot load expense pmfms', err);
    }
  }

  async setIceValue(data: Measurement[]) {
    try {
      // filter data before set to ice form
      this.iceForm.value = MeasurementUtils.filter(data, this.icePmfms);
    } catch (err) {
      if (this.destroyed) return; // Skip if component destroyed
      console.error('[expense-form] Cannot load ice pmfms', err);
      throw new Error('Cannot load ice pmfms');
    }
  }

  async setBaitValue(data: Measurement[]) {
    if (isEmptyArray(this.baitPmfms)) return;
    try {
      // filter data before set to each bait form
      const baitMeasurements = MeasurementUtils.filter(data, this.baitPmfms);

      // get all rankOrders
      const baitRankOrders = baitMeasurements
        .map((bait) => bait.rankOrder)
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);

      if (baitRankOrders.length === 0) {
        baitRankOrders.push(1);
      }

      this.baitMeasurements = baitMeasurements;
      this.baitRankOrders = baitRankOrders;
      if (this.debug) {
        console.debug('[expense] baitMeasurements: ', this.baitMeasurements);
        console.debug('[expense] baitRankOrders: ', this.baitRankOrders);
      }
      this.applyingBaitMeasurements = true;
      this.cd.detectChanges();
      this.refreshBaitForms();
    } catch (err) {
      if (this.destroyed) return; // Skip if component destroyed
      console.error('[expense-form] Cannot load bait pmfms', err);
      throw new Error('Cannot load bait pmfms');
    }
  }

  async setGearValue(data: Measurement[]) {
    if (isEmptyArray(this.gearPmfms)) return;
    try {
      // filter data before set to each gear form
      const gearMeasurements = MeasurementUtils.filter(data, this.gearPmfms);

      // get all rankOrders
      const gearRankOrders = gearMeasurements
        .map((bait) => bait.rankOrder)
        .filter((value, index, array) => array.indexOf(value) === index)
        .sort((a, b) => a - b);

      if (gearRankOrders.length === 0) {
        gearRankOrders.push(1);
      }

      this.gearMeasurements = gearMeasurements;
      this.gearRankOrders = gearRankOrders;
      if (this.debug) {
        console.debug('[expense] gearMeasurements: ', this.gearMeasurements);
        console.debug('[expense] gearsRankOrders: ', this.gearRankOrders);
      }
      this.applyingGearMeasurements = true;
      this.cd.detectChanges();
      this.refreshGearForms();
    } catch (err) {
      if (this.destroyed) return; // Skip if component destroyed
      console.error('[expense-form] Cannot load gear pmfms', err);
      throw new Error('Cannot load gear pmfms');
    }
  }

  refreshBaitForms() {
    // on applying bait measurements, set them after forms are ready
    if (this.applyingBaitMeasurements) {
      this.applyingBaitMeasurements = false;
      // set filtered bait measurements to each form, which will also filter with its rankOrder
      this.baitForms.forEach((baitForm) => {
        baitForm.value = this.baitMeasurements;
        // set all as enabled
        baitForm.markAsReady();
        if (this._enabled) baitForm.enable();
      });
    }

    // on adding a new bait, prepare the new form
    if (this.addingNewBait) {
      this.addingNewBait = false;
      this.baitForms.last.value = [];
      this.baitForms.last.markAsReady();
      if (this._enabled) this.baitForms.last.enable();
    }

    // on removing bait, total has to be recalculate
    if (this.removingBait) {
      this.removingBait = false;
      this.calculateTotal();
    }

    // check all bait children forms having totalValueChange registered,
    this.baitForms.forEach((baitForm) => {
      // add it if missing
      if (!baitForm.totalValueChanges.observed) {
        this.registerSubscription(baitForm.totalValueChanges.subscribe(() => this.calculateTotal()));
      }
    });
  }

  refreshGearForms() {
    // on applying gear measurements, set them after forms are ready
    if (this.applyingGearMeasurements) {
      this.applyingGearMeasurements = false;
      // set filtered gear measurements to each form, which will also filter with its rankOrder
      this.gearForms.forEach((gearForm) => {
        gearForm.value = this.gearMeasurements;
        // set all as enabled
        gearForm.markAsReady();
        if (this._enabled) gearForm.enable();
      });
    }

    // on adding a new gear, prepare the new form
    if (this.addingNewGear) {
      this.addingNewGear = false;
      this.gearForms.last.value = [];
      this.gearForms.last.markAsReady();
      if (this._enabled) this.gearForms.last.enable();
    }

    // on removing gear, total has to be recalculate
    if (this.removingGear) {
      this.removingGear = false;
      this.calculateTotal();
    }

    // check all gear children forms having totalValueChange registered,
    this.gearForms.forEach((gearForm) => {
      // add it if missing
      if (!gearForm.totalValueChanges.observed) {
        this.registerSubscription(gearForm.totalValueChanges.subscribe(() => this.calculateTotal()));
      }
    });
  }

  addBait() {
    // just add a new fake rankOrder value in 'baits' array, the real rankOrder is driven by template index
    this.addingNewBait = true;
    this.baitRankOrders.push(Math.max(...this.baitRankOrders, 0) + 1);
    if (!this.mobile) {
      this.baitsFocusIndex = this.baitRankOrders.length - 1;
    }
  }

  removeBait(index: number) {
    this.removingBait = true;
    if (this.baitRankOrders.length === 1) {
      this.baitForms.first.value = [];
    } else {
      this.baitRankOrders.splice(index, 1);
    }
    this.markAsDirty();
  }

  addGear() {
    // just add a new fake rankOrder value in 'gear' array, the real rankOrder is driven by template index
    this.addingNewGear = true;
    this.gearRankOrders.push(Math.max(...this.gearRankOrders, 0) + 1);
    if (!this.mobile) {
      this.gearsFocusIndex = this.gearRankOrders.length - 1;
    }
  }

  removeGearAt(index: number) {
    this.removingGear = true;
    if (this.gearRankOrders.length === 1) {
      this.gearForms.first.value = [];
    } else {
      this.gearRankOrders.splice(index, 1);
    }
    this.markAsDirty();
  }

  registerTupleSubscription(tuple: ObjectMap<TupleValue>) {
    if (!tuple) return; // Skip
    Object.keys(tuple).forEach((pmfmId) => {
      this.registerSubscription(
        this.form
          .get(pmfmId)
          .valueChanges.pipe(
            filter(() => !this.applyingValue && !this.calculating),
            debounceTime(250)
          )
          .subscribe((value) => this.calculateTupleValues(tuple, pmfmId, value))
      );
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
      const values = { quantity: undefined, unitPrice: undefined, total: undefined };
      Object.keys(tuple).forEach((pmfmId) => {
        if (!tuple[pmfmId].computed) {
          values[tuple[pmfmId].type] = this.form.get(pmfmId).value || undefined;
        }
      });

      // choose which part is to calculate
      let targetType: TupleType;
      switch (tuple[sourcePmfmId].type) {
        case 'quantity':
          if (values.unitPrice) {
            targetType = 'total';
            values.total = (value && round(value * values.unitPrice)) || undefined;
          } else if (values.total) {
            targetType = 'unitPrice';
            values.unitPrice = (value && value > 0 && round(values.total / value)) || undefined;
          }
          break;
        case 'unitPrice':
          if (values.quantity) {
            targetType = 'total';
            values.total = (value && round(value * values.quantity)) || undefined;
          } else if (values.total) {
            targetType = 'quantity';
            values.quantity = (value && value > 0 && round(values.total / value)) || undefined;
          }
          break;
        case 'total':
          if (values.quantity) {
            targetType = 'unitPrice';
            values.unitPrice = (value && values.quantity > 0 && round(value / values.quantity)) || undefined;
          } else if (values.unitPrice) {
            targetType = 'quantity';
            values.quantity = (value && values.unitPrice > 0 && round(value / values.unitPrice)) || undefined;
          }
          break;
      }

      if (targetType) {
        // set values and tuple computed state
        const patch = {};
        Object.keys(tuple).forEach((targetPmfmId) => {
          if (targetPmfmId === sourcePmfmId) {
            tuple[targetPmfmId].computed = false;
          }
          if (tuple[targetPmfmId].type === targetType) {
            tuple[targetPmfmId].computed = true;
            patch[targetPmfmId] = values[targetType];
          }
        });
        this.form.patchValue(patch);
        Object.keys(patch).forEach((pmfmId) => this.form.get(pmfmId).markAsPristine());
      }
    } finally {
      this.calculating = false;
    }
  }

  calculateInitialTupleValues(tuple: ObjectMap<TupleValue>) {
    if (tuple) {
      const pmfmIdWithValue = Object.keys(tuple).find((pmfmId) => !tuple[pmfmId].computed && isNotNilOrNaN(this.form.get(pmfmId).value));
      if (pmfmIdWithValue) {
        this.calculateTupleValues(tuple, pmfmIdWithValue, this.form.get(pmfmIdWithValue).value);
      }
    }
  }

  resetComputedTupleValues(values: Measurement[], tuples: ObjectMap<TupleValue>) {
    if (tuples && values && values.length) {
      values.forEach((value) => {
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
      totalPmfms.forEach((totalPmfm) => {
        this.registerSubscription(
          this.form
            .get(totalPmfm.id.toString())
            .valueChanges.pipe(
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
    (this.totalPmfms || []).forEach((totalPmfm) => {
      total += this.form.get(totalPmfm.id.toString()).value;
    });

    // add total from ice form
    total += this.iceForm.total;

    // add total from each bait form
    this.baitForms.forEach((baitForm) => {
      total += baitForm.total;
    });

    // add total from each gear form
    this.gearForms.forEach((gearForm) => {
      total += gearForm.total;
    });

    this.form.patchValue({ calculatedTotal: round(total) });
  }

  getValidTuple(pmfms: IPmfm[]): ObjectMap<TupleValue> {
    if (pmfms) {
      const quantityPmfm = pmfms.find(this.isQuantityPmfm);
      const unitPricePmfm = pmfms.find(this.isUnitPricePmfm);
      const totalPmfm = pmfms.find(this.isTotalPmfm);
      if (quantityPmfm && unitPricePmfm && totalPmfm) {
        const tuple: ObjectMap<TupleValue> = {};
        tuple[quantityPmfm.id.toString()] = { computed: false, type: 'quantity' };
        tuple[unitPricePmfm.id.toString()] = { computed: false, type: 'unitPrice' };
        tuple[totalPmfm.id.toString()] = { computed: false, type: 'total' };
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
    this.iceForm?.enable(opts);
    this.baitForms?.forEach((form) => form.enable(opts));
    this.gearForms?.forEach((form) => form.enable(opts));
    this.calculating = false;
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    this.calculating = true;
    super.disable(opts);
    this.iceForm?.disable(opts);
    this.baitForms?.forEach((form) => form.disable(opts));
    this.gearForms?.forEach((form) => form.disable(opts));
    this.calculating = false;
  }

  markAsPristine(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAsPristine(opts);
    this.iceForm?.markAsPristine(opts);
    this.baitForms?.forEach((form) => form.markAsPristine(opts));
    this.gearForms?.forEach((form) => form.markAsPristine(opts));
  }

  markAsUntouched(opts?: { onlySelf?: boolean }) {
    super.markAsUntouched(opts);
    this.iceForm?.markAsUntouched(opts);
    this.baitForms?.forEach((form) => form.markAsUntouched());
    this.gearForms?.forEach((form) => form.markAsUntouched());
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAllAsTouched(opts);
    this.iceForm?.markAllAsTouched(opts);
    this.baitForms?.forEach((form) => form.markAllAsTouched(opts));
    this.gearForms?.forEach((form) => form.markAllAsTouched(opts));
  }

  // Change visibility to public
  resetError(opts?: { emitEvent?: boolean; showOnlyInvalidRows?: boolean }) {
    this.setError(undefined, opts);
  }

  setError(error: string, opts?: { emitEvent?: boolean }) {
    super.setError(error, opts);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
