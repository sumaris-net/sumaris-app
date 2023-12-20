import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
let TaxonGroupValidatorService = class TaxonGroupValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { parent: [data && data.parentId || null, SharedValidators.entity] });
    }
};
TaxonGroupValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], TaxonGroupValidatorService);
export { TaxonGroupValidatorService };
//# sourceMappingURL=taxon-group.validator.js.map