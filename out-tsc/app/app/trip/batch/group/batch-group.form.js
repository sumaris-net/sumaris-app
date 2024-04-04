var BatchGroupForm_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { Batch } from '../common/batch.model';
import { UntypedFormBuilder, UntypedFormControl } from '@angular/forms';
import { AppFormUtils, isNil, isNotNil, isNotNilOrBlank, ReferentialUtils, toBoolean, waitFor, } from '@sumaris-net/ngx-components';
import { BatchGroupValidatorService } from './batch-group.validator';
import { BatchForm } from '../common/batch.form';
import { debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { BatchGroupUtils } from './batch-group.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge } from 'rxjs';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
let BatchGroupForm = BatchGroupForm_1 = class BatchGroupForm extends BatchForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService) {
        super(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService, {
            withWeight: false,
            withChildren: false,
            withMeasurements: false
        });
        this.childrenPmfmsByQvId$ = this._state.select('childrenPmfmsByQvId');
        this.hasSubBatches$ = this._state.select('hasSubBatches');
        this.allowSubBatches = true;
        this.defaultHasSubBatches = false;
        this.showHasSubBatchesButton = true;
        // Default value
        this._state.set((state) => (Object.assign(Object.assign({}, state), { showSamplingBatch: false, showWeight: false })));
        // Create control for hasSubBatches button
        this.hasSubBatchesControl = new UntypedFormControl(false);
        // DEBUG
        //this.debug = !environment.production;
        this._logPrefix = '[batch-group-form]';
    }
    set qvPmfm(value) {
        this._state.set('qvPmfm', _ => value);
    }
    get qvPmfm() {
        return this._state.get('qvPmfm');
    }
    get childrenState() {
        return this._state.get('childrenState');
    }
    set childrenState(value) {
        this._state.set('childrenState', oldState => (Object.assign(Object.assign({}, oldState.childrenState), value)));
    }
    get invalid() {
        return this.form.invalid
            || this.hasSubBatchesControl.invalid
            || ((this.childrenList || []).find(child => child.invalid) && true) || false;
    }
    get valid() {
        // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
        return this.form.valid
            && (this.hasSubBatchesControl.disabled /*ignore when disabled*/ || this.hasSubBatchesControl.valid)
            && (!this.childrenList || !this.childrenList.find(child => child.enabled && !child.valid)) || false;
    }
    get pending() {
        return this.form.pending
            || this.hasSubBatchesControl.pending
            || (this.childrenList && this.childrenList.find(child => child.pending) && true) || false;
    }
    get loading() {
        return super.loading || (this.childrenList && this.childrenList.find(child => child.loading) && true) || false;
    }
    get dirty() {
        return this.form.dirty || this.hasSubBatchesControl.dirty ||
            (this.childrenList && this.childrenList.find(child => child.dirty) && true) || false;
    }
    markAllAsTouched(opts) {
        var _a;
        super.markAllAsTouched(opts);
        (_a = this.childrenList) === null || _a === void 0 ? void 0 : _a.forEach(f => f.markAllAsTouched(opts));
        this.hasSubBatchesControl.markAsTouched(opts);
    }
    markAsPristine(opts) {
        super.markAsPristine(opts);
        (this.childrenList || []).forEach(child => child.markAsPristine(opts));
        this.hasSubBatchesControl.markAsPristine(opts);
    }
    markAsUntouched(opts) {
        super.markAsUntouched(opts);
        (this.childrenList || []).forEach(child => child.markAsUntouched(opts));
        this.hasSubBatchesControl.markAsUntouched(opts);
    }
    markAsDirty(opts) {
        super.markAsDirty(opts);
        (this.childrenList || []).forEach(child => child.markAsDirty(opts));
        this.hasSubBatchesControl.markAsDirty(opts);
    }
    disable(opts) {
        super.disable(opts);
        (this.childrenList || []).forEach(child => child.disable(opts));
        this.hasSubBatchesControl.disable(opts);
    }
    enable(opts) {
        super.enable(opts);
        (this.childrenList || []).forEach(child => child.enable(opts));
    }
    get hasSubBatches() {
        return this._state.get('hasSubBatches');
    }
    set hasSubBatches(value) {
        this._state.set('hasSubBatches', _ => value);
    }
    ngOnInit() {
        super.ngOnInit();
        this.showHasSubBatchesButton = toBoolean(this.showHasSubBatchesButton, true);
        this.defaultHasSubBatches = toBoolean(this.defaultHasSubBatches, false);
        // Set isSampling on each child forms, when has indiv. measure changed
        this._state.connect('hasSubBatches', this.hasSubBatchesControl.valueChanges
            .pipe(filter(() => !this.applyingValue && !this.loading), distinctUntilChanged(), tap(_ => this.markAsDirty())));
        this._state.hold(this.hasSubBatches$, (value) => {
            if (this.hasSubBatchesControl.value !== value) {
                this.hasSubBatchesControl.setValue(value, { emitEvent: false });
                this.markForCheck();
            }
            // Enable control if need
            if (!value && this.hasSubBatchesControl.disabled && this.enabled) {
                this.hasSubBatchesControl.enable();
            }
            // Disable control if need
            else if (value && this.hasSubBatchesControl.enabled && this.enabled) {
                this.hasSubBatchesControl.disable();
            }
        });
        // Listen form changes, to update children state (e.g. when taxonGroup changes, check if RJB special case)
        this._state.connect('childrenState', merge(this.form.valueChanges, this.hasSubBatches$).pipe(filter(() => !this.applyingValue && this.enabled && !this.loading), debounceTime(450), map(_ => this.computeChildrenState(this.form.value))));
        // Listen children state, and update forms
        this._state.hold(this._state.select('childrenState')
            .pipe(filter(() => this.enabled && !this.loading)), (childrenState) => {
            var _a;
            if (this.qvPmfm) {
                (_a = this.childrenList) === null || _a === void 0 ? void 0 : _a.forEach(childForm => childForm.applyState(childrenState));
            }
            // No QV: apply to himself
            else
                this.applyState(childrenState);
        });
    }
    focusFirstInput() {
        const element = this.firstInputFields.first;
        if (element)
            element.focus();
    }
    logFormErrors(logPrefix) {
        logPrefix = logPrefix || '';
        AppFormUtils.logFormErrors(this.form, logPrefix);
        if (this.childrenList)
            this.childrenList.forEach((childForm, index) => {
                AppFormUtils.logFormErrors(childForm.form, logPrefix, `children#${index}`);
            });
    }
    ready(opts) {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.ready.call(this, opts);
        });
    }
    /* -- protected methods -- */
    waitForChildren(opts) {
        return waitFor(() => { var _a; return ((_a = this.childrenList) === null || _a === void 0 ? void 0 : _a.length) > 0; }, opts);
    }
    mapPmfms(pmfms) {
        if (this.debug)
            console.debug('[batch-group-form] mapPmfm()...');
        let qvPmfm = this.qvPmfm || BatchGroupUtils.getQvPmfm(pmfms);
        if (qvPmfm) {
            // Create a copy, to keep original pmfm unchanged
            qvPmfm = qvPmfm.clone();
            // Hide for children form, and change it as required
            qvPmfm.hidden = true;
            qvPmfm.required = true;
            const qvPmfmIndex = pmfms.findIndex(pmfm => pmfm.id === qvPmfm.id);
            const speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
            const childrenPmfms = [
                qvPmfm,
                ...pmfms.filter((pmfm, index) => index > qvPmfmIndex)
            ];
            // Prepare a map of pmfm, by QV id.
            const childrenPmfmsByQvId = qvPmfm.qualitativeValues.reduce((res, qv) => {
                // Map PMFM, for batch group's children
                // Depending of the qvId, some pmfms can be hidden (e.g. DRESSING and PRESERVATION)
                res[qv.id] = BatchGroupUtils.mapChildrenPmfms(childrenPmfms, { qvPmfm, qvId: qv.id });
                return res;
            }, {});
            // Update state
            this._state.set({ childrenPmfmsByQvId, qvPmfm });
            // Limit to species pmfms
            return super.mapPmfms(speciesPmfms);
        }
        else {
            if (this.debug)
                console.debug('[batch-group-form] No qv pmfms...');
            return super.mapPmfms(pmfms);
        }
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug(this._logPrefix + ' updateView() with value:', data);
            // Show comments if any
            this.showComment = this.showComment || isNotNilOrBlank(data === null || data === void 0 ? void 0 : data.comments);
            // Compute has sub batches (will be updated later in this function)
            let hasSubBatches = data.observedIndividualCount > 0 || this.defaultHasSubBatches || false;
            const qvPmfm = this.qvPmfm;
            if (qvPmfm) {
                // Prepare data array, for each qualitative values
                data.children = qvPmfm.qualitativeValues.map((qv, index) => {
                    // Find existing child, or create a new one
                    // tslint:disable-next-line:triple-equals
                    const child = (data.children || []).find(c => MeasurementValuesUtils.hasPmfmValue(c.measurementValues, qvPmfm.id, qv))
                        || new Batch();
                    // Make sure label and rankOrder are correct
                    child.label = `${data.label}.${qv.label}`;
                    child.measurementValues[this.qvPmfm.id] = qv;
                    child.rankOrder = index + 1;
                    // Should have sub batches, when sampling batch exists
                    const samplingBatchExists = isNotNil(BatchUtils.getSamplingChild(child));
                    hasSubBatches = hasSubBatches || samplingBatchExists;
                    // Create sampling batch, if has sub batches
                    if (hasSubBatches && !samplingBatchExists)
                        BatchUtils.getOrCreateSamplingChild(child);
                    return child;
                });
                // Set has subbatches, if changed
                if (this.hasSubBatches !== hasSubBatches)
                    this.hasSubBatches = hasSubBatches;
                // Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
                this.childrenState = this.computeChildrenState(data, { hasSubBatches });
                // Wait children forms
                this.cd.detectChanges();
                yield this.waitForChildren({ stop: this.destroySubject });
                // Set value of each child form
                yield Promise.all(this.childrenList.map((childForm, index) => __awaiter(this, void 0, void 0, function* () {
                    childForm.markAsReady();
                    return childForm.setValue(data.children[index] || new Batch(), { emitEvent: true });
                })));
                // Set value (batch group)
                yield _super.updateView.call(this, data, Object.assign(Object.assign({}, opts), { emitEvent: false }));
            }
            // No QV pmfm
            else {
                // Should have sub batches, when sampling batch exists
                const samplingBatchExists = isNotNil(BatchUtils.getSamplingChild(data));
                hasSubBatches = hasSubBatches || samplingBatchExists;
                // Create sampling batch, if has sub batches
                if (hasSubBatches && !samplingBatchExists)
                    BatchUtils.getOrCreateSamplingChild(data);
                // Configure as child form (will copy some childrenXXX properties into self)
                if (hasSubBatches !== this.hasSubBatches)
                    this.hasSubBatches = hasSubBatches;
                // Compute state
                const state = this.computeChildrenState(data, { hasSubBatches });
                this.applyState(state);
                this.childrenState = state;
                this.markAsReady();
                // Set value (batch group)
                yield _super.updateView.call(this, data, opts);
            }
            // Apply computed value
            if (this.showHasSubBatchesButton || !this.hasSubBatchesControl.value) {
                this.hasSubBatchesControl.setValue(hasSubBatches, { emitEvent: false });
            }
            // If there is already some measure
            // Not allow to change 'has measure' field
            if (data.observedIndividualCount > 0) {
                this.hasSubBatchesControl.disable();
            }
            else if (this.enabled) {
                this.hasSubBatchesControl.enable();
            }
        });
    }
    getValue() {
        const data = super.getValue();
        if (!data)
            return; // No set yet
        if (this.qvPmfm) {
            // For each child
            data.children = this.childrenList.map((childForm, index) => {
                const qv = this.qvPmfm.qualitativeValues[index];
                const child = childForm.value;
                if (!child)
                    return; // No set yet
                child.rankOrder = index + 1;
                child.label = `${data.label}.${qv.label}`;
                child.measurementValues = child.measurementValues || {};
                child.measurementValues[this.qvPmfm.id.toString()] = '' + qv.id;
                // Copy other pmfms
                const childMeasurementValues = childForm.measurementValuesForm.value;
                Object.keys(childMeasurementValues)
                    .filter(key => isNil(child.measurementValues[key]))
                    .forEach(key => child.measurementValues[key] = childMeasurementValues[key]);
                return child;
            });
        }
        else {
            // Nothing to do
        }
        if (this.debug)
            console.debug(this._logPrefix + 'getValue():', data);
        return data;
    }
    /**
     * Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
     *
     * @param data
     * @param opts
     * @protected
     */
    computeChildrenState(data, opts) {
        data = data || this.data;
        if (this.debug)
            console.debug(this._logPrefix + 'updateChildrenFormState():', data);
        // Generally, individual count are not need, on a root species batch, because filled in sub-batches,
        // but some species (e.g. RJB) can have no weight.
        const taxonGroupNoWeight = ReferentialUtils.isNotEmpty(data === null || data === void 0 ? void 0 : data.taxonGroup)
            && (this.taxonGroupsNoWeight || []).includes(data.taxonGroup.label);
        const hasSubBatches = toBoolean(opts === null || opts === void 0 ? void 0 : opts.hasSubBatches, this.hasSubBatches);
        // Show/hide
        const showWeight = !taxonGroupNoWeight;
        const showIndividualCount = taxonGroupNoWeight;
        const showSamplingBatch = showWeight && this.allowSubBatches;
        const samplingBatchEnabled = !taxonGroupNoWeight && hasSubBatches && this.allowSubBatches;
        const showSampleWeight = showSamplingBatch && showWeight;
        const showChildrenWeight = !taxonGroupNoWeight;
        // Required ?
        const requiredWeight = showWeight && hasSubBatches;
        const requiredSampleWeight = showSampleWeight && hasSubBatches;
        const requiredIndividualCount = !showWeight && showIndividualCount && hasSubBatches;
        // Update children state
        const childrenState = Object.assign(Object.assign({}, this.childrenState), { showWeight,
            requiredWeight,
            showIndividualCount,
            requiredIndividualCount,
            showSamplingBatch,
            showSampleWeight,
            requiredSampleWeight,
            showChildrenWeight,
            samplingBatchEnabled });
        return childrenState;
    }
    onUpdateFormGroup(form) {
        const _super = Object.create(null, {
            onUpdateFormGroup: { get: () => super.onUpdateFormGroup }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onUpdateFormGroup.call(this, form);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], BatchGroupForm.prototype, "qvPmfm", null);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupForm.prototype, "childrenPmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupForm.prototype, "taxonGroupsNoWeight", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupForm.prototype, "allowSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupForm.prototype, "defaultHasSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupForm.prototype, "showHasSubBatchesButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], BatchGroupForm.prototype, "childrenState", null);
__decorate([
    ViewChildren('firstInput'),
    __metadata("design:type", QueryList)
], BatchGroupForm.prototype, "firstInputFields", void 0);
__decorate([
    ViewChildren('childForm'),
    __metadata("design:type", QueryList)
], BatchGroupForm.prototype, "childrenList", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchGroupForm.prototype, "hasSubBatches", null);
BatchGroupForm = BatchGroupForm_1 = __decorate([
    Component({
        selector: 'app-batch-group-form',
        templateUrl: 'batch-group.form.html',
        styleUrls: ['batch-group.form.scss'],
        providers: [
            { provide: BatchForm, useExisting: forwardRef(() => BatchGroupForm_1) },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        ReferentialRefService,
        BatchGroupValidatorService])
], BatchGroupForm);
export { BatchGroupForm };
//# sourceMappingURL=batch-group.form.js.map