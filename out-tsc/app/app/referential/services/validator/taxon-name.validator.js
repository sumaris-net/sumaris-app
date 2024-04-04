import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ReferentialValidatorService } from './referential.validator';
import { toBoolean } from '@sumaris-net/ngx-components';
import { SharedValidators } from '@sumaris-net/ngx-components';
let TaxonNameValidatorService = class TaxonNameValidatorService extends ReferentialValidatorService {
    constructor(formBuilder) {
        super(formBuilder);
        this.formBuilder = formBuilder;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        return Object.assign(Object.assign({}, config), { isReferent: [toBoolean(data && data.isReferent, true)], isNaming: [toBoolean(data && data.isNaming, false)], isVirtual: [toBoolean(data && data.isVirtual, false)], useExistingReferenceTaxon: [toBoolean(data && data.useExistingReferenceTaxon, false)], parentTaxonName: [data && data.parentTaxonName || null, SharedValidators.entity], referenceTaxonId: [data && data.referenceTaxonId || null], taxonomicLevel: [data && data.taxonomicLevel || null, Validators.required], startDate: [data && data.startDate || null, Validators.required], endDate: [data && data.endDate || null] });
    }
};
TaxonNameValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], TaxonNameValidatorService);
export { TaxonNameValidatorService };
//# sourceMappingURL=taxon-name.validator.js.map