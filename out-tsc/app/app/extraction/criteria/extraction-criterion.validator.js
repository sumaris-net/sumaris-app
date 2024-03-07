import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ExtractionFilterCriterion } from '../type/extraction-type.model';
import { AppFormArray, arrayDistinct, isNilOrBlank, isNotEmptyArray, isNotNil, toBoolean } from '@sumaris-net/ngx-components';
import { DEFAULT_CRITERION_OPERATOR } from '@app/extraction/common/extraction.utils';
let ExtractionCriteriaValidatorService = class ExtractionCriteriaValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data) {
        const config = {};
        const sheetNames = data && arrayDistinct(data
            .map(criterion => criterion.sheetName)
            .filter(isNotNil));
        if (isNotEmptyArray(sheetNames)) {
            sheetNames.forEach(sheetName => {
                const criteria = data.filter(criterion => criterion.sheetName === sheetName);
                config[sheetName] = this.getCriterionFormArray(criteria, sheetName);
            });
        }
        return this.formBuilder.group(config);
    }
    getCriterionFormArray(data, sheetName) {
        const formArray = new AppFormArray(criterion => this.getCriterionFormGroup(criterion, sheetName), ExtractionFilterCriterion.equals, ExtractionFilterCriterion.isEmpty);
        if (isNotEmptyArray(data)) {
            formArray.patchValue(data);
        }
        return formArray;
    }
    getCriterionFormGroup(data, sheetName) {
        let value = (data === null || data === void 0 ? void 0 : data.value) || null;
        // Is many values, concat values to fill the value control
        if (isNilOrBlank(value) && isNotEmptyArray(data === null || data === void 0 ? void 0 : data.values)) {
            value = data.values.join(',');
        }
        return this.formBuilder.group({
            name: [data && data.name || null],
            operator: [data && data.operator || DEFAULT_CRITERION_OPERATOR, Validators.required],
            value: [value],
            endValue: [data && data.endValue || null],
            sheetName: [data && data.sheetName || sheetName],
            hidden: [toBoolean(data === null || data === void 0 ? void 0 : data.hidden, false)]
        });
    }
    setCriterionValue(control, data, sheetName) {
        let value = (data === null || data === void 0 ? void 0 : data.value) || null;
        // Is many values, concat values to fill the value control
        if (isNilOrBlank(value) && isNotEmptyArray(data === null || data === void 0 ? void 0 : data.values)) {
            value = data.values.join(',');
        }
        control.setValue({
            name: data && data.name || null,
            operator: data && data.operator || DEFAULT_CRITERION_OPERATOR,
            value,
            endValue: data && data.endValue || null,
            sheetName: data && data.sheetName || sheetName || null,
            hidden: toBoolean(data === null || data === void 0 ? void 0 : data.hidden, false)
        });
    }
};
ExtractionCriteriaValidatorService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], ExtractionCriteriaValidatorService);
export { ExtractionCriteriaValidatorService };
//# sourceMappingURL=extraction-criterion.validator.js.map