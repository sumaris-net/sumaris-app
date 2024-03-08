import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppValidatorService } from '@sumaris-net/ngx-components';
import { SharedValidators } from '@sumaris-net/ngx-components';
let WeightLengthConversionValidatorService = class WeightLengthConversionValidatorService extends AppValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        return {
            id: [data && data.id || null],
            year: [(data === null || data === void 0 ? void 0 : data.year) || null, Validators.compose([Validators.required, Validators.min(1970)])],
            startMonth: [(data === null || data === void 0 ? void 0 : data.startMonth) || null, Validators.compose([Validators.required, Validators.min(1), Validators.max(12)])],
            endMonth: [(data === null || data === void 0 ? void 0 : data.endMonth) || null, Validators.compose([Validators.required, Validators.min(1), Validators.max(12)])],
            conversionCoefficientA: [(data === null || data === void 0 ? void 0 : data.conversionCoefficientA) || null, Validators.compose([Validators.required, Validators.min(0)])],
            conversionCoefficientB: [(data === null || data === void 0 ? void 0 : data.conversionCoefficientB) || null, Validators.compose([Validators.required, Validators.min(0)])],
            referenceTaxonId: [(data === null || data === void 0 ? void 0 : data.referenceTaxonId) || null],
            location: [(data === null || data === void 0 ? void 0 : data.location) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            sex: [(data === null || data === void 0 ? void 0 : data.sex) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            lengthParameter: [(data === null || data === void 0 ? void 0 : data.lengthParameter) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            lengthUnit: [(data === null || data === void 0 ? void 0 : data.lengthUnit) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            description: [(data === null || data === void 0 ? void 0 : data.description) || null],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            creationDate: [(data === null || data === void 0 ? void 0 : data.creationDate) || null],
            statusId: [(data === null || data === void 0 ? void 0 : data.statusId) || null, Validators.required]
        };
    }
};
WeightLengthConversionValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], WeightLengthConversionValidatorService);
export { WeightLengthConversionValidatorService };
//# sourceMappingURL=weight-length-conversion.validator.js.map