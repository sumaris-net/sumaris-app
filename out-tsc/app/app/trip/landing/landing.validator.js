import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Landing } from './landing.model';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { TranslateService } from '@ngx-translate/core';
let LandingValidatorService = class LandingValidatorService extends DataRootVesselEntityValidatorService {
    constructor(formBuilder, translate, settings, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.measurementsValidatorService = measurementsValidatorService;
    }
    getFormGroup(data, opts) {
        const form = super.getFormGroup(data, opts);
        // Add measurement form
        if (opts && opts.withMeasurements) {
            const measForm = form.get('measurementValues');
            const pmfms = (opts.strategy && opts.strategy.denormalizedPmfms)
                || (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms)
                || [];
            pmfms
                .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.LANDING)
                .forEach(p => {
                const key = p.pmfmId.toString();
                const value = data && data.measurementValues && data.measurementValues[key];
                measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
            });
        }
        return form;
    }
    getFormGroupConfig(data, opts) {
        const formConfig = Object.assign(super.getFormGroupConfig(data), {
            __typename: [Landing.TYPENAME],
            location: [(data === null || data === void 0 ? void 0 : data.location) || null, SharedValidators.entity],
            dateTime: [(data === null || data === void 0 ? void 0 : data.dateTime) || null],
            rankOrder: [toNumber(data === null || data === void 0 ? void 0 : data.rankOrder, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
            rankOrderOnVessel: [toNumber(data === null || data === void 0 ? void 0 : data.rankOrderOnVessel, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
            measurementValues: this.formBuilder.group({}),
            // Parent id
            observedLocationId: [toNumber(data === null || data === void 0 ? void 0 : data.observedLocationId, null)],
            tripId: [toNumber(data === null || data === void 0 ? void 0 : data.tripId, null)],
            // Computed values (e.g. for SIH-OBSBIO program)
            samplesCount: [toNumber(data === null || data === void 0 ? void 0 : data.samplesCount, null), null]
        });
        // Add observed location
        if (opts.withObservedLocation) {
            formConfig.observedLocation = [data && data.observedLocation, SharedValidators.entity];
        }
        // Add observers
        if (opts.withObservers) {
            formConfig.observers = this.getObserversFormArray(data === null || data === void 0 ? void 0 : data.observers);
        }
        return formConfig;
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.withObservers = toBoolean(opts.withObservers, opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE) || false);
        opts.withStrategy = toBoolean(opts.withStrategy, opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE) || false);
        opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
        // TODO add more options, for all form parts:
        // opts.withFishingArea = ...
        // opts.withMetier = ...
        return opts;
    }
};
LandingValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService])
], LandingValidatorService);
export { LandingValidatorService };
//# sourceMappingURL=landing.validator.js.map