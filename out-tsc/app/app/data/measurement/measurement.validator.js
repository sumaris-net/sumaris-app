import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { AppFormArray, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { MeasurementUtils, MeasurementValuesTypes, MeasurementValuesUtils } from './measurement.model';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { TranslateService } from '@ngx-translate/core';
let MeasurementsValidatorService = class MeasurementsValidatorService {
    constructor(formBuilder, translate, settings) {
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.settings = settings;
    }
    getRowValidator(opts) {
        return this.getFormGroup(null, opts);
    }
    getFormGroup(data, opts) {
        opts = this.fillDefaultOptions(opts);
        return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
    }
    getFormGroupConfig(data, opts) {
        opts = this.fillDefaultOptions(opts);
        // Convert the array of Measurement into a normalized map of form values
        const measurementValues = data && (MeasurementValuesUtils.isMeasurementFormValues(data)
            ? data
            // Transform to form values, if need
            : MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(data), opts.pmfms, {
                keepSourceObject: true,
                onlyExistingPmfms: false
            })) || undefined;
        const config = opts.pmfms.reduce((res, pmfm) => {
            const value = measurementValues ? measurementValues[pmfm.id] : null;
            const validator = PmfmValidators.create(pmfm, null, opts);
            // If pmfm is multiple, then use a AppFormArray
            if (pmfm.isMultiple) {
                const formArray = new AppFormArray((v) => this.formBuilder.control(v, validator), PmfmValueUtils.equals, PmfmValueUtils.isEmpty, {
                    allowEmptyArray: false
                });
                if (Array.isArray(value)) {
                    formArray.setValue(value.map(v => isNil(v) ? null : v), { emitEvent: false });
                }
                else {
                    formArray.setValue([null], { emitEvent: false });
                }
                res[pmfm.id] = formArray;
            }
            else {
                res[pmfm.id] = validator ? [value, validator] : [value];
            }
            return res;
        }, {});
        // Validate __typename
        if (opts.withTypename !== false) {
            config['__typename'] = [measurementValues ? measurementValues.__typename : MeasurementValuesTypes.MeasurementFormValue, Validators.required];
        }
        return config;
    }
    getFormGroupOptions(data, opts) {
        return { updateOn: opts === null || opts === void 0 ? void 0 : opts.updateOn };
    }
    updateFormGroup(form, opts) {
        opts = this.fillDefaultOptions(opts);
        // DEBUG
        //console.debug(`[measurement-validator] (${opts?.pmfms?.[0]?.['acquisitionLevel']}) updateFormGroup()`)
        const controlNamesToRemove = Object.getOwnPropertyNames(form.controls)
            // Excluded protected attributes
            .filter(controlName => (!opts.protectedAttributes || !opts.protectedAttributes.includes(controlName)) && controlName !== '__typename');
        opts.pmfms.forEach(pmfm => {
            const controlName = pmfm.id.toString();
            const validator = PmfmValidators.create(pmfm, null, opts);
            const defaultValue = PmfmValueUtils.fromModelValue(pmfm.defaultValue, pmfm) || null;
            // Multiple acquisition: use form array
            if (pmfm.isMultiple) {
                const formArray = new AppFormArray((value) => this.formBuilder.control(value, validator), PmfmValueUtils.equals, PmfmValueUtils.isEmpty, {
                    allowEmptyArray: false
                });
                // TODO set defaultValue
                form.addControl(controlName, formArray, { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
            }
            // Only one acquisition
            else {
                let control = form.get(controlName);
                // If new pmfm: add as control
                if (!control) {
                    control = this.formBuilder.control(defaultValue, validator);
                    form.addControl(controlName, control, { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
                }
                else {
                    control.setValidators(validator);
                }
            }
            // Remove from the remove list
            const index = controlNamesToRemove.indexOf(controlName);
            if (index !== -1)
                controlNamesToRemove.splice(index, 1);
        });
        // Remove unused controls
        controlNamesToRemove.forEach(controlName => form.removeControl(controlName, { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent }));
        // Create control for '__typename' (required)
        const typenameControl = form.get('__typename');
        if (opts.withTypename !== false) {
            if (!typenameControl) {
                // DEBUG
                //console.debug('[measurement-validator] Re add control \'__typename\' to measurement values form group');
                form.addControl('__typename', this.formBuilder.control(MeasurementValuesTypes.MeasurementFormValue, Validators.required), { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
            }
        }
        else if (typenameControl) {
            console.warn('[measurement-validator] Removing control \'__typename\' from measurement values form group. This is not recommended!');
            form.removeControl('__typename', { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
        }
    }
    /* -- protected functions -- */
    fillDefaultOptions(opts) {
        opts = opts || {};
        opts.pmfms = opts.pmfms || [];
        opts.forceOptional = toBoolean(opts.forceOptional, false);
        opts.protectedAttributes = opts.protectedAttributes || ['id', 'rankOrder', 'comments', 'updateDate', '__typename'];
        return opts;
    }
};
MeasurementsValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService])
], MeasurementsValidatorService);
export { MeasurementsValidatorService };
//# sourceMappingURL=measurement.validator.js.map