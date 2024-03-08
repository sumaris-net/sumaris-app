import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators, } from '@angular/forms';
import { DateUtils, isNotNil, LocalSettingsService, SharedFormGroupValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { ObservedLocation } from './observed-location.model';
import { DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import moment from 'moment';
import { TranslateService } from '@ngx-translate/core';
let ObservedLocationValidatorService = class ObservedLocationValidatorService extends DataRootEntityValidatorService {
    constructor(formBuilder, translate, settings) {
        super(formBuilder, translate, settings);
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        const form = super.getFormGroup(data, opts);
        // Add measurement form
        if (opts.withMeasurements) {
            const measForm = form.get('measurementValues');
            // TODO: find strategy from date and location
            (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms || [])
                .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.OBSERVED_LOCATION)
                .forEach(p => {
                var _a;
                const key = p.id.toString();
                const value = (_a = data === null || data === void 0 ? void 0 : data.measurementValues) === null || _a === void 0 ? void 0 : _a[key];
                measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
            });
        }
        return form;
    }
    getFormGroupConfig(data, opts) {
        return Object.assign(Object.assign({}, super.getFormGroupConfig(data)), { __typename: [ObservedLocation.TYPENAME], location: [(data === null || data === void 0 ? void 0 : data.location) || null, Validators.compose([Validators.required, SharedValidators.entity])], startDateTime: [(data === null || data === void 0 ? void 0 : data.startDateTime) || null, this.createStartDateValidator(opts)], endDateTime: [(data === null || data === void 0 ? void 0 : data.endDateTime) || null], measurementValues: this.formBuilder.group({}), observers: this.getObserversFormArray(data === null || data === void 0 ? void 0 : data.observers) });
    }
    updateFormGroup(formGroup, opts) {
        opts = this.fillDefaultOptions(opts);
        // Update the start date validator
        formGroup.get('startDateTime').setValidators(this.createStartDateValidator(opts));
        return formGroup;
    }
    getFormGroupOptions(data) {
        return {
            validators: [SharedFormGroupValidators.dateRange('startDateTime', 'endDateTime')]
        };
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.withObservers = toBoolean(opts.withObservers, toBoolean(opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE), ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === 'true'));
        opts.withMeasurements = toBoolean(opts.withMeasurements, !!opts.program);
        return opts;
    }
    createStartDateValidator(opts) {
        const validators = [Validators.required];
        // Check if a date is at the given day of week
        if (isNotNil(opts.startDateDay)) {
            const weekday = opts.startDateDay;
            const timezone = opts.timezone;
            validators.push((control) => {
                if (!DateUtils.isAtDay(control.value, weekday, timezone)) {
                    control.markAsTouched();
                    return { msg: {
                            key: 'OBSERVED_LOCATION.ERROR.START_DATE_INVALID',
                            params: {
                                day: moment().day(weekday).format('dddd')
                            }
                        } };
                }
                return null;
            });
        }
        return validators.length === 1 ? validators[0] : Validators.compose(validators);
    }
};
ObservedLocationValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService])
], ObservedLocationValidatorService);
export { ObservedLocationValidatorService };
//# sourceMappingURL=observed-location.validator.js.map