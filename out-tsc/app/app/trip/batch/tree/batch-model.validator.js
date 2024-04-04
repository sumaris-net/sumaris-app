import { __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { AppFormArray, AppFormUtils, isEmptyArray, isNil, isNotEmptyArray, isNotNil, LocalSettingsService, ReferentialRef, removeDuplicatesFromArray, TreeItemEntityUtils, } from '@sumaris-net/ngx-components';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Batch } from '@app/trip/batch/common/batch.model';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { TranslateService } from '@ngx-translate/core';
import { BatchModel, BatchModelFilter, BatchModelUtils } from '@app/trip/batch/tree/batch-tree.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { environment } from '@environments/environment';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { Rule } from '@app/referential/services/model/rule.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchRules } from '@app/trip/batch/tree/batch-tree.rules';
let BatchModelValidatorService = class BatchModelValidatorService extends BatchValidatorService {
    constructor(formBuilder, translate, measurementsValidatorService, batchRules, settings) {
        super(formBuilder, translate, settings, measurementsValidatorService);
        this.batchRules = batchRules;
        this.debug = !environment.production;
    }
    createModel(data, opts) {
        // Map sorting pmfms
        opts.sortingPmfms = (opts.sortingPmfms || []).map(p => {
            var _a;
            // Fill CHILD_GEAR qualitative values, with the given opts.physicalGear
            if (((_a = opts === null || opts === void 0 ? void 0 : opts.physicalGear) === null || _a === void 0 ? void 0 : _a.children) && p.id === PmfmIds.CHILD_GEAR) {
                // Convert to referential item
                p = p.clone();
                p.type = 'qualitative_value';
                p.qualitativeValues = (opts.physicalGear.children || []).map(pg => ReferentialRef.fromObject({
                    id: pg.rankOrder,
                    label: pg.rankOrder,
                    name: pg.measurementValues[PmfmIds.GEAR_LABEL] || pg.gear.name
                }));
                if (isEmptyArray(p.qualitativeValues)) {
                    console.warn(`[batch-model-validator] Unable to fill items for Pmfm#${p.id} (${p.label})`);
                }
                else {
                    // DEBUG
                    console.debug(`[batch-tree-container] Fill CHILD_GEAR PMFM, with:`, p.qualitativeValues);
                }
            }
            return p;
        }).filter(isNotNil);
        // Create rules
        const allowDiscard = opts.allowDiscard !== false;
        let rules = (opts.rules || []);
        if (allowDiscard) {
            rules = [
                ...rules,
                // Landing rules
                Rule.fromObject({
                    precondition: true,
                    filter: ({ model }) => PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.LANDING),
                    // Avoid discard pmfms
                    children: this.batchRules.getNotDiscardPmfms('pmfm.')
                }),
                // Discard rules
                Rule.fromObject({
                    precondition: true,
                    filter: ({ model }) => {
                        var _a;
                        return PmfmValueUtils.equals(model.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD)
                            || PmfmValueUtils.equals((_a = model.parent) === null || _a === void 0 ? void 0 : _a.originalData.measurementValues[PmfmIds.DISCARD_OR_LANDING], QualitativeValueIds.DISCARD_OR_LANDING.DISCARD);
                    },
                    // Avoid landing pmfms
                    children: this.batchRules.getNotLandingPmfms('pmfm.')
                })
            ];
        }
        else {
            rules = [...rules,
                // No discard pmfms
                ...this.batchRules.getNotDiscardPmfms('pmfm.')
            ];
        }
        // Create a batch model
        const model = BatchModelUtils.createModel(data, Object.assign(Object.assign({}, opts), { rules }));
        if (!model)
            return;
        // Special case for discard batches
        {
            if (allowDiscard) {
                // Disable the discard batch, if not a leaf
                TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject({
                    measurementValues: {
                        [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
                    },
                    hidden: false,
                    isLeaf: false
                }))
                    .forEach(batch => {
                    var _a;
                    batch.pmfms = [];
                    batch.state = Object.assign(Object.assign({}, batch.state), { requiredWeight: false });
                    batch.hidden = true;
                    // Add 'discard' into the children name
                    (_a = batch.children) === null || _a === void 0 ? void 0 : _a.forEach(child => {
                        child.name = [batch.name, child.name].join(', ');
                    });
                });
                // Enable sampling batch, in VRAC batches
                TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject({
                    parent: {
                        measurementValues: {
                            [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
                        }
                    },
                    hidden: false,
                    measurementValues: {
                        [PmfmIds.BATCH_SORTING]: QualitativeValueIds.BATCH_SORTING.BULK
                    }
                }))
                    .forEach(batch => {
                    const weightPmfms = (batch.childrenPmfms || []).filter(PmfmUtils.isWeight).map(p => p.clone());
                    if (isNotEmptyArray(weightPmfms)) {
                        // Add weights PMFM (if not found)
                        const pmfms = removeDuplicatesFromArray([
                            ...batch.pmfms,
                            ...weightPmfms
                        ], 'id');
                        // Update the state, to enable weight (and sampling weight)
                        batch.state = Object.assign(Object.assign({}, batch.state), { pmfms, showWeight: true, requiredWeight: true, showSamplingBatch: true, showSampleWeight: true, requiredSampleWeight: true, samplingBatchEnabled: true });
                    }
                });
                // Enable weight in HORS-VRAC batches
                TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject({
                    parent: {
                        measurementValues: {
                            [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
                        }
                    },
                    hidden: false,
                    measurementValues: {
                        [PmfmIds.BATCH_SORTING]: QualitativeValueIds.BATCH_SORTING.NON_BULK
                    }
                }))
                    .forEach(batch => {
                    const weightPmfms = (batch.childrenPmfms || []).filter(PmfmUtils.isWeight).map(p => p.clone());
                    if (isNotEmptyArray(weightPmfms)) {
                        // Add weights PMFM (if not found)
                        const pmfms = removeDuplicatesFromArray([
                            ...batch.pmfms,
                            ...weightPmfms
                        ], 'id');
                        // Update the state, to enable weight
                        batch.state = Object.assign(Object.assign({}, batch.state), { pmfms, showWeight: true, requiredWeight: true, showSamplingBatch: false, samplingBatchEnabled: false, showExhaustiveInventory: false });
                        batch.originalData.exhaustiveInventory = true;
                    }
                });
                // Activer le champ "Inventaire exhaustif des espèces ?"
                TreeItemEntityUtils.findByFilter(model, BatchModelFilter.fromObject({
                    hidden: false,
                    isLeaf: true
                }))
                    .forEach(leafBatch => {
                    if (isNil(leafBatch.state.showExhaustiveInventory)) {
                        leafBatch.state = Object.assign(Object.assign({}, leafBatch.state), { showExhaustiveInventory: true });
                    }
                });
            }
            else {
                const discardFilter = BatchModelFilter.fromObject({
                    measurementValues: {
                        [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD
                    }
                });
                TreeItemEntityUtils.deleteByFilter(model, discardFilter);
            }
        }
        // Translate the root name
        if (!model.parent && model.name) {
            model.name = this.translate.instant(model.name);
        }
        if (this.debug)
            BatchModelUtils.logTree(model);
        return model;
    }
    createFormGroupByModel(model, opts) {
        var _a, _b;
        if (!model)
            throw new Error('Missing required argument \'model\'');
        if (!opts)
            throw new Error('Missing required argument \'opts\'');
        // DEBUG
        console.debug(`- ${(_a = model.originalData) === null || _a === void 0 ? void 0 : _a.label} ${model.path}`);
        const weightPmfms = model.weightPmfms;
        const withWeight = isNotEmptyArray(weightPmfms);
        // Init weight object
        if (withWeight) {
            model.originalData.weight = BatchUtils.getWeight(model.originalData, model.weightPmfms);
        }
        if (model.isLeaf && isNotEmptyArray(model.originalData.children)) {
            const childrenWeightPmfms = (model.childrenPmfms || []).filter(PmfmUtils.isWeight);
            if (isNotEmptyArray(childrenWeightPmfms)) {
                model.originalData.children.forEach(batch => {
                    batch.weight = BatchUtils.getWeight(batch, childrenWeightPmfms);
                    const samplingBatch = BatchUtils.getSamplingChild(batch);
                    if (samplingBatch)
                        samplingBatch.weight = BatchUtils.getWeight(samplingBatch, childrenWeightPmfms);
                });
            }
        }
        const form = this.getFormGroup(model.originalData, {
            pmfms: model.pmfms,
            withMeasurements: true,
            withMeasurementTypename: true,
            withWeight,
            weightRequired: opts.isOnFieldMode === false && withWeight,
            withChildren: model.isLeaf,
            childrenPmfms: model.isLeaf && model.childrenPmfms,
            allowSpeciesSampling: opts.allowSpeciesSampling,
            isOnFieldMode: opts.isOnFieldMode,
            updateOn: opts.updateOn
        });
        // Update model valid marker (check this BEFORE to add the children form array)
        model.valid = form.valid;
        if (form.invalid) {
            AppFormUtils.logFormErrors(form, '[batch-model-validator] ' + model.name + ' > ');
        }
        // Recursive call, on each children model
        if (!model.isLeaf) {
            const childrenFormArray = new AppFormArray((m) => this.createFormGroupByModel(m, opts), BatchModel.equals, BatchModel.isEmpty, {
                allowReuseControls: false,
                allowEmptyArray: true,
                updateOn: opts === null || opts === void 0 ? void 0 : opts.updateOn
            });
            if ((_b = model.state) === null || _b === void 0 ? void 0 : _b.showSamplingBatch) {
                const samplingForm = super.getFormGroup(null);
                samplingForm.setControl('children', childrenFormArray, { emitEvent: false });
                form.setControl('children', this.formBuilder.array([samplingForm]), { emitEvent: false });
                childrenFormArray.patchValue(model.children || []);
            }
            else {
                form.setControl('children', childrenFormArray, { emitEvent: false });
                childrenFormArray.patchValue(model.children || []);
            }
        }
        else {
            const childrenFormArray = new AppFormArray((value) => new UntypedFormControl(value), Batch.equals, BatchUtils.isEmpty, {
                allowReuseControls: false,
                allowEmptyArray: true,
                updateOn: opts === null || opts === void 0 ? void 0 : opts.updateOn
            });
            form.setControl('children', childrenFormArray, { emitEvent: false });
            childrenFormArray.patchValue(model.originalData.children || []);
        }
        model.validator = form;
        return form;
    }
    getFormGroup(data, opts) {
        return super.getFormGroup(data, Object.assign(Object.assign({}, opts), { qvPmfm: null }));
    }
    getFormGroupConfig(data, opts) {
        const config = super.getFormGroupConfig(data, Object.assign(Object.assign({}, opts), { withChildren: false, withMeasurements: false }));
        delete config.parent;
        delete config.children;
        delete config.measurementValues;
        // Children array:
        if (opts === null || opts === void 0 ? void 0 : opts.withChildren) {
            if (isNotEmptyArray(opts.childrenPmfms)) {
                // DEBUG
                //console.debug(`[batch-model-validator] ${data?.label} Creating children form array, with pmfms: `, opts.childrenPmfms);
                config['children'] = this.getChildrenFormArray(data === null || data === void 0 ? void 0 : data.children, Object.assign(Object.assign({ withWeight: true, withMeasurements: true }, opts), { allowSamplingBatch: undefined, withChildren: opts.allowSpeciesSampling, withChildrenWeight: true, pmfms: opts.childrenPmfms || null, childrenPmfms: null }));
            }
            // E.g. individual measures
            else {
                config['children'] = this.formBuilder.array([]);
                // TODO add individual measures pmfms
                /*config['children'] = this.getChildrenFormArray(data?.children, {
                  withWeight: false,
                  withMeasurements: true,
                  ...opts,
                  allowSamplingBatch: undefined,
                  withChildren: false,
                  pmfms: opts.individualPmfms || null,
                });*/
            }
        }
        // Add measurement values
        if (opts === null || opts === void 0 ? void 0 : opts.withMeasurements) {
            if (isNotEmptyArray(opts.pmfms)) {
                config['measurementValues'] = this.getMeasurementValuesForm(data === null || data === void 0 ? void 0 : data.measurementValues, {
                    pmfms: opts.pmfms,
                    forceOptional: false,
                    withTypename: opts.withMeasurementTypename,
                    updateOn: opts === null || opts === void 0 ? void 0 : opts.updateOn
                });
            }
            else {
                // WARN: we need to keep existing measurement (e.g. for individual sub-batch)
                // => create a simple control, without PMFMs validation. This should be done in sub-batch form/modal
                config['measurementValues'] = this.formBuilder.control((data === null || data === void 0 ? void 0 : data.measurementValues) || null);
            }
        }
        return config;
    }
    fillDefaultOptions(opts) {
        opts = super.fillDefaultOptions(opts);
        return opts;
    }
};
BatchModelValidatorService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        MeasurementsValidatorService,
        BatchRules,
        LocalSettingsService])
], BatchModelValidatorService);
export { BatchModelValidatorService };
//# sourceMappingURL=batch-model.validator.js.map