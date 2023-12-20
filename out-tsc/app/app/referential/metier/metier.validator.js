import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
let MetierValidatorService = class MetierValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { gear: [data === null || data === void 0 ? void 0 : data.gear, Validators.compose([Validators.required, SharedValidators.entity])], taxonGroup: [data === null || data === void 0 ? void 0 : data.taxonGroup, SharedValidators.entity] });
    }
};
MetierValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], MetierValidatorService);
export { MetierValidatorService };
//# sourceMappingURL=metier.validator.js.map