import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppFormArray, EntityUtils, isNil, isNotEmptyArray, SharedValidators } from '@sumaris-net/ngx-components';
import { ExtractionProduct } from './product.model';
import { AppValidatorService } from '@sumaris-net/ngx-components';
import { toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { AggregationStrataValidatorService } from '@app/extraction/strata/strata.validator';
let ExtractionProductValidatorService = class ExtractionProductValidatorService extends AppValidatorService {
    constructor(formBuilder, strataValidatorService) {
        super(formBuilder);
        this.formBuilder = formBuilder;
        this.strataValidatorService = strataValidatorService;
    }
    getFormGroup(data) {
        return this.formBuilder.group({
            __typename: ExtractionProduct.TYPENAME,
            id: [data && data.id || null],
            format: [data && data.format || null, Validators.required],
            version: [data && data.version || null, Validators.maxLength(10)],
            label: [data && data.label || null, Validators.required],
            name: [data && data.name || null, Validators.required],
            description: [data && data.description || null, Validators.maxLength(255)],
            comments: [data && data.comments || null, Validators.maxLength(2000)],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            parentId: [toNumber(data === null || data === void 0 ? void 0 : data.parentId, null)],
            filter: [data && data.filter || null],
            filterContent: [data && data.filterContent || null, Validators.maxLength(10000)],
            documentation: [data && data.documentation || null, Validators.maxLength(10000)],
            statusId: [toNumber(data && data.statusId, null), Validators.required],
            isSpatial: [toBoolean(data && data.isSpatial, false)],
            processingFrequencyId: [toNumber(data && data.processingFrequencyId, null), Validators.required],
            recorderDepartment: [data && data.recorderDepartment || null, SharedValidators.entity],
            recorderPerson: [data && data.recorderPerson || null, SharedValidators.entity],
            stratum: this.getStratumArray(data),
        });
    }
    getStratumArray(data) {
        const formArray = new AppFormArray((strata) => this.getStrataFormGroup(strata), (v1, v2) => EntityUtils.equals(v1, v2, 'id') || v1.sheetName === v2.sheetName, (strata) => !strata || isNil(strata.sheetName), {
            allowEmptyArray: false
        });
        if (isNotEmptyArray(data === null || data === void 0 ? void 0 : data.stratum)) {
            formArray.patchValue(data === null || data === void 0 ? void 0 : data.stratum);
        }
        return formArray;
    }
    getStrataFormGroup(data) {
        return this.strataValidatorService.getFormGroup(data);
    }
};
ExtractionProductValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        AggregationStrataValidatorService])
], ExtractionProductValidatorService);
export { ExtractionProductValidatorService };
//# sourceMappingURL=product.validator.js.map