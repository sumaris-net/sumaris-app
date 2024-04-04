import { FormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { BehaviorSubject } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AppFormArray, isNotNil, waitForTrue } from '@sumaris-net/ngx-components';
export class MeasurementsTableValidatorService extends BaseValidatorService {
    constructor(injector, _delegate) {
        super(injector.get(FormBuilder), injector.get(TranslateService));
        this._delegate = _delegate;
        this.readySubject = new BehaviorSubject(false);
        this._delegateOptions = null;
        this._measurementsOptions = null;
        this._measurementsConfigCache = null;
        this.measurementsValidatorService = injector.get(MeasurementsValidatorService);
    }
    set delegateOptions(value) {
        this._delegateOptions = value;
    }
    get delegateOptions() {
        return this._delegateOptions;
    }
    set measurementsOptions(value) {
        this._measurementsOptions = value;
        this._measurementsConfigCache = null; // Reset the config cache
    }
    get delegate() {
        return this._delegate;
    }
    getRowValidator(data, opts) {
        var _a;
        const form = this._delegate.getRowValidator(data, Object.assign(Object.assign({}, (this._delegateOptions || {})), opts));
        // Add measurement Values
        // Can be disable (e.g. in Batch Group table) if pmfms = null
        if (isNotNil((_a = this._measurementsOptions) === null || _a === void 0 ? void 0 : _a.pmfms)) {
            form.setControl('measurementValues', this.getMeasurementValuesFormGroup(data === null || data === void 0 ? void 0 : data.measurementValues, this._measurementsOptions), { emitEvent: false });
        }
        return form;
    }
    updateFormGroup(form, opts) {
        this._delegate.updateFormGroup(form, Object.assign(Object.assign({}, (this._delegateOptions || {})), opts));
        // TODO: update using measurement values ?
    }
    ready(opts) {
        return waitForTrue(this.readySubject, opts);
    }
    markAsReady() {
        if (!this.readySubject.value) {
            this.readySubject.next(true);
        }
    }
    /* -- protected -- */
    getMeasurementValuesFormGroup(data, opts) {
        // Create a cached config
        let controlsConfig = this._measurementsConfigCache;
        // If no cache defined
        if (!controlsConfig) {
            // Compute the form group
            controlsConfig = this.measurementsValidatorService.getFormGroupConfig(null, opts);
            // Fill the cache
            this._measurementsConfigCache = controlsConfig;
            return this.formBuilder.group(controlsConfig);
        }
        // Use cache if exists
        else {
            const form = this.formBuilder.group(controlsConfig);
            // Re-create new instance for each array control
            Object.entries(controlsConfig)
                .filter(([key, cachedControl]) => cachedControl instanceof AppFormArray)
                .forEach(([pmfmId, cachedControl]) => {
                const control = new AppFormArray(cachedControl.createControl, cachedControl.equals, cachedControl.isEmpty, cachedControl.options);
                const value = data ? data[pmfmId] : null;
                if (Array.isArray(value)) {
                    control.setValue(value, { emitEvent: false });
                }
                else {
                    control.setValue([null], { emitEvent: false });
                }
                form.setControl(pmfmId, control, { emitEvent: false });
            });
            return form;
        }
    }
}
//# sourceMappingURL=measurements-table.validator.js.map