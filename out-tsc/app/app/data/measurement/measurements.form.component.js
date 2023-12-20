import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, Optional, Output, } from '@angular/core';
import { isObservable, merge, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { UntypedFormBuilder } from '@angular/forms';
import { MeasurementsValidatorService } from './measurement.validator';
import { AppForm, AppFormUtils, createPromiseEventEmitter, emitPromiseEvent, equals, firstNotNilPromise, firstTrue, isNil, toNumber, } from '@sumaris-net/ngx-components';
import { MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsFormReadySteps } from '@app/data/measurement/measurement-values.form.class';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
let MeasurementsForm = class MeasurementsForm extends AppForm {
    constructor(injector, measurementValidatorService, formBuilder, programRefService, __state) {
        super(injector, measurementValidatorService.getFormGroup([]));
        this.measurementValidatorService = measurementValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this.__state = __state;
        this._state = new RxState();
        this.applyingValue = false;
        this.keepRankOrder = false;
        this.skipDisabledPmfmControl = true;
        this.skipComputedPmfmControl = true;
        this.cd = null;
        this.showError = false;
        this.compact = false;
        this.floatLabel = 'auto';
        this.animated = false;
        this.mobile = false;
        this.i18nPmfmPrefix = null;
        this.i18nSuffix = null;
        this.mapPmfms = createPromiseEventEmitter();
        this.onUpdateFormGroup = createPromiseEventEmitter();
        this.cd = injector.get(ChangeDetectorRef);
        // Load pmfms; when input property set (skip if component is starting = waiting markAsready())
        this._state.hold(merge(this._state.select(['programLabel', 'acquisitionLevel', 'forceOptional'], res => res), this._state.select(['requiredStrategy', 'strategyLabel'], res => res), this._state.select(['requiredStrategy', 'strategyId'], res => res), this._state.select(['requiredGear', 'gearId'], res => res))
            .pipe(
        // Only if markAsReady() called
        filter(_ => !this.starting)), 
        // /!\ DO NOT emit event if not loaded.
        // (e.g. Required to avoid CatchBatchForm to have 'loading=true', when gearId is set)
        (_) => this.loadPmfms({ emitEvent: false }));
        // Update form, when pmfms set
        this._state.hold(this.pmfms$, (pmfms) => this.updateFormGroup(pmfms));
        this._state.connect('ready', this._state.select('readyStep')
            .pipe(distinctUntilChanged(), map(step => step >= MeasurementsFormReadySteps.FORM_GROUP_READY)));
        // Initial state
        this._state.set({
            readyStep: MeasurementsFormReadySteps.STARTING,
            forceOptional: false,
            requiredStrategy: false,
            requiredGear: false,
        });
        // DEBUG
        this._logPrefix = '[measurements-form]';
        this._state.hold(this._state.select('acquisitionLevel'), acquisitionLevel => {
            this._logPrefix += `[measurements-form] (${acquisitionLevel})`;
        });
        //this.debug = !environment.production;
    }
    //@Input() @RxStateProperty() pmfms: IPmfm[];
    set pmfms(pmfms) {
        this.setPmfms(pmfms, { emitEvent: false });
    }
    get pmfms() {
        return this._state.get('pmfms');
    }
    set value(value) {
        this.applyValue(value);
    }
    get value() {
        return this.getValue();
    }
    get starting() {
        return this.readyStep === MeasurementsFormReadySteps.STARTING;
    }
    get formError() {
        return this.getFormError(this.form);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this._state.ngOnDestroy();
    }
    /**
     * Reset all data to original value. Useful sometimes, to re init the component (e.g. operation page).
     * Note: Keep @Input() attributes unchanged
     */
    unload() {
        this.data = null;
        this.applyingValue = false;
        this.loadingSubject.next(true);
        this.readySubject.next(false);
        this.errorSubject.next(null);
        this.resetPmfms();
    }
    setValue(data, opts) {
        return this.applyValue(data, opts);
    }
    reset(data, opts) {
        return this.applyValue(data, opts);
    }
    markAsReady(opts) {
        // Start loading pmfms
        if (this.starting) {
            this.setReadyStep(MeasurementsFormReadySteps.LOADING_PMFMS);
            this.loadPmfms();
        }
        // Wait form ready, before mark as ready
        this.doWhenReady(() => super.markAsReady(opts));
    }
    markAsLoaded(opts) {
        // Wait form ready, before mark as ready
        this.doWhenReady(() => super.markAsLoaded(opts));
    }
    trackPmfmFn(index, pmfm) {
        // Add properties that can be changed
        return `${pmfm.id}-${pmfm.required}-${pmfm.hidden}`;
    }
    /* -- protected methods -- */
    doWhenReady(runnable) {
        // Wait form ready, before executing
        this._state.hold(firstTrue(this.ready$), runnable);
    }
    getFormError(form) {
        const errors = AppFormUtils.getFormErrors(form);
        return Object.getOwnPropertyNames(errors)
            .map(field => {
            let fieldName;
            const pmfmId = parseInt(field);
            const pmfm = (this.pmfms || []).find(p => p.id === pmfmId);
            if (pmfm) {
                fieldName = PmfmUtils.getPmfmName(pmfm);
            }
            const fieldErrors = errors[field];
            const errorMsg = Object.keys(fieldErrors).map(errorKey => {
                const key = 'ERROR.FIELD_' + errorKey.toUpperCase();
                return this.translate.instant(key, fieldErrors[key]);
            }).join(', ');
            return fieldName + ': ' + errorMsg;
        }).join(', ');
    }
    /**
     * Wait form is ready, before setting the value to form
     *
     * @param data
     * @param opts
     */
    applyValue(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.applyingValue = true;
            try {
                // Will avoid data to be set inside function updateFormGroup()
                this.data = data;
                if (this.debug)
                    console.debug(`${this._logPrefix} Applying value...`, data);
                this.onApplyingEntity(data, opts);
                // Wait form is ready, before applying the data
                yield this.ready({ stop: this.destroySubject });
                // Data is still the same (not changed : applying)
                if (data === this.data) {
                    // Applying value to form (that should be ready).
                    yield this.updateView(data, opts);
                    this.markAsLoaded();
                }
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.message) !== 'stop') {
                    console.error(`${this._logPrefix} Error while applying value: ${err && err.message || err}`, err);
                    this.setError(err && err.message || err);
                }
                this.markAsLoaded();
            }
            finally {
                this.applyingValue = false;
            }
        });
    }
    onApplyingEntity(data, opts) {
        // Can be override by subclasses
    }
    updateView(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Warn is form is NOT ready
            if (this.debug && this.readyStep < MeasurementsFormReadySteps.FORM_GROUP_READY) {
                console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
            }
            const pmfms = this.pmfms;
            this.data = MeasurementUtils.initAllMeasurements(data, pmfms, this.entityName, this.keepRankOrder);
            const json = MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(this.data), pmfms);
            this.form.patchValue(json, opts);
            // Restore form status
            this.updateViewState(Object.assign({ onlySelf: true }, opts));
        });
    }
    getValue() {
        if (this.loading)
            return this.data; // Avoid to return not well loaded data
        // Find dirty pmfms, to avoid full update
        const form = this.form;
        const filteredPmfms = (this.pmfms || []).filter(pmfm => {
            const control = form.controls[pmfm.id];
            return control && (control.dirty
                || (this.skipDisabledPmfmControl === false && control.disabled)
                || (this.skipComputedPmfmControl === false && pmfm.isComputed));
        });
        if (filteredPmfms.length) {
            // Update measurements value
            const json = form.value;
            MeasurementUtils.setValuesByFormValues(this.data, json, filteredPmfms);
        }
        return this.data;
    }
    setReadyStep(step) {
        // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
        step = toNumber(step, MeasurementsFormReadySteps.LOADING_PMFMS);
        // Emit, if changed
        if (this.readyStep !== step) {
            // DEBUG
            //if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);
            this.readyStep = step;
        }
        // Call markAsLoading, if the step is the first step
        if (this.loaded && step <= MeasurementsFormReadySteps.LOADING_PMFMS) {
            if (this.dirty)
                this.data = this.value;
            this.markAsLoading();
        }
    }
    /**
     * Check if can load (must have: program, acquisition - and gear if required)
     */
    canLoadPmfms() {
        // Check if can load (must have: program, acquisition - and gear if required)
        if (isNil(this.programLabel)
            || isNil(this.acquisitionLevel)
            || (this.requiredStrategy && isNil(this.strategyLabel) && isNil(this.strategyId))
            || (this.requiredGear && isNil(this.gearId))) {
            // DEBUG
            //if (this.debug) console.debug(`${this._logPrefix} cannot load pmfms (missing some inputs)`);
            return false;
        }
        return true;
    }
    loadPmfms(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canLoadPmfms())
                return;
            // DEBUG
            //if (this.debug) console.debug(`${this.logPrefix} loadPmfms()`);
            if (!opts || opts.emitEvent !== false) {
                this.setReadyStep(MeasurementsFormReadySteps.LOADING_PMFMS);
            }
            let pmfms;
            try {
                // Load pmfms
                // DO NOT call loadProgramPmfms(). Next setPmfms() will call a firstNotNilPromise() with options.stop
                pmfms = this.programRefService.watchProgramPmfms(this.programLabel, {
                    strategyId: this.strategyId,
                    strategyLabel: this.strategyLabel,
                    acquisitionLevel: this.acquisitionLevel,
                    gearId: this.gearId
                });
            }
            catch (err) {
                console.error(`${this._logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
                pmfms = undefined;
            }
            // Apply pmfms
            yield this.setPmfms(pmfms, opts);
        });
    }
    setPmfms(pmfms, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // If undefined: reset pmfms
            if (!pmfms) {
                this.resetPmfms();
                return undefined; // break
            }
            // DEBUG
            //if (this.debug) console.debug(`${this.logPrefix} setPmfms()`);
            // Mark as settings pmfms
            if (!opts || opts.emitEvent !== false) {
                this.setReadyStep(MeasurementsFormReadySteps.SETTING_PMFMS);
            }
            try {
                // Wait loaded, if observable
                if (isObservable(pmfms)) {
                    if (this.debug)
                        console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable...`);
                    pmfms = yield firstNotNilPromise(pmfms, { stop: this.destroySubject });
                    if (this.debug)
                        console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable [OK]`);
                }
                // If force to optional, create a copy of each pmfms that should be forced
                if (this.forceOptional) {
                    const excludedPmfmIds = this.forceOptionalExcludedPmfmIds || [];
                    pmfms = pmfms.map(pmfm => {
                        if (pmfm.required && !excludedPmfmIds.includes(pmfm.id)) {
                            // Create a copy of each required pmfms
                            // To keep unchanged the original entity
                            pmfm = pmfm.clone();
                            pmfm.required = false;
                        }
                        // Return original pmfm, as not need to be overwritten
                        return pmfm;
                    });
                }
                // Call the map function
                if (this.mapPmfms.observed) {
                    const res = yield emitPromiseEvent(this.mapPmfms, 'pmfms', { detail: { pmfms } });
                    pmfms = Array.isArray(res) ? res : pmfms;
                }
                // Apply (if changed)
                if (!equals(pmfms, this.pmfms)) {
                    // DEBUG log
                    if (this.debug)
                        console.debug(`${this._logPrefix} Pmfms changed: `, pmfms);
                    // next step
                    if (!opts || opts.emitEvent !== false) {
                        this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
                    }
                    // Apply pmfms to state
                    this._state.set('pmfms', () => pmfms);
                }
                return pmfms;
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.message) !== 'stop') {
                    console.error(`${this._logPrefix} Error while applying pmfms: ${err && err.message || err}`, err);
                }
                this.resetPmfms();
                return undefined;
            }
        });
    }
    resetPmfms() {
        if (isNil(this.pmfms))
            return; // Already reset
        if (this.debug)
            console.warn(`${this._logPrefix} Reset pmfms`);
        // Reset step
        if (!this.starting && this.loaded)
            this.setReadyStep(MeasurementsFormReadySteps.STARTING);
        // Update state
        this.pmfms = undefined;
    }
    updateFormGroup(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            pmfms = pmfms || this.pmfms;
            if (!pmfms)
                return; // Skip
            const form = this.form;
            if (form.enabled) {
                form.disable();
            }
            // Mark as loading
            this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
            if (this.debug)
                console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);
            // No pmfms (= empty form)
            if (!pmfms.length) {
                // Reset form
                this.measurementValidatorService.updateFormGroup(this.form, { pmfms: [] });
                this.form.reset({}, { onlySelf: true, emitEvent: false });
            }
            else {
                // Update the existing form
                this.measurementValidatorService.updateFormGroup(this.form, { pmfms });
            }
            // Call options function
            if (this.onUpdateFormGroup.observed) {
                yield emitPromiseEvent(this.onUpdateFormGroup, 'onUpdateFormGroup', { detail: { form } });
            }
            if (this.debug)
                console.debug(`${this._logPrefix} Form controls updated`);
            this.setReadyStep(MeasurementsFormReadySteps.FORM_GROUP_READY);
            // Data already set: apply value again to fill the form
            if (!this.applyingValue) {
                // Update data in view
                if (this.data) {
                    yield this.updateView(this.data, { onlySelf: true, emitEvent: false });
                    this.markAsLoaded();
                }
                // No data defined yet
                else {
                    // Restore enable state (because form.setValue() can change it !)
                    this.updateViewState({ onlySelf: true, emitEvent: false });
                }
            }
            return true;
        });
    }
    updateViewState(opts) {
        if (this._enable) {
            this.enable(opts);
        }
        else {
            this.disable(opts);
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementsForm.prototype, "readyStep", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], MeasurementsForm.prototype, "pmfms$", void 0);
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], MeasurementsForm.prototype, "ready$", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MeasurementsForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MeasurementsForm.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "entityName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MeasurementsForm.prototype, "animated", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MeasurementsForm.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], MeasurementsForm.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], MeasurementsForm.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], MeasurementsForm.prototype, "showButtonIcons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "i18nPmfmPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], MeasurementsForm.prototype, "forceOptionalExcludedPmfmIds", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "programLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementsForm.prototype, "strategyLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementsForm.prototype, "strategyId", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsForm.prototype, "requiredStrategy", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementsForm.prototype, "gearId", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsForm.prototype, "requiredGear", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementsForm.prototype, "forceOptional", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], MeasurementsForm.prototype, "pmfms", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], MeasurementsForm.prototype, "value", null);
__decorate([
    Output(),
    __metadata("design:type", EventEmitter)
], MeasurementsForm.prototype, "mapPmfms", void 0);
__decorate([
    Output('updateFormGroup'),
    __metadata("design:type", EventEmitter)
], MeasurementsForm.prototype, "onUpdateFormGroup", void 0);
MeasurementsForm = __decorate([
    Component({
        selector: 'app-form-measurements',
        templateUrl: './measurements.form.component.html',
        styleUrls: ['./measurements.form.component.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(4, Optional()),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        RxState])
], MeasurementsForm);
export { MeasurementsForm };
//# sourceMappingURL=measurements.form.component.js.map