import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { isNotEmptyArray, isNotNil, LocalSettingsService, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { debounceTime } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
let BatchGroupValidatorService = class BatchGroupValidatorService extends BatchValidatorService {
    constructor(formBuilder, translate, settings, measurementsValidatorService) {
        super(formBuilder, translate, settings, measurementsValidatorService);
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, opts);
        if (opts === null || opts === void 0 ? void 0 : opts.root) {
            config['observedIndividualCount'] = [data && data.observedIndividualCount, SharedValidators.integer];
        }
        return config;
    }
    enableSamplingRatioAndWeight(form, opts) {
        if (!form) {
            console.warn('Argument \'form\' required');
            return null;
        }
        const computeFn = BatchValidators.samplingRatioAndWeight(opts);
        return form.valueChanges
            .pipe(debounceTime((opts === null || opts === void 0 ? void 0 : opts.debounceTime) || 0))
            .subscribe(value => {
            const errors = computeFn(form);
            if (errors)
                form.setErrors(errors);
            if (opts === null || opts === void 0 ? void 0 : opts.markForCheck)
                opts.markForCheck();
        });
    }
    updateFormGroup(form, opts) {
        opts = this.fillDefaultOptions(opts);
        if (opts.qvPmfm) {
            const childrenArray = form.get('children');
            childrenArray.controls.forEach(child => this.updateFormGroup(child, opts.childrenOptions));
        }
        else {
            super.updateFormGroup(form, opts);
        }
    }
    /* -- protected method -- */
    fillDefaultOptions(opts) {
        var _a, _b;
        opts = opts || {};
        opts.root = toBoolean(opts.root, true);
        if (opts.root) {
            opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (((_a = this.settings) === null || _a === void 0 ? void 0 : _a.isOnFieldMode()) || false);
            const weightRequired = opts.isOnFieldMode === false && (opts.weightRequired !== false);
            const individualCountRequired = opts.isOnFieldMode === false && (opts.individualCountRequired === true);
            const withChildrenWeight = opts.withChildrenWeight !== false;
            if (opts.qvPmfm) {
                // Disabled weight/individual required validator, on the root level
                opts.individualCountRequired = false;
                opts.weightRequired = false;
                // Disable children (sum) weight here: should be visible in the sample batch, is any
                opts.withChildrenWeight = false;
                // Configure children (on child by QV)
                opts.withChildren = true;
                opts.childrenCount = ((_b = opts.qvPmfm.qualitativeValues) === null || _b === void 0 ? void 0 : _b.length) || 1;
                opts.childrenOptions = {
                    root: false,
                    withWeight: true,
                    weightRequired,
                    individualCountRequired,
                    pmfms: [opts.qvPmfm, ...(opts.childrenPmfms || [])],
                    withMeasurements: true
                };
                opts.childrenOptions.withChildren = opts.enableSamplingBatch;
                if (opts.childrenOptions.withChildren) {
                    opts.childrenOptions.childrenCount = 1; // One sampling batch
                    opts.childrenOptions.childrenOptions = {
                        root: false,
                        withWeight: true,
                        withMeasurements: false,
                        pmfms: null,
                        withChildrenWeight,
                        // Need for v1 compatibility - sampling batch may not be created
                        labelRequired: false,
                        rankOrderRequired: false
                    };
                }
            }
            else {
                opts.withWeight = true;
                opts.withChildren = opts.enableSamplingBatch;
                opts.weightRequired = weightRequired;
                opts.individualCountRequired = individualCountRequired;
                if (opts.withChildren) {
                    opts.childrenCount = 1; // One sampling batch
                    opts.childrenOptions = {
                        root: false,
                        withWeight: true,
                        withMeasurements: false,
                        pmfms: null,
                        withChildrenWeight,
                        // Need for v1 compatibility - sampling batch may not be created
                        labelRequired: false,
                        rankOrderRequired: false
                    };
                }
            }
            opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms));
            opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);
        }
        return opts;
    }
};
BatchGroupValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService])
], BatchGroupValidatorService);
export { BatchGroupValidatorService };
export class BatchGroupValidators {
    /**
     * Same as BatchValidators.computeSamplingWeight() but for a batch group form
     *
     * @param opts
     */
    static samplingRatioAndWeight(opts) {
        if (!(opts === null || opts === void 0 ? void 0 : opts.qvPmfm)) {
            return (control) => BatchValidators.computeSamplingRatioAndWeight(control, Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
        }
        return Validators.compose((opts.qvPmfm.qualitativeValues || [])
            .map((qv, qvIndex) => {
            const qvFormPath = `children.${qvIndex}`;
            return (control) => {
                const form = control;
                const individualCount = form.get(qvFormPath + '.individualCount');
                const samplingIndividualCount = form.get(qvFormPath + '.children.0.individualCount');
                if (!samplingIndividualCount)
                    return; // Nothing to compute (no sampling batch)
                // Enable controls
                if (individualCount.disabled)
                    individualCount.enable();
                if (samplingIndividualCount.disabled)
                    samplingIndividualCount.enable();
                // Start computation
                return BatchValidators.computeSamplingRatioAndWeight(control.get(qvFormPath), Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
            };
        }));
    }
}
//# sourceMappingURL=batch-group.validator.js.map