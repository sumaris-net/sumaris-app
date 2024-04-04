import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppValidatorService, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
let ReferentialValidatorService = class ReferentialValidatorService extends AppValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        opts = opts || {};
        const controlsConfig = {
            id: [data && data.id || null],
            updateDate: [data && data.updateDate || null],
            creationDate: [data && data.creationDate || null],
            statusId: [toNumber(data === null || data === void 0 ? void 0 : data.statusId, null), Validators.required],
            levelId: [toNumber(data === null || data === void 0 ? void 0 : data.levelId, null)],
            parentId: [toNumber(data === null || data === void 0 ? void 0 : data.parentId, null)],
            label: [data && data.label || null, Validators.required],
            name: [data && data.name || null, Validators.required],
            entityName: [data && data.entityName || null, Validators.required],
            properties: [data && data['properties'] || null]
        };
        if (opts.withParent !== false) {
            controlsConfig.parent = [data && data['parent'] || null, SharedValidators.entity];
        }
        if (opts.withDescription !== false) {
            controlsConfig.description = [data && data.description || null, Validators.maxLength(255)];
        }
        if (opts.withComments !== false) {
            controlsConfig.comments = [data && data.comments || null, Validators.maxLength(2000)];
        }
        return controlsConfig;
    }
    getFormGroupOptions(data, opts) {
        return null;
    }
};
ReferentialValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], ReferentialValidatorService);
export { ReferentialValidatorService };
//# sourceMappingURL=referential.validator.js.map