import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedFormArrayValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { VesselActivity } from './aggregated-landing.model';
let VesselActivityValidatorService = class VesselActivityValidatorService {
    constructor(formBuilder, settings) {
        this.formBuilder = formBuilder;
        this.settings = settings;
    }
    getRowValidator(opts) {
        return this.getFormGroup();
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return {
            __typename: [VesselActivity.TYPENAME],
            date: [data && data.date, Validators.compose([Validators.required, SharedValidators.validDate])],
            rankOrder: [data && data.rankOrder, Validators.compose([Validators.required, SharedValidators.integer])],
            comments: [data && data.comments, Validators.maxLength(2000)],
            measurementValues: this.getMeasurementGroup(data),
            metiers: this.getMetiersFormArray(data, opts),
            tripId: [data && data.tripId],
            observedLocationId: [data && data.observedLocationId],
            landingId: [data && data.landingId]
        };
    }
    getFormGroupOptions(data, opts) {
        return {};
    }
    getMeasurementGroup(data) {
        const config = data && data.measurementValues && Object.keys(data.measurementValues)
            .reduce((res, pmfmId) => {
            res[pmfmId] = [data.measurementValues[pmfmId]];
            return res;
        }, {})
            || {};
        return this.formBuilder.group(config);
    }
    fillDefaultOptions(opts) {
        opts = opts || {};
        opts.required = toBoolean(opts.required, false);
        return opts;
    }
    getMetiersFormArray(data, opts) {
        return this.formBuilder.array((data && data.metiers || []).map(metier => this.getMetierFormControl(metier, opts)), SharedFormArrayValidators.requiredArrayMinLength(1));
    }
    getMetierFormControl(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return this.formBuilder.control(data || null, opts.required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
    }
};
VesselActivityValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        LocalSettingsService])
], VesselActivityValidatorService);
export { VesselActivityValidatorService };
//# sourceMappingURL=vessel-activity.validator.js.map