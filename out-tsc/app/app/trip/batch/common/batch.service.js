import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AppFormUtils, changeCaseToUnderscore, FormErrorTranslator, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, toNumber, } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, MethodIds } from '@app/referential/services/model/model.enum';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchGroupValidators, BatchGroupValidatorService } from '@app/trip/batch/group/batch-group.validator';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchGroup, BatchGroupUtils } from '@app/trip/batch/group/batch-group.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { TranslateService } from '@ngx-translate/core';
import { MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { countSubString } from '@app/shared/functions';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { ProgressionModel } from '@app/shared/progression/progression.model';
let BatchService = class BatchService {
    constructor(formBuilder, translate, settings, measurementsValidatorService, programRefService, batchGroupValidatorService, batchModelValidatorService, physicalGearService, formErrorTranslator) {
        this.formBuilder = formBuilder;
        this.translate = translate;
        this.settings = settings;
        this.measurementsValidatorService = measurementsValidatorService;
        this.programRefService = programRefService;
        this.batchGroupValidatorService = batchGroupValidatorService;
        this.batchModelValidatorService = batchModelValidatorService;
        this.physicalGearService = physicalGearService;
        this.formErrorTranslator = formErrorTranslator;
    }
    canUserWrite(data, opts) {
        return true;
    }
    control(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = opts === null || opts === void 0 ? void 0 : opts.program;
            if (!program || !program.label)
                throw new Error('Missing opts.program');
            const editor = program.getProperty(ProgramProperties.TRIP_OPERATION_EDITOR);
            opts = Object.assign({ maxProgression: 100 }, opts);
            opts.progression = opts.progression || new ProgressionModel({ total: opts.maxProgression });
            const endProgression = opts.progression.current + opts.maxProgression;
            try {
                switch (editor) {
                    case 'selectivity':
                        return this.controlSelectivity(entity, program, opts);
                    case 'legacy':
                    default:
                        return this.controlLegacy(entity, program, opts);
                }
            }
            finally {
                if (opts.progression.current < endProgression) {
                    opts.progression.current = endProgression;
                }
            }
            return null;
        });
    }
    qualify(data, qualityFlagId) {
        throw new Error('No implemented');
    }
    translateControlPath(path, opts) {
        var _a, _b;
        opts = opts || {};
        opts.i18nPrefix = opts.i18nPrefix || 'TRIP.BATCH.EDIT.';
        // Translate PMFM field
        if (opts.pmfms && MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path)) {
            const pmfmId = parseInt(path.split('.').pop());
            const pmfm = opts.pmfms.find(p => p.id === pmfmId);
            return PmfmUtils.getPmfmName(pmfm);
        }
        // Translate known Batch property
        let cleanPath = path.indexOf('catch.children.') !== -1
            ? path.split('.').slice(3).join('.')
            : path;
        // If path = the batch group form itself: return an empty string
        if (cleanPath.length === 0)
            return this.translate.instant(opts.i18nPrefix + 'PARENT_GROUP');
        const depth = countSubString(cleanPath, 'children.');
        let prefix = '';
        let isSampling;
        if (opts.qvPmfm) {
            isSampling = depth === 2;
            const parts = cleanPath.split('.');
            const qvIndex = parseInt(parts[1]);
            const qvName = (_b = (_a = opts.qvPmfm.qualitativeValues) === null || _a === void 0 ? void 0 : _a[qvIndex]) === null || _b === void 0 ? void 0 : _b.name;
            prefix = qvName || '';
            cleanPath = parts.slice(depth * 2).join('.'); // remove the qv part (remove 'children.<qvIndex>.')
        }
        else {
            const parts = cleanPath.split('.');
            cleanPath = parts.slice(depth * 2).join('.');
            isSampling = depth === 1;
        }
        // Transform 'weight.value' into 'weight'
        if (cleanPath === 'weight.value')
            cleanPath = 'weight';
        if (cleanPath === 'weight'
            || cleanPath === 'individualCount'
            || cleanPath === 'label'
            || cleanPath === 'rankOrder') {
            const i18nKey = opts.i18nPrefix
                // Add a sampling prefix
                + (isSampling ? 'SAMPLING_' : 'TOTAL_')
                // Change fieldName into i18n suffix
                + changeCaseToUnderscore(cleanPath).toUpperCase();
            return (prefix.length ? `${prefix} > ` : prefix)
                + this.translate.instant(i18nKey);
        }
        // Example: error on a form group (e.g. the sampling batch form)
        if (prefix.length) {
            if (isSampling) {
                prefix += ' > ' + this.translate.instant(opts.i18nPrefix + 'SAMPLING_BATCH');
            }
            return prefix;
        }
        // Default translation
        return this.formErrorTranslator.translateControlPath(cleanPath, opts);
    }
    /* -- private functions -- */
    controlLegacy(entity, program, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            const progressionStep = maxProgression / (1 + (((_a = entity === null || entity === void 0 ? void 0 : entity.children) === null || _a === void 0 ? void 0 : _a.length) || 0));
            // Control catch batch
            const catchErrors = yield this.controlCatchBatch(entity, program, opts);
            if (opts.progression)
                opts.progression.increment(progressionStep);
            if ((_b = opts.progression) === null || _b === void 0 ? void 0 : _b.cancelled)
                return catchErrors; // Stop here
            // Control sorting batches
            const childrenErrors = yield this.controlBatchGroups(entity, program, Object.assign(Object.assign({}, opts), { maxProgression: (maxProgression - progressionStep) }));
            // Has some children errors
            if (childrenErrors) {
                console.info(`[batch-service] Control children of catch batch {${entity.id}} [INVALID]`, childrenErrors);
                // Mark catch batch as invalid (if not already done)
                if (!entity.qualificationComments) {
                    BatchUtils.markAsInvalid(entity, this.translate.instant('ERROR.INVALID_OR_INCOMPLETE_FILL'));
                }
            }
            if (catchErrors || childrenErrors) {
                return Object.assign(Object.assign({}, catchErrors), childrenErrors);
            }
            return null; // No error
        });
    }
    /**
     * Control a catch batch
     *
     * @param entity
     * @param program
     * @param opts
     * @private
     */
    controlCatchBatch(entity, program, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Load catch pmfms
            const catchPmfms = yield this.programRefService.loadProgramPmfms(program.label, {
                acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH,
                gearId: opts === null || opts === void 0 ? void 0 : opts.gearId
            });
            const validator = new BatchValidatorService(this.formBuilder, this.translate, this.settings, this.measurementsValidatorService);
            const form = validator.getFormGroup(entity, { pmfms: catchPmfms, withChildren: false });
            if (!form.valid) {
                // Wait if pending
                yield AppFormUtils.waitWhilePending(form);
                // Form is invalid (after pending)
                if (form.invalid) {
                    // Translate form error
                    const errors = AppFormUtils.getFormErrors(form, { controlName: opts === null || opts === void 0 ? void 0 : opts.controlName });
                    const message = this.formErrorTranslator.translateErrors(errors, {
                        controlPathTranslator: {
                            translateControlPath: (path) => this.translateControlPath(path, {
                                pmfms: catchPmfms,
                                i18nPrefix: 'TRIP.CATCH.FORM.'
                            })
                        }
                    });
                    console.info(`[batch-service] Control catch batch {${entity.id}} [INVALID]`, message);
                    // Mark as invalid (=not controlled)
                    BatchUtils.markAsInvalid(entity, message);
                    return errors;
                }
            }
            console.debug(`[batch-service] Control catch batch {${entity.id}} [VALID]`);
            // Mark as controlled (e.g. reset quality flag)
            BatchUtils.markAsControlled(entity, { withChildren: false /*will be mark later*/ });
            return null; // no errors
        });
    }
    controlBatchGroups(entity, program, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(entity.children))
                return null; // No children: stop here
            const maxProgression = toNumber(opts === null || opts === void 0 ? void 0 : opts.maxProgression, 100);
            const progressionStep = maxProgression / entity.children.length;
            const incrementProgression = () => { var _a; return (_a = opts.progression) === null || _a === void 0 ? void 0 : _a.increment(progressionStep); };
            // Load sorting batch pmfms
            const pmfms = yield this.programRefService.loadProgramPmfms(program.label, {
                acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH,
                gearId: opts === null || opts === void 0 ? void 0 : opts.gearId
            });
            // Load taxon groups with no weight
            const taxonGroupsNoWeight = (program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_WEIGHT) || [])
                .map(label => label.trim().toUpperCase())
                .filter(isNotNilOrBlank);
            const taxonGroupsNoLanding = (program.getPropertyAsStrings(ProgramProperties.TRIP_BATCH_TAXON_GROUPS_NO_LANDING) || [])
                .map(label => label.trim().toUpperCase())
                .filter(isNotNilOrBlank);
            const weightPmfms = pmfms.filter(PmfmUtils.isWeight);
            const qvPmfm = BatchGroupUtils.getQvPmfm(pmfms);
            // Compute species pmfms (at species batch level)
            let speciesPmfms;
            let childrenPmfms;
            if (!qvPmfm) {
                speciesPmfms = pmfms.filter(pmfm => !PmfmUtils.isWeight(pmfm));
                childrenPmfms = [];
            }
            else {
                const qvPmfmIndex = pmfms.findIndex(pmfm => pmfm.id === qvPmfm.id);
                speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
                childrenPmfms = pmfms.filter((pmfm, index) => index > qvPmfmIndex && !PmfmUtils.isWeight(pmfm));
            }
            const samplingRatioFormat = program.getProperty(ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT);
            const weightMaxDecimals = pmfms.filter(PmfmUtils.isWeight).reduce((res, pmfm) => Math.max(res, pmfm.maximumNumberDecimals || 0), 0);
            // Create validator service
            const validator = this.batchGroupValidatorService;
            // TODO
            // - make sure to translate all errors
            // - add sub batches validation
            const controlNamePrefix = (opts === null || opts === void 0 ? void 0 : opts.controlName) ? `${opts.controlName}.` : '';
            const errors = (yield Promise.all(
            // For each catch's child
            entity.children.map((source, index) => __awaiter(this, void 0, void 0, function* () {
                var _b;
                if ((_b = opts.progression) === null || _b === void 0 ? void 0 : _b.cancelled)
                    return; // Stop here
                // Avoid error on label and rankOrder
                if (!source.label || !source.rankOrder) {
                    console.warn('[batch-service] Missing label or rankOrder in batch:', source);
                }
                const target = BatchGroup.fromBatch(source);
                const isTaxonGroupNoWeight = target.taxonGroup && taxonGroupsNoWeight.includes(target.taxonGroup.label);
                const isTaxonGroupNoLanding = target.taxonGroup && taxonGroupsNoLanding.includes(target.taxonGroup.label);
                const enableSamplingBatch = (!opts || opts.allowSamplingBatches !== false) || target.observedIndividualCount > 0;
                const weightRequired = isNotEmptyArray(weightPmfms) && !isTaxonGroupNoWeight;
                const individualCountRequired = isTaxonGroupNoWeight;
                // For each batch that holds weight
                (qvPmfm ? (target.children || []) : [target]).forEach(batch => {
                    // Compute weight
                    batch.weight = BatchUtils.getWeight(batch, weightPmfms);
                    // Set default values, when landings not legal on this species (e.g. RJB)
                    if (isTaxonGroupNoLanding)
                        this.fillNoLandingDefault(batch, { weightPmfms, weightRequired, individualCountRequired });
                    // Set sampling batch default (eg. weight=0 if parent weight = 0);
                    if (enableSamplingBatch && isNotEmptyArray(batch.children))
                        this.fillSamplingBatchDefault(batch, { weightPmfms, weightRequired, samplingRatioFormat });
                });
                // Create a form, with data
                const form = validator.getFormGroup(target, {
                    isOnFieldMode: opts.isOnFieldMode,
                    rankOrderRequired: false,
                    labelRequired: false,
                    weightRequired,
                    individualCountRequired,
                    qvPmfm,
                    pmfms: speciesPmfms,
                    childrenPmfms,
                    enableSamplingBatch
                });
                // Add complex validator
                if (form.valid && !isTaxonGroupNoWeight && enableSamplingBatch) {
                    const requiredSampleWeight = target.observedIndividualCount > 0;
                    form.setValidators(BatchGroupValidators.samplingRatioAndWeight({ qvPmfm, requiredSampleWeight, samplingRatioFormat, weightMaxDecimals }));
                    form.updateValueAndValidity();
                }
                // Get form errors
                if (!form.valid) {
                    yield AppFormUtils.waitWhilePending(form);
                    if (form.invalid) {
                        const errors = AppFormUtils.getFormErrors(form, { controlName: `${controlNamePrefix}children.${index}` });
                        const message = this.formErrorTranslator.translateErrors(errors, {
                            controlPathTranslator: {
                                translateControlPath: (path) => this.translateControlPath(path, { pmfms, qvPmfm })
                            },
                            separator: '\n'
                        });
                        // Mark current batch as invalid
                        BatchUtils.markAsInvalid(source, message);
                        // Increment progression
                        incrementProgression();
                        // Return errors
                        return errors;
                    }
                }
                // Mark as controlled
                BatchUtils.markAsControlled(source);
                // Increment progression
                incrementProgression();
                // No error (will be excluded by next filter)
                return null;
            }))))
                .filter(isNotNil);
            if ((_a = opts.progression) === null || _a === void 0 ? void 0 : _a.cancelled)
                return; // Stop here
            // Concat all errors
            if (errors.length) {
                return errors.reduce((res, err) => (Object.assign(Object.assign({}, res), err)));
            }
            return null; // no errors
        });
    }
    fillNoLandingDefault(batch, opts) {
        var _a, _b, _c, _d;
        if (opts.individualCountRequired && isNil(batch.individualCount) && batch.isLanding) {
            // Compute and fill individual count (if possible) in children
            BatchUtils.computeIndividualCount(batch);
            const sumIndividualCount = ((_a = BatchUtils.getSamplingChild(batch)) === null || _a === void 0 ? void 0 : _a.individualCount) || 0;
            // no individual measure: OK, set default
            if (sumIndividualCount === 0) {
                console.info(`[batch-service] Force individualCount to {0} on batch ${batch.label}, because landings are not legal for this species`);
                batch.individualCount = 0;
            }
        }
        if (opts.weightRequired && isNil((_b = batch.weight) === null || _b === void 0 ? void 0 : _b.value) && batch.isLanding) {
            const computedWeight = ((_c = BatchUtils.computeWeight(batch)) === null || _c === void 0 ? void 0 : _c.value) || 0;
            // no weight: OK, set default
            if (computedWeight === 0) {
                console.info(`[batch-service] Force weight to {0} on batch ${batch.label}, because landings are not legal for this species`);
                const defaultWeightPmfm = (_d = opts.weightPmfms) === null || _d === void 0 ? void 0 : _d[0];
                batch.weight = {
                    value: 0,
                    methodId: defaultWeightPmfm === null || defaultWeightPmfm === void 0 ? void 0 : defaultWeightPmfm.methodId,
                    computed: (defaultWeightPmfm === null || defaultWeightPmfm === void 0 ? void 0 : defaultWeightPmfm.isComputed) || false,
                    estimated: (defaultWeightPmfm === null || defaultWeightPmfm === void 0 ? void 0 : defaultWeightPmfm.methodId) === MethodIds.ESTIMATED_BY_OBSERVER || false
                };
            }
        }
    }
    fillSamplingBatchDefault(batch, opts) {
        var _a, _b, _c, _d, _e, _f;
        const totalWeight = (_a = batch.weight) === null || _a === void 0 ? void 0 : _a.value;
        const samplingBatch = BatchUtils.getSamplingChild(batch);
        if (samplingBatch)
            samplingBatch.weight = BatchUtils.getWeight(samplingBatch);
        // Remove the sampling batch, if exists but empty
        // /!\ If sampling weight is computed, and its the only filled data: should be consider like an empty value - fix #482
        if (BatchUtils.isEmptySamplingBatch(samplingBatch)) {
            batch.children = [];
            return;
        }
        // If total weight = 0, fill sampling weight to zero (if weight is required)
        if (opts.weightRequired && totalWeight === 0) {
            if (samplingBatch && BatchUtils.isNilOrComputedWeight(samplingBatch)) {
                const computedWeight = ((_b = BatchUtils.computeWeight(batch)) === null || _b === void 0 ? void 0 : _b.value) || 0;
                // computed weight = 0 => OK, we can set a default value
                if (computedWeight === 0 && isNil(samplingBatch.samplingRatio) && (samplingBatch.individualCount || 0) === 0) {
                    console.info(`[batch-service] Force sampling weight to {0} on batch ${samplingBatch.label}, because parent weight = 0`);
                    // Find same weight pmfm as total weight, or use the first one
                    const sampleWeightPmfm = (_c = opts.weightPmfms) === null || _c === void 0 ? void 0 : _c.find(p => { var _a; return isNil((_a = batch.weight) === null || _a === void 0 ? void 0 : _a.methodId) || p.methodId === batch.weight.methodId; });
                    samplingBatch.weight = {
                        value: 0,
                        methodId: sampleWeightPmfm === null || sampleWeightPmfm === void 0 ? void 0 : sampleWeightPmfm.methodId,
                        computed: (sampleWeightPmfm === null || sampleWeightPmfm === void 0 ? void 0 : sampleWeightPmfm.isComputed) || false,
                        estimated: (sampleWeightPmfm === null || sampleWeightPmfm === void 0 ? void 0 : sampleWeightPmfm.methodId) === MethodIds.ESTIMATED_BY_OBSERVER || false
                    };
                    // Set sampling ratio
                    samplingBatch.samplingRatio = 0;
                    samplingBatch.samplingRatioComputed = true;
                    // WARN: to be detected as 'computed' by BatchUtils.isSamplingRatioComputed(), should not be 'x%' nor '1/x'
                    // => '0/1' should work with all samplingRatioFormats
                    samplingBatch.samplingRatioText = '0/1';
                }
            }
        }
        // If total weight > 0
        else if (opts.weightRequired && totalWeight > 0) {
            const samplingWeight = (_d = samplingBatch === null || samplingBatch === void 0 ? void 0 : samplingBatch.weight) === null || _d === void 0 ? void 0 : _d.value;
            // Set sampling ratio, if can be computed by weights
            if (samplingBatch && isNil(samplingBatch.samplingRatio) && samplingWeight >= 0 && samplingWeight <= totalWeight) {
                // Set sampling ratio
                samplingBatch.samplingRatio = (totalWeight === 0 || samplingWeight === 0) ? 0 : samplingWeight / totalWeight;
                samplingBatch.samplingRatioText = `${samplingWeight}/${totalWeight}`;
                samplingBatch.samplingRatioComputed = true;
            }
            // Compute sampling weight, from total weight and sampling ratio (not computed)
            else if (samplingBatch && isNil(samplingWeight)
                && isNotNil(samplingBatch.samplingRatio)
                && samplingBatch.samplingRatioComputed !== true
                && samplingBatch.samplingRatio >= 0 && samplingBatch.samplingRatio <= 1) {
                const computedWeightPmfm = (_e = opts.weightPmfms) === null || _e === void 0 ? void 0 : _e.find(pmfm => pmfm.methodId === MethodIds.CALCULATED || pmfm.isComputed);
                const defaultWeightPmfm = (_f = opts.weightPmfms) === null || _f === void 0 ? void 0 : _f[0];
                samplingBatch.weight = {
                    value: totalWeight * samplingBatch.samplingRatio,
                    methodId: (computedWeightPmfm === null || computedWeightPmfm === void 0 ? void 0 : computedWeightPmfm.methodId) || (defaultWeightPmfm === null || defaultWeightPmfm === void 0 ? void 0 : defaultWeightPmfm.methodId) || MethodIds.CALCULATED,
                    computed: true,
                    estimated: false
                };
            }
        }
    }
    controlSelectivity(entity, program, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let physicalGear = opts === null || opts === void 0 ? void 0 : opts.physicalGear;
            if (!physicalGear)
                throw new Error('Missing required \'opts.physicalGear\'');
            // Recompute rank order
            //BatchUtils.computeRankOrder(entity);
            // if (!environment.production) {
            //   // SKip validation
            //   return undefined;
            // }
            const allowSamplingBatches = ((opts === null || opts === void 0 ? void 0 : opts.allowSamplingBatches) || BatchUtils.sumObservedIndividualCount(entity.children) > 0);
            const allowDiscard = allowSamplingBatches;
            const allowChildrenGears = program.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN);
            const [catchPmfms, sortingPmfms] = yield Promise.all([
                this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.CATCH_BATCH, gearId: opts === null || opts === void 0 ? void 0 : opts.gearId }),
                this.programRefService.loadProgramPmfms(program.label, { acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH, gearId: opts === null || opts === void 0 ? void 0 : opts.gearId })
            ]);
            const pmfms = [...catchPmfms, ...sortingPmfms];
            // Load sub gears
            if (allowChildrenGears && isNil(physicalGear.children)) {
                physicalGear = physicalGear === null || physicalGear === void 0 ? void 0 : physicalGear.clone(); // Keep original unchanged
                physicalGear.children = yield this.physicalGearService.loadAllByParentId({
                    tripId: physicalGear.tripId,
                    parentGearId: physicalGear.id
                });
            }
            // Create batch model, and the form
            const model = yield this.batchModelValidatorService.createModel(entity, { catchPmfms, sortingPmfms, allowDiscard, physicalGear });
            const form = this.batchModelValidatorService.createFormGroupByModel(model, {
                allowSpeciesSampling: allowSamplingBatches,
                isOnFieldMode: false
            });
            if (!form.valid) {
                // Wait if pending
                yield AppFormUtils.waitWhilePending(form);
                // Form is invalid (after pending)
                if (form.invalid) {
                    if ((opts === null || opts === void 0 ? void 0 : opts.debug) !== false) {
                        AppFormUtils.logFormErrors(form, '[batch-service] ');
                    }
                    // Translate form error
                    const translatePathOption = {
                        pmfms,
                        i18nPrefix: 'TRIP.BATCH.EDIT.'
                    };
                    const translateErrorsOptions = {
                        controlPathTranslator: {
                            translateControlPath: (path) => {
                                const cleanPath = (opts === null || opts === void 0 ? void 0 : opts.controlName) ? path.substring(opts.controlName.length + 1) : path;
                                const controlName = this.translateControlPath(cleanPath, translatePathOption);
                                const modelPath = cleanPath.replace(/\.weight\.value$|.individualCount$|.label$|.rankOrder$|/gi, '');
                                const batchModel = model.get(modelPath);
                                if (batchModel)
                                    batchModel.valid = false;
                                return (batchModel === null || batchModel === void 0 ? void 0 : batchModel.name) ? `${batchModel.name} > ${controlName}` : controlName;
                            }
                        },
                        separator: '\n'
                    };
                    const errors = AppFormUtils.getFormErrors(form, { controlName: opts === null || opts === void 0 ? void 0 : opts.controlName });
                    const message = this.formErrorTranslator.translateErrors(errors, translateErrorsOptions);
                    console.warn(`[batch-service] Control batch tree [INVALID]`, message);
                    // Mark catch batch as invalid (=not controlled)
                    BatchUtils.markAsInvalid(entity, message);
                    return errors;
                }
            }
            return null;
        });
    }
};
BatchService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [UntypedFormBuilder,
        TranslateService,
        LocalSettingsService,
        MeasurementsValidatorService,
        ProgramRefService,
        BatchGroupValidatorService,
        BatchModelValidatorService,
        PhysicalGearService,
        FormErrorTranslator])
], BatchService);
export { BatchService };
//# sourceMappingURL=batch.service.js.map