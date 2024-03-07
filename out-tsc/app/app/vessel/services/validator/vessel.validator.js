import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { Vessel } from '../model/vessel.model';
import { SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { VesselFeaturesValidatorService } from './vessel-features.validator';
import { VesselRegistrationValidatorService } from './vessel-registration.validator';
let VesselValidatorService = class VesselValidatorService {
    constructor(formBuilder, vesselFeaturesValidator, vesselRegistrationPeriodValidator) {
        this.formBuilder = formBuilder;
        this.vesselFeaturesValidator = vesselFeaturesValidator;
        this.vesselRegistrationPeriodValidator = vesselRegistrationPeriodValidator;
    }
    getRowValidator() {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        return this.formBuilder.group({
            __typename: [Vessel.TYPENAME],
            id: [toNumber(data === null || data === void 0 ? void 0 : data.id, null)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            creationDate: [(data === null || data === void 0 ? void 0 : data.creationDate) || null],
            vesselFeatures: this.vesselFeaturesValidator.getFormGroup(data === null || data === void 0 ? void 0 : data.vesselFeatures, opts),
            vesselRegistrationPeriod: this.vesselRegistrationPeriodValidator.getFormGroup(data === null || data === void 0 ? void 0 : data.vesselRegistrationPeriod, { required: true }),
            statusId: [toNumber(data === null || data === void 0 ? void 0 : data.statusId, null), Validators.required],
            vesselType: [(data === null || data === void 0 ? void 0 : data.vesselType) || null, Validators.compose([Validators.required, SharedValidators.entity])],
        });
    }
    /**
     * Update form group, with new options
     *
     * @param form
     * @param opts
     */
    updateFormGroup(form, opts) {
        console.debug('[vessel-validator] Update form group with options', opts);
        opts = this.fillDefaultOptions(opts);
        this.vesselFeaturesValidator.updateFormGroup(form.get('vesselFeatures'), opts);
        this.vesselRegistrationPeriodValidator.updateFormGroup(form.get('vesselRegistrationPeriod'), Object.assign({ required: true }, opts));
    }
    fillDefaultOptions(opts) {
        opts = opts || {};
        opts.withNameRequired = toBoolean(opts.withNameRequired, true);
        return opts;
    }
};
VesselValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        VesselFeaturesValidatorService,
        VesselRegistrationValidatorService])
], VesselValidatorService);
export { VesselValidatorService };
//# sourceMappingURL=vessel.validator.js.map