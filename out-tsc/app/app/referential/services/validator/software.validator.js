import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { EntityUtils } from '@sumaris-net/ngx-components';
let SoftwareValidatorService = class SoftwareValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data) {
        return this.formBuilder.group({
            id: [data && data.id || null],
            label: [data && data.label || null, Validators.compose([Validators.required, Validators.max(50)])],
            name: [data && data.name || null, Validators.compose([Validators.required, Validators.max(100)])],
            description: [data && data.description || null, Validators.maxLength(255)],
            comments: [data && data.comments || null, Validators.maxLength(2000)],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            statusId: [data && data.statusId || null, Validators.required],
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
};
SoftwareValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], SoftwareValidatorService);
export { SoftwareValidatorService };
//# sourceMappingURL=software.validator.js.map