import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { isNotNil } from '@sumaris-net/ngx-components';
let PmfmStrategyValidatorService = class PmfmStrategyValidatorService {
    constructor(formBuilder) {
        this.formBuilder = formBuilder;
        this._withDetails = true;
        this._withDetails = true;
    }
    get withDetails() {
        return this._withDetails;
    }
    set withDetails(value) {
        this._withDetails = value;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        opts = Object.assign({ withDetails: this._withDetails }, opts);
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        const config = {
            id: [data && data.id || null],
            pmfm: [data && data.pmfm || null, SharedValidators.entity],
            parameter: [data && data.parameter || null, SharedValidators.entity],
            matrix: [data && data.matrix || null, SharedValidators.entity],
            fraction: [data && data.fraction || null, SharedValidators.entity],
            method: [data && data.method || null, SharedValidators.entity]
        };
        if (opts.withDetails) {
            config.acquisitionLevel = [data && data.acquisitionLevel || null, Validators.required];
            config.rankOrder = [data && data.rankOrder || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(0)])];
            config.isMandatory = [data && data.isMandatory || false, Validators.required];
            config.acquisitionNumber = [data && data.acquisitionNumber || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])];
            config.minValue = [data && data.minValue || null, SharedValidators.decimal()];
            config.maxValue = [data && data.maxValue || null, SharedValidators.decimal()];
            config.defaultValue = [isNotNil(data && data.defaultValue) ? data.defaultValue : null];
            config.gearIds = [data && data.gearIds || null];
            config.taxonGroupIds = [data && data.taxonGroupIds || null];
            config.referenceTaxonIds = [data && data.referenceTaxonIds || null];
        }
        return config;
    }
    getFormGroupOptions(data, opts) {
        if (!opts || opts.required !== false) {
            return {
                validator: (form) => {
                    const pmfm = form.get('pmfm').value;
                    const parameter = form.get('parameter').value;
                    const fraction = form.get('fraction').value;
                    if (!pmfm && !parameter && !fraction) {
                        return { required: true };
                    }
                    return null;
                }
            };
        }
        return {};
    }
};
PmfmStrategyValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder])
], PmfmStrategyValidatorService);
export { PmfmStrategyValidatorService };
//# sourceMappingURL=pmfm-strategy.validator.js.map