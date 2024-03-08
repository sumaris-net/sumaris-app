import { __decorate, __metadata } from "tslib";
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import { ReferentialValidatorService } from './referential.validator';
let PmfmValidatorService = class PmfmValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { minValue: [toNumber(data && data.minValue, null), SharedValidators.decimal()], maxValue: [toNumber(data && data.maxValue, null), SharedValidators.decimal()], defaultValue: [isNotNil(data && data.defaultValue) ? data.defaultValue : null], maximumNumberDecimals: [toNumber(data && data.maximumNumberDecimals, null), SharedValidators.integer], signifFiguresNumber: [toNumber(data && data.signifFiguresNumber, null), SharedValidators.integer], precision: [toNumber(data && data.precision, null), SharedValidators.decimal()], parameter: [data && data.parameter || null, Validators.compose([Validators.required, SharedValidators.entity])], matrix: [data && data.matrix || null, SharedValidators.entity], fraction: [data && data.fraction || null, SharedValidators.entity], method: [data && data.method || null, SharedValidators.entity], unit: [data && data.unit || null, Validators.compose([Validators.required, SharedValidators.entity])] });
    }
    getFormGroupOptions(data, opts) {
        /*return {validator: Validators.compose([
          SharedFormGroupValidators.requiredIf('fraction', 'matrix')
        ])}*/
        return null;
    }
};
PmfmValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], PmfmValidatorService);
export { PmfmValidatorService };
//# sourceMappingURL=pmfm.validator.js.map