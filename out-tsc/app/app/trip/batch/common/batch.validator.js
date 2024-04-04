import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, Validators, } from '@angular/forms';
import { AppFormArray, EntityUtils, equals, isNil, isNotEmptyArray, isNotNil, isNotNilOrNaN, LocalSettingsService, SharedAsyncValidators, SharedValidators, toBoolean, toFloat, toNumber, } from '@sumaris-net/ngx-components';
import { Batch } from './batch.model';
import { MethodIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { roundHalfUp } from '@app/shared/functions';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { debounceTime } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
export function getFormOptions(form) {
    return form['__options'];
}
export function setFormOptions(form, opts) {
    form['__options'] = opts;
}
let BatchValidatorService = class BatchValidatorService extends DataEntityValidatorService {
    constructor(formBuilder, translate, settings, measurementsValidatorService) {
        super(formBuilder, translate, settings);
        this.measurementsValidatorService = measurementsValidatorService;
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        opts.withWeight = toBoolean(opts.withWeight, true);
        opts.withChildrenWeight = toBoolean(opts.withChildrenWeight, false);
        return opts;
    }
    getFormGroupConfig(data, opts) {
        var _a;
        const rankOrder = toNumber(data === null || data === void 0 ? void 0 : data.rankOrder, null);
        const label = (data === null || data === void 0 ? void 0 : data.label) || null;
        const samplingRatioComputed = data && (isNotNil(data.samplingRatioComputed) ? data.samplingRatioComputed : BatchUtils.isSamplingRatioComputed(data.samplingRatioText)) || false;
        const config = {
            __typename: [Batch.TYPENAME],
            id: [toNumber(data === null || data === void 0 ? void 0 : data.id, null)],
            updateDate: [(data === null || data === void 0 ? void 0 : data.updateDate) || null],
            rankOrder: (opts === null || opts === void 0 ? void 0 : opts.rankOrderRequired) !== false ? [rankOrder, Validators.required] : [rankOrder],
            label: (opts === null || opts === void 0 ? void 0 : opts.labelRequired) !== false ? [label, Validators.required] : [label],
            individualCount: [toNumber(data === null || data === void 0 ? void 0 : data.individualCount, null),
                ((opts === null || opts === void 0 ? void 0 : opts.individualCountRequired) === true)
                    ? Validators.compose([Validators.required, Validators.min(0), SharedValidators.integer])
                    : Validators.compose([Validators.min(0), SharedValidators.integer])
            ],
            samplingRatio: [toNumber(data === null || data === void 0 ? void 0 : data.samplingRatio, null), SharedValidators.decimal()],
            samplingRatioText: [(data === null || data === void 0 ? void 0 : data.samplingRatioText) || null],
            samplingRatioComputed: [samplingRatioComputed],
            taxonGroup: [(data === null || data === void 0 ? void 0 : data.taxonGroup) || null, SharedValidators.entity],
            taxonName: [(data === null || data === void 0 ? void 0 : data.taxonName) || null, SharedValidators.entity],
            exhaustiveInventory: [toBoolean(data === null || data === void 0 ? void 0 : data.exhaustiveInventory, null)],
            comments: [(data === null || data === void 0 ? void 0 : data.comments) || null],
            parent: [(data === null || data === void 0 ? void 0 : data.parent) || null, SharedValidators.entity],
            // Quality properties
            controlDate: [(data === null || data === void 0 ? void 0 : data.controlDate) || null],
            qualificationDate: [(data === null || data === void 0 ? void 0 : data.qualificationDate) || null],
            qualificationComments: [(data === null || data === void 0 ? void 0 : data.qualificationComments) || null],
            qualityFlagId: [toNumber(data === null || data === void 0 ? void 0 : data.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)],
            // Sub forms
            measurementValues: this.formBuilder.group({}),
            // TODO: add operationId, saleId, parentId
        };
        // there is a second level of children only if there is qvPmfm and sampling batch columns
        if (opts === null || opts === void 0 ? void 0 : opts.withChildren) {
            const childrenArray = this.getChildrenFormArray(data === null || data === void 0 ? void 0 : data.children, Object.assign(Object.assign({}, opts.childrenOptions), { isOnFieldMode: opts === null || opts === void 0 ? void 0 : opts.isOnFieldMode }));
            if ((opts === null || opts === void 0 ? void 0 : opts.childrenCount) > 0) {
                childrenArray.resize(opts === null || opts === void 0 ? void 0 : opts.childrenCount);
            }
            config['children'] = childrenArray;
        }
        else {
            config['children'] = this.formBuilder.array([]);
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.withWeight) || (opts === null || opts === void 0 ? void 0 : opts.withChildrenWeight)) {
            const weightPmfms = (_a = opts.pmfms) === null || _a === void 0 ? void 0 : _a.filter(PmfmUtils.isWeight);
            // Add weight sub form
            if (opts.withWeight) {
                config['weight'] = this.getWeightFormGroup(data === null || data === void 0 ? void 0 : data.weight, {
                    required: opts === null || opts === void 0 ? void 0 : opts.weightRequired,
                    pmfm: BatchUtils.getWeightPmfm(data === null || data === void 0 ? void 0 : data.weight, weightPmfms)
                });
            }
            // Add weight sub form
            if (opts.withChildrenWeight) {
                config['childrenWeight'] = this.getWeightFormGroup(data === null || data === void 0 ? void 0 : data.childrenWeight, {
                    required: false,
                    pmfm: BatchUtils.getWeightPmfm(data === null || data === void 0 ? void 0 : data.childrenWeight, weightPmfms),
                    maxDecimals: false // Disable decimals validator
                });
            }
        }
        // Add measurement values
        if ((opts === null || opts === void 0 ? void 0 : opts.withMeasurements) && isNotEmptyArray(opts.pmfms)) {
            config['measurementValues'] = this.getMeasurementValuesForm(data === null || data === void 0 ? void 0 : data.measurementValues, {
                pmfms: opts.pmfms,
                forceOptional: opts.isOnFieldMode,
                withTypename: opts.withMeasurementTypename
            });
        }
        return config;
    }
    getChildrenFormArray(data, opts) {
        const formArray = new AppFormArray((value) => this.getFormGroup(value, Object.assign({ withWeight: true, withMeasurements: true }, opts)), (v1, v2) => EntityUtils.equals(v1, v2, 'label'), (value) => isNil(value), {
            allowEmptyArray: true,
            allowReuseControls: false
        });
        if (data) {
            formArray.patchValue(data);
        }
        return formArray;
    }
    getFormGroupOptions(data, opts) {
        let validators;
        // Add a form group control, to make sure weight > 0 if individual
        // (skip if no weight, or on field mode)
        if ((opts === null || opts === void 0 ? void 0 : opts.withWeight) && (opts === null || opts === void 0 ? void 0 : opts.isOnFieldMode) === false) {
            validators = BatchValidators.weightForIndividualCount;
        }
        return validators ? { validators } : null;
    }
    updateFormGroup(form, opts) {
        var _a, _b;
        opts = this.fillDefaultOptions(opts);
        const weightPmfms = (_a = opts.pmfms) === null || _a === void 0 ? void 0 : _a.filter(PmfmUtils.isWeight);
        // Individual count
        {
            const individualCountControl = form.get('individualCount');
            if (opts.individualCountRequired === true) {
                individualCountControl.setValidators(Validators.compose([Validators.required, Validators.min(0), SharedValidators.integer]));
            }
            else {
                individualCountControl.setValidators(Validators.compose([Validators.min(0), SharedValidators.integer]));
            }
            individualCountControl.updateValueAndValidity();
        }
        // Weight
        {
            const weightForm = form.get('weight');
            // Remove if exists, and not need anymore
            if (!opts.withWeight) {
                if (weightForm) {
                    weightForm.disable({ onlySelf: true });
                    weightForm.setValidators(null);
                    form.removeControl('weight');
                }
            }
            else {
                // Add if missing
                if (!weightForm) {
                    form.addControl('weight', this.getWeightFormGroup(null, {
                        required: opts.weightRequired
                    }));
                }
                // Update if already exist
                else {
                    this.updateWeightFormGroup(weightForm, {
                        required: opts.weightRequired
                    });
                    if (weightForm.disabled)
                        weightForm.enable({ onlySelf: true });
                }
            }
        }
        // Children weight (=sum of children weight)
        {
            const childrenWeightForm = form.get('childrenWeight');
            if (opts.withChildrenWeight) {
                // Create if need
                if (!childrenWeightForm) {
                    form.addControl('childrenWeight', this.getWeightFormGroup(null, {
                        required: false,
                        pmfm: BatchUtils.getWeightPmfm(null, weightPmfms),
                        maxDecimals: false // Disable decimals validator
                    }));
                }
            }
            else if (childrenWeightForm) {
                form.removeControl('childrenWeight');
            }
        }
        // Update form validators (if need)
        const validators = (_b = this.getFormGroupOptions(null, opts)) === null || _b === void 0 ? void 0 : _b.validators;
        if (validators) {
            if (Array.isArray(validators) || !form.hasValidator(validators)) {
                form.setValidators(validators);
            }
        }
        else {
            form.clearValidators();
        }
    }
    enableSamplingRatioAndWeight(form, opts) {
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
    enableRoundWeightConversion(form, opts) {
        return SharedAsyncValidators.registerAsyncValidator(form, BatchValidators.roundWeightConversion(opts), { markForCheck: opts === null || opts === void 0 ? void 0 : opts.markForCheck });
    }
    /* -- protected functions -- */
    getWeightFormGroup(data, opts) {
        const form = this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
        setFormOptions(form, opts);
        return form;
    }
    updateWeightFormGroup(form, opts) {
        const previousOptions = getFormOptions(form);
        opts = Object.assign(Object.assign({}, getFormOptions(form)), opts);
        if (!equals(previousOptions, opts)) {
            const control = form.get('value');
            control.setValidators(BatchWeightValidator.getValueValidator(opts));
            control.updateValueAndValidity();
            setFormOptions(form, opts);
        }
    }
    getMeasurementValuesForm(data, opts) {
        const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
        return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
    }
};
BatchValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService])
], BatchValidatorService);
export { BatchValidatorService };
export class BatchWeightValidator {
    /**
     *
     * @param data
     * @param opts Use 'required' or 'maxDecimals'
     */
    static getFormGroupConfig(data, opts) {
        const validator = this.getValueValidator(opts);
        return {
            methodId: [toNumber(data === null || data === void 0 ? void 0 : data.methodId, null), SharedValidators.integer],
            estimated: [toBoolean(data === null || data === void 0 ? void 0 : data.estimated, null)],
            computed: [toBoolean(data === null || data === void 0 ? void 0 : data.computed, null)],
            value: [toNumber(data === null || data === void 0 ? void 0 : data.value, null), validator]
        };
    }
    /**
     *
     * @param data
     * @param opts Use 'required' or 'maxDecimals'
     */
    static getValueValidator(opts) {
        var _a, _b;
        const maxDecimals = toNumber((opts === null || opts === void 0 ? void 0 : opts.pmfm) && ((_a = opts.pmfm) === null || _a === void 0 ? void 0 : _a.maximumNumberDecimals), (opts === null || opts === void 0 ? void 0 : opts.maxDecimals) || 3 /* grams by default */);
        const required = toBoolean(opts === null || opts === void 0 ? void 0 : opts.required, toBoolean((opts === null || opts === void 0 ? void 0 : opts.pmfm) && ((_b = opts.pmfm) === null || _b === void 0 ? void 0 : _b.required), false));
        return (opts === null || opts === void 0 ? void 0 : opts.maxDecimals) === false && !required
            ? null
            : (required
                ? Validators.compose([Validators.required, SharedValidators.decimal({ maxDecimals })])
                : SharedValidators.decimal({ maxDecimals }));
    }
}
export class BatchValidators {
    /**
     * Check if weight > 0 when individualCount > 0
     *
     * @param control
     */
    static weightForIndividualCount(control) {
        var _a;
        const individualCount = control.get('individualCount').value;
        if (individualCount > 0) {
            const weightForm = control.get('weight');
            const weight = (_a = weightForm === null || weightForm === void 0 ? void 0 : weightForm.get('value')) === null || _a === void 0 ? void 0 : _a.value;
            if (isNotNil(weight) && weight <= 0) {
                return { weightForIndividualCount: { individualCount } };
            }
        }
    }
    /**
     * Computing weight, sampling weight and/or sampling ratio
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
            return (control) => BatchValidators.computeSamplingRatioAndWeight(control.get(qvFormPath), Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
        }));
        return (control) => BatchValidators.computeSamplingRatioAndWeight(control, Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
    }
    static roundWeightConversion(opts) {
        return (control) => BatchValidators.computeRoundWeightConversion(control, Object.assign(Object.assign({}, opts), { emitEvent: false, onlySelf: false }));
    }
    static computeSamplingRatioAndWeight(form, opts) {
        var _a, _b, _c;
        if (!opts.samplingRatioFormat)
            throw Error('[batch-validator] Missing sampling ratio format. Skip computation');
        const samplingFormPath = 'children.0';
        const samplingForm = form.get(samplingFormPath);
        if (!samplingForm)
            return; // No sample batch: skip
        const totalWeightControl = form.get('weight');
        if (!totalWeightControl)
            return; // No weight: skip
        const totalWeightValueControl = totalWeightControl.get('value');
        //const samplingWeightPath = opts?.samplingWeightPath || `${samplingFormPath}.weight`;
        const samplingWeightForm = samplingForm.get('weight');
        const samplingWeightValueControl = samplingWeightForm.get('value');
        //const samplingRatioPath = opts?.samplingRatioPath || `${samplingFormPath}.samplingRatio`;
        const samplingRatioControl = samplingForm.get('samplingRatio');
        const totalWeight = toFloat((_a = totalWeightControl.value) === null || _a === void 0 ? void 0 : _a.value);
        if (totalWeightControl.disabled)
            totalWeightControl.enable(opts);
        if (samplingRatioControl.disabled)
            samplingRatioControl.enable(opts);
        if (samplingWeightForm.disabled)
            samplingWeightForm.enable(opts);
        const batch = form.value;
        if (!batch.weight) {
            batch.weight = {
                value: totalWeight || 0,
                computed: false,
                estimated: false
            };
        }
        const isTotalWeightComputed = batch.weight.computed;
        const isTotalWeightValid = !isTotalWeightComputed && isNotNilOrNaN(totalWeight) && totalWeight >= 0;
        let samplingBatch = BatchUtils.getSamplingChild(batch);
        const samplingWeight = (samplingWeightForm === null || samplingWeightForm === void 0 ? void 0 : samplingWeightForm.value) || samplingBatch.weight;
        const isSamplingWeightComputed = samplingWeight.computed === true && samplingWeight.methodId !== MethodIds.CALCULATED_WEIGHT_LENGTH_SUM;
        if (!samplingBatch) {
            samplingBatch = samplingForm.value;
            batch.children.push(samplingBatch);
        }
        if (!samplingBatch.weight) {
            samplingBatch.weight = {
                value: toNumber(samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value, 0),
                computed: false,
                estimated: false,
                methodId: toNumber(samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.methodId, batch.weight.methodId)
            };
        }
        const isSamplingWeightValid = !isSamplingWeightComputed && isNotNilOrNaN(samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value) && samplingWeight.value >= 0;
        opts.samplingRatioFormat = opts.samplingRatioFormat || BatchUtils.getSamplingRatioFormat(samplingBatch.samplingRatioText);
        if (!opts.samplingRatioFormat) {
            console.warn('[batch-validator] Missing sampling ratio type. Skip computation');
            return;
        }
        const isSamplingRatioComputed = isNotNil(samplingBatch.samplingRatioComputed)
            ? samplingBatch.samplingRatioComputed
            : BatchUtils.isSamplingRatioComputed(samplingBatch.samplingRatioText, opts.samplingRatioFormat);
        const samplingRatio = samplingBatch.samplingRatio;
        const isSamplingRatioValid = !isSamplingRatioComputed && isNotNilOrNaN(samplingRatio) && samplingRatio >= 0 && samplingRatio <= 1;
        // DEBUG
        console.debug(`[batch-validator] Start computing: totalWeight=${totalWeight}, samplingRatio=${samplingRatio}${isSamplingRatioComputed ? ' (computed)' : ''}, samplingWeight=${samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value}`);
        // ***********
        // samplingRatio = totalWeight/samplingWeight
        // ***********
        if (isTotalWeightValid && isSamplingWeightValid) {
            // If samplingWeight > totalWeight => Error
            if (toNumber(samplingWeight.value) > toNumber(totalWeight)) {
                // Before error, try to recompute from invalid sampling weight - fix ADAP issue #482
                if (isTotalWeightValid && isSamplingRatioValid && samplingWeight.computed) {
                    const computedSamplingWeight = roundHalfUp(totalWeight * samplingRatio, opts.weightMaxDecimals || 3);
                    console.debug('[batch-validator] Applying computed sampling weight = ' + computedSamplingWeight);
                    if ((samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value) !== computedSamplingWeight) {
                        samplingWeightForm.patchValue({
                            computed: true,
                            estimated: false,
                            value: computedSamplingWeight,
                            methodId: MethodIds.CALCULATED
                        }, opts);
                    }
                    return;
                }
                // Add max error (if not yet defined)
                if (((_c = (_b = samplingWeightValueControl.errors) === null || _b === void 0 ? void 0 : _b.max) === null || _c === void 0 ? void 0 : _c.max) !== totalWeight) {
                    samplingWeightValueControl.markAsPending({ onlySelf: true, emitEvent: true });
                    samplingWeightValueControl.markAsTouched({ onlySelf: true });
                    samplingWeightValueControl.setErrors(Object.assign(Object.assign({}, samplingWeightValueControl.errors), { max: { max: totalWeight } }), opts);
                }
                return { max: { max: totalWeight } }; // Stop with an error
            }
            else {
                SharedValidators.clearError(samplingWeightValueControl, 'max');
            }
            // Update sampling ratio
            const computedSamplingRatio = (totalWeight === 0 || samplingWeight.value === 0) ? 0 : samplingWeight.value / totalWeight;
            if (samplingRatioControl.value !== computedSamplingRatio || !isSamplingRatioComputed) {
                console.debug('[batch-validator] Applying computed sampling ratio = ' + samplingBatch.samplingRatio);
                samplingForm.patchValue({
                    samplingRatio: computedSamplingRatio,
                    samplingRatioText: `${samplingWeight.value}/${totalWeight}`,
                    samplingRatioComputed: true
                }, opts);
            }
            return;
        }
        // ***********
        // samplingWeight = totalWeight * samplingRatio
        // ***********
        else if (isSamplingRatioValid && isTotalWeightValid) {
            if (isSamplingWeightComputed || isNil(samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value)) {
                const computedSamplingWeight = roundHalfUp(totalWeight * samplingRatio, opts.weightMaxDecimals || 3);
                if ((samplingWeight === null || samplingWeight === void 0 ? void 0 : samplingWeight.value) !== computedSamplingWeight) {
                    samplingWeightForm.patchValue({
                        computed: true,
                        estimated: false,
                        value: computedSamplingWeight,
                        methodId: MethodIds.CALCULATED
                    }, opts);
                }
                return;
            }
        }
        // ***********
        // totalWeight = samplingWeight / samplingRatio
        // ***********
        else if (isSamplingRatioValid && isSamplingWeightValid && samplingRatio > 0) {
            if (isTotalWeightComputed || isNil(totalWeight)) {
                const computedTotalWeight = roundHalfUp(samplingWeight.value / samplingRatio, opts.weightMaxDecimals || 3);
                if (totalWeight !== computedTotalWeight) {
                    totalWeightControl.patchValue({
                        computed: true,
                        estimated: false,
                        value: computedTotalWeight,
                        methodId: MethodIds.CALCULATED
                    }, opts);
                    samplingWeightForm.patchValue({ computed: false }, opts);
                    return;
                }
            }
        }
        // ***********
        // Nothing can be computed: enable all controls
        // ***********
        else {
            // Enable total weight (and remove computed value, if any)
            if (isTotalWeightComputed) {
                totalWeightControl.patchValue({
                    value: null,
                    computed: false,
                    estimated: false
                }, opts);
                if (!isTotalWeightValid && !totalWeightValueControl.hasError('required')) {
                    totalWeightValueControl.markAsPending({ onlySelf: true, emitEvent: true });
                    totalWeightValueControl.markAsTouched({ onlySelf: true });
                    totalWeightValueControl.setErrors(Object.assign(Object.assign({}, totalWeightValueControl.errors), { required: true }), opts);
                }
            }
            if (totalWeightControl.disabled)
                totalWeightControl.enable(opts);
            if (samplingForm.enabled) {
                // Clear computed sampling ratio
                if (isSamplingRatioComputed) {
                    samplingForm.patchValue({
                        samplingRatio: null,
                        samplingRatioText: null,
                        samplingRatioComputed: false
                    }, opts);
                }
                // Enable sampling ratio
                if (samplingRatioControl.disabled)
                    samplingRatioControl.enable(Object.assign(Object.assign({}, opts), { emitEvent: true /*force repaint*/ }));
                // Enable sampling weight (and remove computed value, if any)
                if (isSamplingWeightComputed) {
                    samplingWeightForm.patchValue({
                        value: null,
                        computed: false,
                        estimated: false
                    }, opts);
                }
                // If sampling weight is required, but a value is expected
                // BUT skip if totalWeight=0
                if (!isSamplingWeightValid && (opts === null || opts === void 0 ? void 0 : opts.requiredSampleWeight) === true && totalWeight !== 0) {
                    if (!samplingWeightValueControl.hasError('required')) {
                        samplingWeightValueControl.setErrors(Object.assign(Object.assign({}, samplingWeightValueControl.errors), { required: true }), opts);
                    }
                }
                else {
                    SharedValidators.clearError(samplingWeightValueControl, 'required');
                }
                if (samplingWeightForm.disabled)
                    samplingWeightForm.enable(opts);
            }
            // Disable sampling fields
            else {
                if (samplingRatioControl.enabled)
                    samplingRatioControl.disable(Object.assign(Object.assign({}, opts), { emitEvent: true /*force repaint*/ }));
                if (samplingWeightForm.enabled)
                    samplingWeightForm.disable(opts);
            }
        }
    }
    /**
     * Converting length into a weight
     *
     * @param form
     * @param opts
     */
    static computeRoundWeightConversion(form, opts) {
        const weightPath = (opts === null || opts === void 0 ? void 0 : opts.weightPath) || 'weight';
        let weightControl = form.get(weightPath);
        // Create weight control - should not occur ??
        if (!weightControl) {
            console.warn('Creating missing weight control - Please add it to the validator instead');
            const weightValidators = (opts === null || opts === void 0 ? void 0 : opts.requiredWeight) ? Validators.required : undefined;
            weightControl = new UntypedFormControl(null, weightValidators);
            form.addControl(weightPath, weightControl);
        }
        if (weightControl.disabled)
            weightControl.enable(opts);
        //const weight = weightControl.value;
        // DEBUG
        console.debug('[batch-validator] Start computing round weight: ');
        // TODO
        return null;
    }
}
export const BATCH_VALIDATOR_I18N_ERROR_KEYS = {
    weightForIndividualCount: 'TRIP.BATCH.ERROR.INVALID_WEIGHT_FOR_INDIVIDUAL_COUNT'
};
//# sourceMappingURL=batch.validator.js.map