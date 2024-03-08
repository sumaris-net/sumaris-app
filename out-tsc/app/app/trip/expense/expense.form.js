import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output, QueryList, ViewChild, ViewChildren, } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { firstNotNilPromise, FormArrayHelper, isNil, isNotEmptyArray, isNotNilOrNaN, remove, removeAll, round, } from '@sumaris-net/ngx-components';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { MeasurementUtils } from '@app/data/measurement/measurement.model';
import { ExpenseValidatorService } from './expense.validator';
import { getMaxRankOrder } from '@app/data/services/model/model.utils';
import { TypedExpenseForm } from './typed-expense.form';
import { MatTabGroup } from '@angular/material/tabs';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
class TupleValue {
}
let ExpenseForm = class ExpenseForm extends MeasurementsForm {
    constructor(injector, validatorService, formBuilder, programRefService) {
        super(injector, validatorService, formBuilder, programRefService);
        this.validatorService = validatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.$estimatedTotalPmfm = new BehaviorSubject(undefined);
        this.$fuelTypePmfm = new BehaviorSubject(undefined);
        this.$fuelPmfms = new BehaviorSubject(undefined);
        this.fuelTuple = undefined;
        this.$engineOilPmfms = new BehaviorSubject(undefined);
        this.engineOilTuple = undefined;
        this.$hydraulicOilPmfms = new BehaviorSubject(undefined);
        this.hydraulicOilTuple = undefined;
        this.$miscPmfms = new BehaviorSubject(undefined);
        this.calculating = false;
        this.baitEditedIndex = -1;
        this.applyingBaitMeasurements = false;
        this.addingNewBait = false;
        this.removingBait = false;
        this.baitsFocusIndex = -1;
        /** The index of the active tab. */
        this._selectedTabIndex = 0;
        this.selectedTabChange = new EventEmitter();
        this.mobile = this.settings.mobile;
        this.keepRankOrder = true;
        this.tabindex = 0;
    }
    get selectedTabIndex() {
        return this._selectedTabIndex;
    }
    set selectedTabIndex(value) {
        if (value !== this._selectedTabIndex) {
            this._selectedTabIndex = value;
            this.markForCheck();
        }
    }
    get baitsFormArray() {
        // 'baits' FormArray is just a array of number of fake rankOrder
        return this.form.get('baits');
    }
    get dirty() {
        return super.dirty || (this.iceForm && !!this.iceForm.dirty) || (this.baitForms && !!this.baitForms.find(form => form.dirty));
    }
    get valid() {
        // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
        return super.valid && (!this.iceForm || !this.iceForm.valid) && (!this.baitForms || !this.baitForms.some(form => !form.valid));
    }
    get invalid() {
        return super.invalid || (this.iceForm && this.iceForm.invalid) || (this.baitForms && this.baitForms.some(form => form.invalid));
    }
    get pending() {
        return super.pending || (this.iceForm && !!this.iceForm.pending) || (this.baitForms && this.baitForms.some(form => form.pending));
    }
    markAsReady(opts) {
        var _a, _b;
        super.markAsReady(opts);
        (_a = this.iceForm) === null || _a === void 0 ? void 0 : _a.markAsReady(opts);
        (_b = this.baitForms) === null || _b === void 0 ? void 0 : _b.forEach(form => form.markAsReady(opts));
    }
    ready(opts) {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this, opts);
            if (this.iceForm)
                yield this.iceForm.ready(opts);
        });
    }
    ngOnInit() {
        super.ngOnInit();
        this.initBaitHelper();
        this.registerSubscription(this.pmfms$
            // Wait form controls ready
            .pipe(mergeMap((pmfms) => this.ready().then(_ => pmfms)))
            .subscribe(pmfms => {
            const expensePmfms = pmfms.slice();
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
        }));
    }
    ngAfterViewInit() {
        // listen to bait forms children view changes
        this.registerSubscription(this.baitForms.changes.subscribe(() => this.refreshBaitForms()));
        // add totalValueChange subscription on iceForm
        this.registerSubscription(this.iceForm.totalValueChanges.subscribe(() => this.calculateTotal()));
    }
    realignInkBar() {
        if (this.tabGroup)
            this.tabGroup.realignInkBar();
    }
    initBaitHelper() {
        this.baitsHelper = new FormArrayHelper(FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'baits'), (data) => this.validatorService.getBaitControl(data), (v1, v2) => v1 === v2, value => isNil(value), {
            allowEmptyArray: false
        });
        if (this.baitsHelper.size() === 0) {
            // add at least one bait
            this.baitsHelper.resize(1);
        }
        this.markForCheck();
    }
    getValue() {
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
    applyValue(data, opts) {
        const _super = Object.create(null, {
            applyValue: { get: () => super.applyValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Make a copy of data to keep ice and bait measurements
            this.allData = this.allData || data.slice();
            yield _super.applyValue.call(this, data, opts);
            try {
                // set ice value
                yield this.setIceValue(this.allData);
                // set bait values
                yield this.setBaitValue(this.allData);
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
            catch (err) {
                if (this.destroyed)
                    return; // Skip if component destroyed
                console.error('[expense-form] Cannot load ice pmfms', err);
            }
        });
    }
    setIceValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const icePmfms = yield firstNotNilPromise(this.iceForm.pmfms$, { stop: this.destroySubject, timeout: 10000 });
                // filter data before set to ice form
                this.iceForm.value = MeasurementUtils.filter(data, icePmfms);
            }
            catch (err) {
                if (this.destroyed)
                    return; // Skip if component destroyed
                console.error('[expense-form] Cannot load ice pmfms', err);
                throw new Error('Cannot load ice pmfms');
            }
        });
    }
    setBaitValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const baitPmfms = yield firstNotNilPromise(this.baitForms.first.pmfms$, { stop: this.destroySubject, timeout: 10000 });
                // filter data before set to each bait form
                this.baitMeasurements = MeasurementUtils.filter(data, baitPmfms);
                // get max rankOrder (should be = nbBaits)
                const nbBait = getMaxRankOrder(this.baitMeasurements);
                const baits = [...Array(nbBait).keys()];
                this.applyingBaitMeasurements = true;
                // resize 'baits' FormArray and patch main form to adjust number of bait children forms
                this.baitsHelper.resize(Math.max(1, nbBait));
                this.form.patchValue({ baits });
                this.refreshBaitForms();
            }
            catch (err) {
                if (this.destroyed)
                    return; // Skip if component destroyed
                console.error('[expense-form] Cannot load bait pmfms', err);
                throw new Error('Cannot load bait pmfms');
            }
        });
    }
    refreshBaitForms() {
        this.cd.detectChanges();
        // on applying bait measurements, set them after forms are ready
        if (this.applyingBaitMeasurements) {
            this.applyingBaitMeasurements = false;
            this.applyBaitMeasurements();
            // set all as enabled
            this.baitForms.forEach(baitForm => {
                baitForm.markAsReady();
                if (this._enable)
                    baitForm.enable();
            });
        }
        // on adding a new bait, prepare the new form
        if (this.addingNewBait) {
            this.addingNewBait = false;
            this.baitForms.last.value = [];
            this.baitForms.last.markAsReady();
            if (this._enable)
                this.baitForms.last.enable();
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
    removeBait(index) {
        this.removingBait = true;
        if (!this.baitsHelper.allowEmptyArray && this.baitsHelper.size() === 1) {
            this.baitForms.first.value = [];
        }
        this.baitsHelper.removeAt(index);
    }
    registerTupleSubscription(tuple) {
        if (!tuple)
            return; // Skip
        Object.keys(tuple).forEach(pmfmId => {
            this.registerSubscription(this.form.get(pmfmId).valueChanges
                .pipe(filter(() => !this.applyingValue && !this.calculating), debounceTime(250))
                .subscribe(value => this.calculateTupleValues(tuple, pmfmId, value)));
        });
    }
    calculateTupleValues(tuple, sourcePmfmId, value) {
        if (this.calculating)
            return;
        try {
            if (this.debug) {
                console.debug('[expenseForm] calculateTupleValues:', JSON.stringify(tuple), sourcePmfmId, value);
            }
            this.calculating = true;
            // get current values (not computed)
            const values = { quantity: undefined, unitPrice: undefined, total: undefined };
            Object.keys(tuple).forEach(pmfmId => {
                if (!tuple[pmfmId].computed) {
                    values[tuple[pmfmId].type] = this.form.get(pmfmId).value || undefined;
                }
            });
            // choose which part is to calculate
            let targetType;
            switch (tuple[sourcePmfmId].type) {
                case 'quantity':
                    if (values.unitPrice) {
                        targetType = 'total';
                        values.total = value && round(value * values.unitPrice) || undefined;
                    }
                    else if (values.total) {
                        targetType = 'unitPrice';
                        values.unitPrice = value && value > 0 && round(values.total / value) || undefined;
                    }
                    break;
                case 'unitPrice':
                    if (values.quantity) {
                        targetType = 'total';
                        values.total = value && round(value * values.quantity) || undefined;
                    }
                    else if (values.total) {
                        targetType = 'quantity';
                        values.quantity = value && value > 0 && round(values.total / value) || undefined;
                    }
                    break;
                case 'total':
                    if (values.quantity) {
                        targetType = 'unitPrice';
                        values.unitPrice = value && values.quantity > 0 && round(value / values.quantity) || undefined;
                    }
                    else if (values.unitPrice) {
                        targetType = 'quantity';
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
        }
        finally {
            this.calculating = false;
        }
    }
    calculateInitialTupleValues(tuple) {
        if (tuple) {
            const pmfmIdWithValue = Object.keys(tuple).find(pmfmId => !tuple[pmfmId].computed && isNotNilOrNaN(this.form.get(pmfmId).value));
            if (pmfmIdWithValue) {
                this.calculateTupleValues(tuple, pmfmIdWithValue, this.form.get(pmfmIdWithValue).value);
            }
        }
    }
    resetComputedTupleValues(values, tuples) {
        if (tuples && values && values.length) {
            values.forEach(value => {
                const tuple = tuples[value.pmfmId.toString()];
                if (tuple && tuple.computed) {
                    value.numericalValue = undefined;
                }
            });
        }
    }
    registerTotalSubscription(totalPmfms) {
        if (isNotEmptyArray(totalPmfms)) {
            this.totalPmfms = totalPmfms;
            totalPmfms.forEach(totalPmfm => {
                this.registerSubscription(this.form.get(totalPmfm.id.toString()).valueChanges
                    .pipe(filter(() => !this.applyingValue), debounceTime(250))
                    .subscribe(() => this.calculateTotal()));
            });
        }
    }
    calculateTotal() {
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
        this.form.patchValue({ calculatedTotal: round(total) });
    }
    getValidTuple(pmfms) {
        if (pmfms) {
            const quantityPmfm = pmfms.find(this.isQuantityPmfm);
            const unitPricePmfm = pmfms.find(this.isUnitPricePmfm);
            const totalPmfm = pmfms.find(this.isTotalPmfm);
            if (quantityPmfm && unitPricePmfm && totalPmfm) {
                const tuple = {};
                tuple[quantityPmfm.id.toString()] = { computed: false, type: 'quantity' };
                tuple[unitPricePmfm.id.toString()] = { computed: false, type: 'unitPrice' };
                tuple[totalPmfm.id.toString()] = { computed: false, type: 'total' };
                return tuple;
            }
        }
        return {};
    }
    isEstimatedTotalPmfm(pmfm) {
        return pmfm.label === 'TOTAL_COST'; // todo use PmfmIds with config
    }
    isFuelTypePmfm(pmfm) {
        return pmfm.label === 'FUEL_TYPE';
    }
    isFuelPmfm(pmfm) {
        return pmfm.label.startsWith('FUEL_');
    }
    isEngineOilPmfm(pmfm) {
        return pmfm.label.startsWith('ENGINE_OIL_');
    }
    isHydraulicPmfm(pmfm) {
        return pmfm.label.startsWith('HYDRAULIC_OIL_');
    }
    isQuantityPmfm(pmfm) {
        return pmfm.label.endsWith('VOLUME');
    }
    isUnitPricePmfm(pmfm) {
        return pmfm.label.endsWith('UNIT_PRICE');
    }
    isTotalPmfm(pmfm) {
        return pmfm.label.endsWith('COST');
    }
    enable(opts) {
        this.calculating = true;
        super.enable(opts);
        if (this.iceForm)
            this.iceForm.enable(opts);
        if (this.baitForms)
            this.baitForms.forEach(form => form.enable(opts));
        this.calculating = false;
    }
    disable(opts) {
        this.calculating = true;
        super.disable(opts);
        if (this.iceForm)
            this.iceForm.disable(opts);
        if (this.baitForms)
            this.baitForms.forEach(form => form.disable(opts));
        this.calculating = false;
    }
    markAsPristine(opts) {
        super.markAsPristine(opts);
        if (this.iceForm)
            this.iceForm.markAsPristine(opts);
        if (this.baitForms)
            this.baitForms.forEach(form => form.markAsPristine(opts));
    }
    markAsUntouched(opts) {
        super.markAsUntouched(opts);
        if (this.iceForm)
            this.iceForm.markAsUntouched(opts);
        if (this.baitForms)
            this.baitForms.forEach(form => form.markAsUntouched());
    }
    markAsTouched(opts) {
        var _a, _b;
        super.markAsTouched(opts);
        (_a = this.iceForm) === null || _a === void 0 ? void 0 : _a.markAsTouched(opts);
        (_b = this.baitForms) === null || _b === void 0 ? void 0 : _b.forEach(form => form.markAsTouched(opts));
    }
    markAllAsTouched(opts) {
        super.markAllAsTouched(opts);
        if (this.iceForm)
            this.iceForm.markAllAsTouched(opts);
        if (this.baitForms)
            this.baitForms.forEach(form => form.markAllAsTouched(opts));
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number),
    __metadata("design:paramtypes", [Number])
], ExpenseForm.prototype, "selectedTabIndex", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], ExpenseForm.prototype, "selectedTabChange", void 0);
__decorate([
    ViewChild('iceExpenseForm'),
    __metadata("design:type", TypedExpenseForm)
], ExpenseForm.prototype, "iceForm", void 0);
__decorate([
    ViewChildren('baitExpenseForm'),
    __metadata("design:type", QueryList)
], ExpenseForm.prototype, "baitForms", void 0);
__decorate([
    ViewChild('tabGroup', { static: true }),
    __metadata("design:type", MatTabGroup)
], ExpenseForm.prototype, "tabGroup", void 0);
ExpenseForm = __decorate([
    Component({
        selector: 'app-expense-form',
        templateUrl: './expense.form.html',
        styleUrls: ['./expense.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ExpenseValidatorService,
        UntypedFormBuilder,
        ProgramRefService])
], ExpenseForm);
export { ExpenseForm };
//# sourceMappingURL=expense.form.js.map