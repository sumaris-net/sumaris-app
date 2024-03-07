import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, Optional, } from '@angular/core';
import { Batch } from './batch.model';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AppFormArray, firstArrayValue, firstTruePromise, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, ReferentialUtils, splitByProperty, toBoolean, toNumber, waitFor, } from '@sumaris-net/ngx-components';
import { debounceTime, delay, distinctUntilChanged, filter } from 'rxjs/operators';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels } from '@app/referential/services/model/model.enum';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { BatchValidatorService } from './batch.validator';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { equals, roundHalfUp } from '@app/shared/functions';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { DenormalizedPmfmFilter } from '@app/referential/services/filter/pmfm.filter';
export const BATCH_VALIDATOR = new InjectionToken('batchValidatorService');
export const BATCH_VALIDATOR_OPTIONS_TOKEN = new InjectionToken('batchValidatorOptions');
let BatchForm = class BatchForm extends MeasurementValuesForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService, validatorOptions) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, validatorService.getFormGroup(null, Object.assign(Object.assign({ withWeight: true, rankOrderRequired: false, labelRequired: false, withChildren: true }, validatorOptions), { childrenOptions: Object.assign({ rankOrderRequired: false, labelRequired: false, withChildrenWeight: true }, validatorOptions === null || validatorOptions === void 0 ? void 0 : validatorOptions.childrenOptions) })), {
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            onUpdateFormGroup: (form) => this.onUpdateFormGroup(form)
        });
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.referentialRefService = referentialRefService;
        this.validatorService = validatorService;
        this._afterViewInitialized$ = this._state.select('afterViewInitialized');
        this._disableByDefaultControls = [];
        this.hasContent$ = this._state.select('hasContent');
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.showError = true;
        this.showTaxonGroupSearchBar = true;
        this.showComment = false;
        this.rxStrategy = 'normal';
        this.errorTranslatorOptions = { separator: '<br/>', controlPathTranslator: this };
        // Set defaults
        this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
        this._state.set((state) => (Object.assign(Object.assign({}, state), { acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH, pmfmFilter: null, showWeight: isNotNil(this.form.get('weight.value')), showChildrenWeight: isNotNil(this.form.get('childrenWeight')) })));
        // Make sure to have a resizable array for children
        if (!(this.form.get('children') instanceof AppFormArray)) {
            console.warn(this._logPrefix + 'Creating a new AppFormArray for children, using options:', validatorOptions === null || validatorOptions === void 0 ? void 0 : validatorOptions.childrenOptions);
            this.form.setControl('children', this.validatorService.getChildrenFormArray(null, Object.assign({}, validatorOptions === null || validatorOptions === void 0 ? void 0 : validatorOptions.childrenOptions)));
        }
        // for DEV only
        //this.debug = !environment.production;
    }
    set samplingRatioFormat(value) {
        this._state.set('samplingRatioFormat', _ => value);
    }
    get samplingRatioFormat() {
        return this._state.get('samplingRatioFormat');
    }
    set pmfmFilter(value) {
        this._state.set('pmfmFilter', _ => value);
    }
    get pmfmFilter() {
        return this._state.get('pmfmFilter');
    }
    set showWeight(value) {
        this._state.set('showWeight', _ => value);
    }
    get showWeight() {
        return this._state.get('showWeight');
    }
    set showEstimatedWeight(value) {
        this._state.set('showEstimatedWeight', _ => value);
    }
    get showEstimatedWeight() {
        return this._state.get('showEstimatedWeight');
    }
    set showExhaustiveInventory(value) {
        this._state.set('showExhaustiveInventory', _ => value);
    }
    get showExhaustiveInventory() {
        return this._state.get('showExhaustiveInventory');
    }
    set requiredWeight(value) {
        this._state.set('requiredWeight', _ => value);
    }
    get requiredWeight() {
        return this._state.get('requiredWeight');
    }
    set showIndividualCount(value) {
        this._state.set('showIndividualCount', _ => value);
    }
    get showIndividualCount() {
        return this._state.get('showIndividualCount');
    }
    set requiredIndividualCount(value) {
        this._state.set('requiredIndividualCount', _ => value);
    }
    get requiredIndividualCount() {
        return this._state.get('requiredIndividualCount');
    }
    set showChildrenWeight(value) {
        this._state.set('showChildrenWeight', _ => value);
    }
    get showChildrenWeight() {
        return this._state.get('showChildrenWeight');
    }
    set showSamplingBatch(value) {
        this._state.set('showSamplingBatch', _ => value);
    }
    get showSamplingBatch() {
        return this._state.get('showSamplingBatch');
    }
    set showSampleWeight(value) {
        this._state.set('showSampleWeight', _ => value);
    }
    get showSampleWeight() {
        return this._state.get('showSampleWeight');
    }
    set requiredSampleWeight(value) {
        this._state.set('requiredSampleWeight', _ => value);
    }
    get requiredSampleWeight() {
        return this._state.get('requiredSampleWeight');
    }
    set showSampleIndividualCount(value) {
        this._state.set('showSampleIndividualCount', _ => value);
    }
    get showSampleIndividualCount() {
        return this._state.get('showSampleIndividualCount');
    }
    set requiredSampleIndividualCount(value) {
        this._state.set('requiredSampleIndividualCount', _ => value);
    }
    get requiredSampleIndividualCount() {
        return this._state.get('requiredSampleIndividualCount');
    }
    set samplingBatchEnabled(value) {
        this._state.set('samplingBatchEnabled', _ => value);
    }
    get samplingBatchEnabled() {
        return this._state.get('samplingBatchEnabled');
    }
    set filter(value) {
        this._filter = value;
    }
    get filter() {
        return this._filter;
    }
    get defaultWeightPmfm() {
        return this._state.get('defaultWeightPmfm');
    }
    set defaultWeightPmfm(value) {
        this._state.set('defaultWeightPmfm', _ => value);
    }
    get weightPmfms() {
        return this._state.get('weightPmfms');
    }
    set weightPmfms(value) {
        this._state.set('weightPmfms', _ => value);
    }
    get weightPmfmsByMethod() {
        return this._state.get('weightPmfmsByMethod');
    }
    set weightPmfmsByMethod(value) {
        this._state.set('weightPmfmsByMethod', _ => value);
    }
    get childrenFormArray() {
        return this.form.controls.children;
    }
    get samplingBatchForm() {
        var _a;
        return (_a = this.childrenFormArray) === null || _a === void 0 ? void 0 : _a.at(0);
    }
    get weightForm() {
        return this.form.get('weight');
    }
    get hasAvailableTaxonGroups() {
        return isNotNil(this.availableTaxonGroups) && (!Array.isArray(this.availableTaxonGroups) || this.availableTaxonGroups.length > 0);
    }
    get touched() {
        var _a;
        return (_a = this.form) === null || _a === void 0 ? void 0 : _a.touched;
    }
    get afterViewInitialized() {
        return this._state.get('afterViewInitialized');
    }
    disable(opts) {
        super.disable(opts);
    }
    enable(opts) {
        super.enable(opts);
        // Refresh sampling child form
        if (this.samplingBatchEnabled) {
            this.enableSamplingBatch(opts);
        }
        else {
            this.disableSamplingBatch(opts);
        }
        // Refresh weight form
        if (this.showWeight) {
            this.enableWeightFormGroup(opts);
        }
        else {
            this.disableWeightFormGroup(opts);
        }
        // Other field to disable by default (e.g. discard reason, in SUMARiS program)
        this._disableByDefaultControls.forEach(c => c.disable(opts));
    }
    ngOnInit() {
        // Default values
        this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
        this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;
        this.showWeight = toBoolean(this.showWeight, true);
        this.requiredWeight = toBoolean(this.requiredWeight, false);
        this.requiredIndividualCount = toBoolean(this.requiredIndividualCount, false);
        this.showIndividualCount = toBoolean(this.showIndividualCount, false);
        this.showChildrenWeight = toBoolean(this.showChildrenWeight, false);
        this.showSampleWeight = toBoolean(this.showSampleWeight, this.showWeight);
        this.showSampleIndividualCount = toBoolean(this.showSampleIndividualCount, false);
        this.requiredSampleWeight = toBoolean(this.requiredSampleWeight, false);
        this.showExhaustiveInventory = toBoolean(this.showExhaustiveInventory, false);
        this.samplingRatioFormat = this.samplingRatioFormat || ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
        // Inherited. WARN will enable the form
        super.ngOnInit();
        // When pmfm filter change, re-apply initial pmfms
        this._state.hold(this._state.select('pmfmFilter')
            .pipe(
        // DEBUG
        //tap(pmfmFilter => console.debug(this._logPrefix + 'pmfmFilter changes', pmfmFilter)),
        filter(_ => this.enabled && !this.loading)), _ => this.setPmfms(this._initialPmfms));
        // Update form if need
        this._state.hold(this._state.select(['showWeight', 'requiredWeight',
            'showSamplingBatch', 'requiredSampleWeight',
            'requiredIndividualCount', 'showChildrenWeight'], res => res)
            .pipe(filter(_ => !this.loading)), (_) => this.onUpdateFormGroup());
        // Has content ?
        this._state.connect('hasContent', this.listenHasContent());
        // Listen samplingBatchEnabled, to enable/disable sampling form
        this._state.hold(this._state.select('samplingBatchEnabled')
            .pipe(filter(_ => this.enabled && !this.loading), distinctUntilChanged()), samplingBatchEnabled => {
            if (samplingBatchEnabled)
                this.enableSamplingBatch();
            else
                this.disableSamplingBatch();
        });
        // Taxon group combo
        if (this.hasAvailableTaxonGroups) {
            // Set items (useful to speed up the batch group modal)
            this.registerAutocompleteField('taxonGroup', {
                items: this.availableTaxonGroups,
                mobile: this.mobile
            });
            // Hide taxon group searchbar, if only few items
            if (Array.isArray(this.availableTaxonGroups) && this.mobile && this.availableTaxonGroups.length < 10) {
                this.showTaxonGroupSearchBar = false;
            }
        }
        else {
            this.registerAutocompleteField('taxonGroup', {
                suggestFn: (value, filter) => this.programRefService.suggestTaxonGroups(value, Object.assign(Object.assign({}, filter), { program: this.programLabel })),
                mobile: this.mobile
            });
        }
        // Taxon name combo
        this.updateTaxonNameFilter();
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, filter) => this.programRefService.suggestTaxonNames(value, filter),
            filter: this.taxonNameFilter,
            mobile: this.mobile,
            showAllOnFocus: this.showTaxonName
        });
        this.registerSubscription(this.form.get('taxonGroup').valueChanges
            .pipe(debounceTime(250), filter(_ => this.showTaxonGroup && this.showTaxonName))
            .subscribe(taxonGroup => this.updateTaxonNameFilter({ taxonGroup })));
        this.ngInitExtension();
    }
    ngAfterViewInit() {
        // This will cause update controls
        this._state.set('afterViewInitialized', _ => true);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
    }
    isVisiblePmfm(pmfm) {
        return !pmfm.hidden;
    }
    isVisibleNotWeightPmfm(pmfm) {
        return !pmfm.hidden && !PmfmUtils.isWeight(pmfm);
    }
    applyState(state) {
        this._state.set(oldState => (Object.assign(Object.assign(Object.assign({}, oldState), state), { 
            // Keep some protected inputs
            pmfms: oldState.pmfms })));
        // Apply pmfms
        if (state === null || state === void 0 ? void 0 : state.pmfms) {
            this.setPmfms(state === null || state === void 0 ? void 0 : state.pmfms);
        }
    }
    onApplyingEntity(data, opts) {
        super.onApplyingEntity(data, opts);
        if (!data)
            return; // Skip
        // Init default
        data.label = data.label || this.acquisitionLevel;
        data.rankOrder = toNumber(data.rankOrder, 0);
    }
    translateControlPath(path) {
        // Translate specific path
        let i18nSuffix;
        switch (path) {
            case 'individualCount':
                i18nSuffix = 'TOTAL_INDIVIDUAL_COUNT';
                break;
            case 'weight':
            case 'weight.value':
                i18nSuffix = 'TOTAL_WEIGHT';
                break;
            case 'children.0':
                i18nSuffix = 'SAMPLING_BATCH';
                break;
            case 'children.0.weight.value':
                i18nSuffix = 'SAMPLING_WEIGHT';
                break;
            case 'children.0.individualCount':
                i18nSuffix = 'SAMPLING_INDIVIDUAL_COUNT';
                break;
            case 'children.0.samplingRatio':
                i18nSuffix = this.samplingRatioFormat === '1/w' ? 'SAMPLING_COEFFICIENT' : 'SAMPLING_RATIO_PCT';
                break;
        }
        if (i18nSuffix) {
            const i18nKey = (this.i18nFieldPrefix || 'TRIP.BATCH.EDIT.') + i18nSuffix;
            return this.translate.instant(i18nKey);
        }
        // Default translation (pmfms)
        return super.translateControlPath(path, this._initialPmfms /*give the full list*/);
    }
    /* -- protected method -- */
    ngInitExtension() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ready();
            const discardReasonControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_REASON);
            const discardOrLandingControl = this.form.get('measurementValues.' + PmfmIds.DISCARD_OR_LANDING);
            // Manage DISCARD_REASON validator
            if (discardOrLandingControl && discardReasonControl) {
                // Always disable by default, while discard/Landing not set
                this._disableByDefaultControls.push(discardReasonControl);
                this.registerSubscription(discardOrLandingControl.valueChanges
                    .pipe(
                // IMPORTANT: add a delay, to make sure to be executed AFTER the form.enable()
                delay(200))
                    .subscribe((value) => {
                    if (ReferentialUtils.isNotEmpty(value) && value.label === QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
                        if (this.form.enabled) {
                            discardReasonControl.enable();
                        }
                        discardReasonControl.setValidators(Validators.required);
                        discardReasonControl.updateValueAndValidity({ onlySelf: true });
                        this.form.updateValueAndValidity({ onlySelf: true });
                    }
                    else {
                        discardReasonControl.setValue(null);
                        discardReasonControl.setValidators(null);
                        discardReasonControl.disable();
                    }
                }));
            }
        });
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const defaultWeightPmfm = this.defaultWeightPmfm;
            const weightPmfms = this.weightPmfms;
            const childrenFormArray = this.childrenFormArray;
            // Fill weight, if a weight PMFM exists
            if (defaultWeightPmfm && this.showWeight) {
                data.weight = BatchUtils.getWeight(data, weightPmfms) || {
                    value: null,
                    methodId: defaultWeightPmfm.methodId,
                    computed: defaultWeightPmfm.isComputed,
                    estimated: defaultWeightPmfm.methodId === MethodIds.ESTIMATED_BY_OBSERVER
                };
                // Clean all weight values and control (to keep only the weight form group)
                weightPmfms === null || weightPmfms === void 0 ? void 0 : weightPmfms.forEach(p => {
                    delete data.measurementValues[p.id.toString()];
                    this.form.removeControl(p.id.toString());
                });
            }
            // No weight PMFM : disable weight form group, if exists (will NOT exists in BatchGroupForm sub classe)
            else {
                // Disable weight (if form group exists)
                this.disableWeightFormGroup(opts);
            }
            // Adapt measurement values to form
            if (!opts || opts.normalizeEntityToForm !== false) {
                // IMPORTANT: applying normalisation of measurement values on ALL pmfms (not only displayed pmfms)
                // This is required by the batch-group-form component, to keep the value of hidden PMFM, such as Landing/Discard Pmfm
                MeasurementValuesUtils.normalizeEntityToForm(data, this.pmfms, this.form);
            }
            if (this.showSamplingBatch) {
                childrenFormArray.resize(1, opts);
                const samplingFormGroup = childrenFormArray.at(0);
                const samplingBatch = BatchUtils.getOrCreateSamplingChild(data);
                // Force isSampling=true, if sampling batch it NOT empty
                this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, BatchUtils.isSamplingNotEmpty(samplingBatch));
                // Read child weight (use the first one)
                if (defaultWeightPmfm) {
                    samplingBatch.weight = BatchUtils.getWeight(samplingBatch, weightPmfms);
                    // Adapt measurement values to form
                    MeasurementValuesUtils.normalizeEntityToForm(samplingBatch, [], samplingFormGroup);
                }
                // Convert sampling ratio
                //samplingBatch.samplingRatio = BatchUtils.getSamplingRatio(samplingBatch, this.samplingRatioType);
                /*if (isNotNil(samplingBatch.samplingRatio)) {
                  BatchUtils.normalizedSamplingRatioToForm(samplingBatch, this.samplingRatioType);
                }*/
            }
            // No sampling batch
            else {
                childrenFormArray.resize(((data === null || data === void 0 ? void 0 : data.children) || []).length, opts);
                childrenFormArray.disable(Object.assign(Object.assign({}, opts), { onlySelf: true }));
            }
            // Call inherited function
            yield _super.updateView.call(this, data, Object.assign(Object.assign({}, opts), { normalizeEntityToForm: false // Already normalized (see upper)
             }));
        });
    }
    updateViewState(opts) {
        super.updateViewState(opts);
    }
    getValue() {
        var _a, _b;
        if (!this.data)
            return undefined;
        const json = this.form.value;
        const data = this.data;
        const weightPmfms = this.weightPmfms;
        const weightPmfmsByMethod = this.weightPmfmsByMethod;
        // Reset comment, when hidden
        if (!this.showComment)
            json.comments = undefined;
        // Get existing measurements
        const measurementValues = data.measurementValues || {};
        // Clean previous all weights
        weightPmfms === null || weightPmfms === void 0 ? void 0 : weightPmfms.forEach(p => measurementValues[p.id.toString()] = undefined);
        // Convert weight into measurement
        const totalWeight = this.defaultWeightPmfm && ((_a = json.weight) === null || _a === void 0 ? void 0 : _a.value);
        if (isNotNil(totalWeight)) {
            const totalWeightPmfm = BatchUtils.getWeightPmfm(json.weight, weightPmfms, weightPmfmsByMethod);
            json.measurementValues = Object.assign(Object.assign({}, json.measurementValues), { [totalWeightPmfm.id.toString()]: totalWeight });
        }
        // Convert measurements
        json.measurementValues = Object.assign(Object.assign({}, measurementValues), MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, this._initialPmfms));
        if (this.showSamplingBatch) {
            if (this.samplingBatchEnabled) {
                const child = BatchUtils.getOrCreateSamplingChild(data);
                const childJson = json.children && json.children[0] || {};
                childJson.rankOrder = 1;
                childJson.label = json.label && (json.label + Batch.SAMPLING_BATCH_SUFFIX) || undefined;
                childJson.measurementValues = childJson.measurementValues || {};
                // Clean existing weights
                weightPmfms === null || weightPmfms === void 0 ? void 0 : weightPmfms.forEach(p => childJson.measurementValues[p.id.toString()] = undefined);
                // Convert weight into measurement
                if (isNotNil((_b = childJson.weight) === null || _b === void 0 ? void 0 : _b.value)) {
                    const childWeightPmfm = BatchUtils.getWeightPmfm(childJson.weight, weightPmfms, weightPmfmsByMethod);
                    childJson.measurementValues[childWeightPmfm.id.toString()] = childJson.weight.value;
                }
                // Convert measurements
                childJson.measurementValues = Object.assign({}, child.measurementValues, // Keep existing extra measurements
                MeasurementValuesUtils.normalizeValuesToModel(childJson.measurementValues, weightPmfms));
                // Special case: when sampling on individual count only (e.g. RJB - Pocheteau)
                if (!this.showWeight && isNotNil(childJson.individualCount) && isNotNil(json.individualCount)) {
                    console.debug(this._logPrefix + 'Computing samplingRatio, using individualCount (e.g. special case for species without weight)');
                    childJson.samplingRatio = childJson.individualCount / json.individualCount;
                    childJson.samplingRatioText = `${childJson.individualCount}/${json.individualCount}`;
                }
                json.children = [childJson];
            }
            else {
                // No sampling batch
                json.children = [];
            }
            // Update data
            data.fromObject(json, { withChildren: true });
        }
        else {
            // Keep existing children
            data.fromObject(json);
        }
        // DEBUG
        //if (this.debug) console.debug(`[batch-form] ${data.label} getValue():`, data);
        return data;
    }
    /**
     * Compute 'hasContent' value, from other inputs
     *
     * @protected
     */
    listenHasContent() {
        return this._state.select([
            'showWeight', 'weightPmfms', 'pmfms',
            'showIndividualCount', 'showSampleIndividualCount',
            'showSamplingBatch',
        ], state => (state.showWeight && isNotEmptyArray(state.weightPmfms))
            || (state.pmfms && state.pmfms.some(this.isVisibleNotWeightPmfm))
            || state.showIndividualCount || state.showSampleIndividualCount
            || state.showSamplingBatch || this.showTaxonGroup || this.showTaxonName);
    }
    enableSamplingBatch(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const array = this.childrenFormArray;
            if (!array)
                return;
            array.enable(opts);
            yield this.enableWeightsComputation();
        });
    }
    disableSamplingBatch(opts) {
        this.disableSamplingWeightComputation();
        const array = this.childrenFormArray;
        if (!array)
            return;
        array.disable(opts);
    }
    copyChildrenWeight(event, samplingBatchForm) {
        var _a, _b;
        const source = (_a = samplingBatchForm.get('childrenWeight')) === null || _a === void 0 ? void 0 : _a.value;
        if (isNil(source === null || source === void 0 ? void 0 : source.value))
            return; // Nothing to copy
        const totalWeight = (_b = this.weightForm) === null || _b === void 0 ? void 0 : _b.value;
        const target = Object.assign(Object.assign({}, source), { 
            // Adapt max decimals to targeted weight
            value: roundHalfUp(source.value, this.defaultWeightPmfm.maximumNumberDecimals || 3), 
            // Force to not computed, to be able to update value
            computed: false });
        if (isNotNil(totalWeight === null || totalWeight === void 0 ? void 0 : totalWeight.value) && !totalWeight.computed) {
            // Apply the new weight
            // + Clean sampling ratio (will be computed, using weights)
            samplingBatchForm.patchValue({
                weight: target,
                samplingRatio: null,
                samplingRatioText: null,
            });
        }
        else {
            // Apply the new weight
            samplingBatchForm.patchValue({
                weight: target
            });
        }
    }
    toggleComment() {
        this.showComment = !this.showComment;
        // Mark form as dirty, if need to reset comment (see getValue())
        if (!this.showComment && isNotNilOrBlank(this.form.get('comments').value))
            this.form.markAsDirty();
        this.markForCheck();
    }
    /* -- protected methods -- */
    /**
     * Wait ngAfterViewInit()
     */
    waitViewInit() {
        if (this.afterViewInitialized)
            return;
        return firstTruePromise(this._afterViewInitialized$, { stop: this.destroySubject });
    }
    updateTaxonNameFilter(opts) {
        // If taxonGroup exists: taxon group must be filled first
        if (this.showTaxonGroup && ReferentialUtils.isEmpty(opts && opts.taxonGroup)) {
            this.taxonNameFilter = {
                programLabel: 'NONE' /*fake program, will cause empty array*/
            };
        }
        else {
            this.taxonNameFilter = {
                programLabel: this.programLabel,
                taxonGroupId: opts && opts.taxonGroup && opts.taxonGroup.id
            };
        }
        this.markForCheck();
    }
    mapPmfms(pmfms) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!pmfms)
                return; // Skip if empty
            this._initialPmfms = pmfms; // Copy original pmfms list
            // Filter pmfms
            const filterFn = (_a = DenormalizedPmfmFilter.fromObject(this.pmfmFilter)) === null || _a === void 0 ? void 0 : _a.asFilterFn();
            if (filterFn) {
                pmfms = pmfms.filter(filterFn);
            }
            // dispatch pmfms, and return partial state
            const state = yield this.dispatchPmfms(pmfms);
            this._state.set(state);
            return state.pmfms;
        });
    }
    dispatchPmfms(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pmfms)
                return; // Skip
            // DEBUG
            console.debug(this._logPrefix + ' Dispatching pmfms...', pmfms);
            // Read weight PMFMs
            let weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
            // Exclude weight (because we use special fields for weights)
            // or hidden PMFMs
            const notWeightPmfms = pmfms.filter(p => !weightPmfms.includes(p));
            // Fix weight pmfms
            weightPmfms = weightPmfms.map(p => {
                if (isNil(p.methodId) || p.required) {
                    p = p.clone();
                    // Fill methodId (need by the map 'weightPmfmsByMethod')
                    p.methodId = toNumber(p.methodId, MethodIds.OBSERVED_BY_OBSERVER);
                    // Required will be managed by validator, and template, using the @Input 'requiredWeight'
                    p.required = false;
                }
                return p;
            });
            const defaultWeightPmfm = firstArrayValue(weightPmfms);
            const weightPmfmsByMethod = splitByProperty(weightPmfms, 'methodId');
            // All pmfms to keep (visible or not)
            pmfms = notWeightPmfms.concat(weightPmfms);
            // Hide sampling batch, if no weight pmfm
            const showSamplingBatch = toBoolean(this.showSamplingBatch, isNotNil(defaultWeightPmfm));
            return {
                showSamplingBatch,
                weightPmfms,
                defaultWeightPmfm,
                showWeight: !!defaultWeightPmfm,
                showEstimatedWeight: !!weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER],
                weightPmfmsByMethod,
                pmfms
            };
        });
    }
    onUpdateFormGroup(form) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            form = form || this.form;
            console.debug(this._logPrefix + 'Updating form group...');
            try {
                // Wait ngAfterViewInit()
                yield this.waitViewInit();
                // Add pmfms to form
                const measFormGroup = form.get('measurementValues');
                if (measFormGroup) {
                    this.measurementsValidatorService.updateFormGroup(measFormGroup, { pmfms: this.pmfms, emitEvent: false });
                }
                const childrenFormArray = this.childrenFormArray;
                const hasSamplingForm = (childrenFormArray === null || childrenFormArray === void 0 ? void 0 : childrenFormArray.length) === 1 && this.defaultWeightPmfm && true;
                // If the sample batch exists
                if (this.showSamplingBatch) {
                    childrenFormArray.resize(1);
                    const samplingForm = childrenFormArray.at(0);
                    // Reset measurementValues (if exists)
                    const samplingMeasFormGroup = samplingForm.get('measurementValues');
                    if (samplingMeasFormGroup) {
                        this.measurementsValidatorService.updateFormGroup(samplingMeasFormGroup, { pmfms: [] });
                    }
                    // Adapt exists sampling child, if any
                    if (this.data) {
                        const samplingChildBatch = BatchUtils.getOrCreateSamplingChild(this.data);
                        this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, BatchUtils.isSamplingNotEmpty(samplingChildBatch));
                    }
                    else {
                        // No data: disable sampling
                        this.samplingBatchEnabled = toBoolean(this.samplingBatchEnabled, false);
                    }
                    // Update form validators
                    this.validatorService.updateFormGroup(this.form, {
                        withWeight: this.showWeight,
                        weightRequired: this.requiredWeight,
                        individualCountRequired: this.requiredIndividualCount,
                        withChildrenWeight: this.showChildrenWeight,
                        isOnFieldMode: this.settings.isOnFieldMode(this.usageMode)
                    });
                    this.markForCheck();
                    // Has sample batch, and weight is enable
                    yield this.enableWeightsComputation();
                }
                // Remove existing sample, if exists but showSample=false
                else if (hasSamplingForm) {
                    childrenFormArray.resize(0);
                    // Unregister to previous sampling weight validator
                    (_a = this._formValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
                }
                if (this.showWeight) {
                    this.enableWeightFormGroup({ emitEvent: false });
                }
                else {
                    this.disableWeightFormGroup({ emitEvent: false });
                }
            }
            catch (err) {
                console.error(this._logPrefix + 'Error while updating controls', err);
            }
        });
    }
    enableWeightFormGroup(opts) {
        const weightForm = this.weightForm;
        if (!weightForm || weightForm.enabled)
            return;
        weightForm.enable(opts);
    }
    disableWeightFormGroup(opts) {
        const weightForm = this.weightForm;
        if (!weightForm || weightForm.disabled)
            return;
        weightForm.disable(opts);
    }
    disableSamplingWeightComputation() {
        var _a;
        (_a = this._formValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
    enableWeightsComputation() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.showWeight || !this.samplingBatchEnabled || !this.showSamplingBatch) {
                // Unregister to previous validator
                (_a = this._formValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
                return;
            }
            // Make sure required attribute have been set
            if (!this.samplingRatioFormat || !this.defaultWeightPmfm) {
                // Wait 2s
                yield waitFor(() => !!this.samplingRatioFormat && !!this.defaultWeightPmfm, { timeout: 2000, stopError: false });
                // Stop if not found
                if (!this.samplingRatioFormat || !this.defaultWeightPmfm) {
                    console.warn(this._logPrefix + 'Missing samplingRatioFormat or weight Pmfm. Skipping sampling ratio and weight computation');
                    return;
                }
            }
            const opts = {
                requiredSampleWeight: this.requiredSampleWeight,
                requiredIndividualCount: this.requiredIndividualCount,
                samplingRatioFormat: this.samplingRatioFormat,
                weightMaxDecimals: (_b = this.defaultWeightPmfm) === null || _b === void 0 ? void 0 : _b.maximumNumberDecimals,
                debounceTime: this.mobile ? 650 : 0
            };
            // Skip if unchanged
            if (equals(opts, this._formValidatorOpts))
                return;
            // Unregister to previous validator
            (_c = this._formValidatorSubscription) === null || _c === void 0 ? void 0 : _c.unsubscribe();
            this._formValidatorOpts = opts;
            // Create a sampling form validator
            const subscription = this.validatorService.enableSamplingRatioAndWeight(this.form, Object.assign(Object.assign({}, this._formValidatorOpts), { markForCheck: () => this.markForCheck() }));
            // Register subscription
            this._formValidatorSubscription = subscription;
            this.registerSubscription(this._formValidatorSubscription);
            subscription.add(() => {
                this.unregisterSubscription(subscription);
                this._formValidatorSubscription = null;
                this._formValidatorOpts = null;
            });
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchForm.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchForm.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "showTaxonGroupSearchBar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchForm.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchForm.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchForm.prototype, "rxStrategy", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], BatchForm.prototype, "samplingRatioFormat", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], BatchForm.prototype, "pmfmFilter", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showEstimatedWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showExhaustiveInventory", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "requiredWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showIndividualCount", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "requiredIndividualCount", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showChildrenWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showSamplingBatch", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showSampleWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "requiredSampleWeight", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "showSampleIndividualCount", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "requiredSampleIndividualCount", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchForm.prototype, "samplingBatchEnabled", null);
__decorate([
    Input(),
    __metadata("design:type", BatchFilter),
    __metadata("design:paramtypes", [BatchFilter])
], BatchForm.prototype, "filter", null);
BatchForm = __decorate([
    Component({
        selector: 'app-batch-form',
        templateUrl: './batch.form.html',
        styleUrls: ['batch.form.scss'],
        providers: [
            { provide: BATCH_VALIDATOR, useExisting: BatchValidatorService },
            { provide: BATCH_VALIDATOR_OPTIONS_TOKEN, useValue: {} }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(5, Inject(BATCH_VALIDATOR)),
    __param(6, Inject(BATCH_VALIDATOR_OPTIONS_TOKEN)),
    __param(6, Optional()),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ReferentialRefService, Object, Object])
], BatchForm);
export { BatchForm };
//# sourceMappingURL=batch.form.js.map