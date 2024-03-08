import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ReferentialValidatorService } from './referential.validator';
let ParameterValidatorService = class ParameterValidatorService extends ReferentialValidatorService {
    constructor(formBuilder, referentialValidatorService) {
        super(formBuilder);
        this.formBuilder = formBuilder;
        this.referentialValidatorService = referentialValidatorService;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { type: [data && data.type || null, Validators.required], qualitativeValues: this.formBuilder.array((data && data.qualitativeValues || []).map(item => this.getQualitativeValuesFormGroup(item))) });
    }
    getQualitativeValuesFormGroup(data) {
        return this.formBuilder.group(this.referentialValidatorService.getFormGroupConfig(data));
    }
};
ParameterValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        ReferentialValidatorService])
], ParameterValidatorService);
export { ParameterValidatorService };
//# sourceMappingURL=parameter.validator.js.map