import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { toBoolean } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
let MethodValidatorService = class MethodValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { isCalculated: [toBoolean(data === null || data === void 0 ? void 0 : data.isCalculated, null), Validators.required], isEstimated: [toBoolean(data === null || data === void 0 ? void 0 : data.isEstimated, null), Validators.required] });
    }
};
MethodValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], MethodValidatorService);
export { MethodValidatorService };
//# sourceMappingURL=method.validator.js.map