import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppValidatorService, SharedValidators } from '@sumaris-net/ngx-components';
let RoundWeightConversionValidatorService = class RoundWeightConversionValidatorService extends AppValidatorService {
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
            startDate: [(data === null || data === void 0 ? void 0 : data.startDate) || null, Validators.compose([Validators.required, SharedValidators.validDate])],
            endDate: [(data === null || data === void 0 ? void 0 : data.endDate) || null, SharedValidators.validDate],
            conversionCoefficient: [(data === null || data === void 0 ? void 0 : data.conversionCoefficient) || null, Validators.compose([Validators.required, Validators.min(0)])],
            taxonGroupId: [(data === null || data === void 0 ? void 0 : data.taxonGroupId) || null],
            location: [(data === null || data === void 0 ? void 0 : data.location) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            dressing: [(data === null || data === void 0 ? void 0 : data.dressing) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            preserving: [(data === null || data === void 0 ? void 0 : data.preserving) || null, Validators.compose([Validators.required, SharedValidators.entity])],
            description: [(data === null || data === void 0 ? void 0 : data.description) || null],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            creationDate: [(data === null || data === void 0 ? void 0 : data.creationDate) || null],
            statusId: [(data === null || data === void 0 ? void 0 : data.statusId) || null, Validators.required]
        };
    }
};
RoundWeightConversionValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], RoundWeightConversionValidatorService);
export { RoundWeightConversionValidatorService };
//# sourceMappingURL=round-weight-conversion.validator.js.map