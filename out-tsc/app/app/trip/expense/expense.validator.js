import { __decorate, __metadata } from "tslib";
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
let ExpenseValidatorService = class ExpenseValidatorService extends MeasurementsValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(super.getFormGroupConfig(data, opts), {
            calculatedTotal: [null],
            baits: this.getBaitsFormArray()
        });
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        // add expense fields as protected attributes
        opts.protectedAttributes.push('calculatedTotal', 'baits');
        return opts;
    }
    getBaitsFormArray() {
        return this.formBuilder.array([this.getBaitControl()]);
    }
    getBaitControl(data) {
        return this.formBuilder.group({
            rankOrder: [data || 1]
        });
    }
};
ExpenseValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService])
], ExpenseValidatorService);
export { ExpenseValidatorService };
//# sourceMappingURL=expense.validator.js.map