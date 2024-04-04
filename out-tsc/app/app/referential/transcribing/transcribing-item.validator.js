import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
let TranscribingItemValidatorService = class TranscribingItemValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { objectId: [toNumber(data === null || data === void 0 ? void 0 : data.objectId, null), Validators.compose([SharedValidators.integer, Validators.min(0)])], object: [(data === null || data === void 0 ? void 0 : data.object) || null, SharedValidators.entity], type: [(data === null || data === void 0 ? void 0 : data.type) || null, SharedValidators.entity] });
    }
};
TranscribingItemValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], TranscribingItemValidatorService);
export { TranscribingItemValidatorService };
//# sourceMappingURL=transcribing-item.validator.js.map