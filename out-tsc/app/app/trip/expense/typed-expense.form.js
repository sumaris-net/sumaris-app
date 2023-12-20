import { __awaiter, __decorate, __metadata } from "tslib";
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { filterNotNil, firstTruePromise, isNotEmptyArray, isNotNilOrNaN, remove, removeAll, } from '@sumaris-net/ngx-components';
import { TypedExpenseValidatorService } from './typed-expense.validator';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, filter, mergeMap } from 'rxjs/operators';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
let TypedExpenseForm = class TypedExpenseForm extends MeasurementsForm {
    constructor(injector, validatorService, formBuilder, programRefService) {
        super(injector, validatorService, formBuilder, programRefService);
        this.validatorService = validatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.$pmfmReady = new BehaviorSubject(false);
        this.$typePmfm = new BehaviorSubject(undefined);
        this.$totalPmfm = new BehaviorSubject(undefined);
        this.$packagingPmfms = new BehaviorSubject(undefined);
        this.expenseType = 'UNKNOWN';
        this.totalValueChanges = new EventEmitter();
        this.mobile = this.settings.mobile;
        this.keepRankOrder = true;
    }
    get total() {
        const totalPmfm = this.$totalPmfm.getValue();
        return (totalPmfm && this.form.get(totalPmfm.id.toString()).value) || 0;
    }
    ngOnInit() {
        super.ngOnInit();
        this.amountDefinition = {
            key: 'amount',
            label: `EXPENSE.${this.expenseType}.AMOUNT`,
            type: 'double',
            minValue: 0,
            maximumNumberDecimals: 2,
        };
        this.registerSubscription(this.pmfms$
            // Wait form controls ready
            .pipe(mergeMap((pmfms) => this.ready().then((_) => pmfms)))
            .subscribe((pmfms) => this.parsePmfms(pmfms)));
        this.registerSubscription(filterNotNil(this.$totalPmfm).subscribe((totalPmfm) => {
            this.form
                .get(totalPmfm.id.toString())
                .valueChanges.pipe(filter(() => this.totalValueChanges.observers.length > 0), debounceTime(250))
                .subscribe(() => this.totalValueChanges.emit(this.form.get(totalPmfm.id.toString()).value));
        }));
        // type
        this.registerAutocompleteField('packaging', {
            showAllOnFocus: true,
            items: this.$packagingPmfms,
            attributes: ['unitLabel'],
            columnNames: ['REFERENTIAL.PMFM.UNIT'],
            mobile: this.mobile,
        });
    }
    getValue() {
        const values = super.getValue();
        // parse values
        const packagingPmfms = this.$packagingPmfms.getValue() || [];
        if (values && packagingPmfms.length) {
            packagingPmfms.forEach((packagingPmfm) => {
                const value = values.find((v) => v.pmfmId === packagingPmfm.id);
                if (value) {
                    if (this.form.value.packaging && this.form.value.packaging.pmfmId === value.pmfmId) {
                        value.numericalValue = this.form.value.amount;
                    }
                    else {
                        value.numericalValue = undefined;
                    }
                }
            });
        }
        // set rank order if provided
        if (this.rankOrder) {
            (values || []).forEach((value) => (value.rankOrder = this.rankOrder));
        }
        return values;
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // filter measurements on rank order if provided
            if (this.rankOrder) {
                data = (data || []).filter((value) => value.rankOrder === this.rankOrder);
            }
            yield _super.updateView.call(this, data, opts);
            yield this.readyPmfms({ stop: this.destroySubject });
            // set packaging and amount value
            const packaging = (this.$packagingPmfms.getValue() || []).find((pmfm) => this.form.get(pmfm.id.toString()) && isNotNilOrNaN(this.form.get(pmfm.id.toString()).value));
            const amount = (packaging && this.form.get(packaging.id.toString()).value) || undefined;
            this.form.patchValue({ amount, packaging });
        });
    }
    readyPmfms(opts) {
        return firstTruePromise(this.$pmfmReady, opts);
    }
    parsePmfms(pmfms) {
        if (isNotEmptyArray(pmfms)) {
            const remainingPmfms = pmfms.slice();
            this.$typePmfm.next(remove(remainingPmfms, this.isTypePmfm));
            this.$totalPmfm.next(remove(remainingPmfms, this.isTotalPmfm));
            this.$packagingPmfms.next(removeAll(remainingPmfms, this.isPackagingPmfm));
            if (remainingPmfms.length) {
                console.warn('[typed-expense] some pmfms have not been parsed', remainingPmfms);
            }
            // must update controls
            this.validatorService.updateFormGroup(this.form, {
                pmfms,
                typePmfm: this.$typePmfm.getValue(),
                totalPmfm: this.$totalPmfm.getValue(),
            });
            this.$pmfmReady.next(true);
        }
    }
    isTypePmfm(pmfm) {
        return pmfm.label.endsWith('TYPE');
    }
    isPackagingPmfm(pmfm) {
        return pmfm.label.endsWith('WEIGHT') || pmfm.label.endsWith('COUNT');
    }
    isTotalPmfm(pmfm) {
        return pmfm.label.endsWith('COST');
    }
    markForCheck() {
        if (this.cd)
            this.cd.markForCheck();
        else
            console.warn('[typed-expense-form] ChangeDetectorRef is undefined');
    }
};
__decorate([
    Input(),
    __metadata("design:type", Number)
], TypedExpenseForm.prototype, "rankOrder", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], TypedExpenseForm.prototype, "expenseType", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], TypedExpenseForm.prototype, "totalValueChanges", void 0);
TypedExpenseForm = __decorate([
    Component({
        selector: 'app-typed-expense-form',
        templateUrl: './typed-expense.form.html',
        styleUrls: ['./typed-expense.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        TypedExpenseValidatorService,
        UntypedFormBuilder,
        ProgramRefService])
], TypedExpenseForm);
export { TypedExpenseForm };
//# sourceMappingURL=typed-expense.form.js.map