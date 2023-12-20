import { __decorate } from "tslib";
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { SharedFormGroupValidators, SharedValidators } from '@sumaris-net/ngx-components';
let TypedExpenseValidatorService = class TypedExpenseValidatorService extends MeasurementsValidatorService {
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data, opts), {
            amount: [null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
            packaging: [null, SharedValidators.entity]
        });
    }
    getFormGroupOptions(data, opts) {
        return {
            validators: this.getDefaultValidators()
        };
    }
    getDefaultValidators() {
        return [
            SharedFormGroupValidators.requiredIf('packaging', 'amount'),
            SharedFormGroupValidators.requiredIf('amount', 'packaging'),
        ];
    }
    updateFormGroup(form, opts) {
        super.updateFormGroup(form, opts);
        // add formGroup validator for type requirement
        const additionalValidators = [];
        if (opts.typePmfm) {
            additionalValidators.push(SharedFormGroupValidators.requiredIf(opts.typePmfm.id.toString(), 'amount'));
            if (opts.totalPmfm) {
                additionalValidators.push(SharedFormGroupValidators.requiredIf(opts.typePmfm.id.toString(), opts.totalPmfm.id.toString()));
            }
        }
        if (additionalValidators.length) {
            form.setValidators(this.getDefaultValidators().concat(...additionalValidators));
        }
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        // add expense fields as protected attributes
        opts.protectedAttributes.push('amount', 'packaging');
        return opts;
    }
};
TypedExpenseValidatorService = __decorate([
    Injectable({ providedIn: 'root' })
], TypedExpenseValidatorService);
export { TypedExpenseValidatorService };
//# sourceMappingURL=typed-expense.validator.js.map