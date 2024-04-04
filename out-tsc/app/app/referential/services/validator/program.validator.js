import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedFormArrayValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { EntityUtils } from '@sumaris-net/ngx-components';
let ProgramValidatorService = class ProgramValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data) {
        return this.formBuilder.group({
            id: [data && data.id || null],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            statusId: [data && data.statusId || null, Validators.required],
            label: [data && data.label || null, Validators.required],
            name: [data && data.name || null, Validators.required],
            description: [data && data.description || null, Validators.maxLength(255)],
            comments: [data && data.comments || null, Validators.maxLength(2000)],
            taxonGroupType: [data && data.taxonGroupType || null, Validators.compose([Validators.required, SharedValidators.entity])],
            gearClassification: [data && data.gearClassification || null, Validators.compose([Validators.required, SharedValidators.entity])],
            locationClassifications: this.getLocationClassificationArray(data && data.locationClassifications),
            locations: this.formBuilder.array([]),
            properties: this.getPropertiesArray(data && data.properties)
        });
    }
    getPropertiesArray(array) {
        const properties = EntityUtils.getMapAsArray(array || {});
        return this.formBuilder.array(properties.map(item => this.getPropertyFormGroup(item)));
    }
    getPropertyFormGroup(data) {
        return this.formBuilder.group({
            key: [data && data.key || null, Validators.compose([Validators.required, Validators.max(50)])],
            value: [data && data.value || null, Validators.compose([Validators.required, Validators.max(100)])]
        });
    }
    getLocationClassificationArray(array) {
        return this.formBuilder.array((array || []).map(item => this.getLocationClassificationControl(item)), SharedFormArrayValidators.requiredArrayMinLength(1));
    }
    getLocationClassificationControl(locationClassification) {
        return this.formBuilder.control(locationClassification || null, [Validators.required, SharedValidators.entity]);
    }
};
ProgramValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], ProgramValidatorService);
export { ProgramValidatorService };
//# sourceMappingURL=program.validator.js.map