import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectorRef, Directive, EventEmitter, Injector, Input, Optional, Output } from '@angular/core';
import { isObservable, merge } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from './measurement.validator';
import { filter, map } from 'rxjs/operators';
import { MeasurementValuesUtils } from './measurement.model';
import { AppForm, changeCaseToUnderscore, equals, firstNotNilPromise, firstTrue, isNil, toNumber } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { RxStateProperty } from '@app/shared/state/state.decorator';
export const MeasurementsFormReadySteps = Object.freeze({
    STARTING: 0,
    LOADING_PMFMS: 1,
    SETTING_PMFMS: 2,
    UPDATING_FORM_GROUP: 3,
    FORM_GROUP_READY: 4 // OK, the form is ready
});
let MeasurementValuesForm = class MeasurementValuesForm extends AppForm {
    constructor(injector, measurementsValidatorService, formBuilder, programRefService, form, options) {
        super(injector, form);
        this.measurementsValidatorService = measurementsValidatorService;
        this.formBuilder = formBuilder;
        this.programRefService = programRefService;
        this._state = new RxState();
        this._onRefreshPmfms = new EventEmitter();
        this.applyingValue = false;
        this.cd = null;
        this.acquisitionLevel$ = this._state.select('acquisitionLevel');
        this.programLabel$ = this._state.select('programLabel');
        this.strategyId$ = this._state.select('strategyId');
        this.strategyLabel$ = this._state.select('strategyLabel');
        this.pmfms$ = this._state.select('pmfms');
        this.ready$ = this._state.select('ready');
        this.compact = false;
        this.floatLabel = 'auto';
        this.i18nPmfmPrefix = null;
        this.i18nSuffix = null;
        this.valueChanges = new EventEmitter();
        this.cd = injector.get(ChangeDetectorRef);
        this._pmfmNamePipe = injector.get(PmfmNamePipe);
        this.options = Object.assign({ skipComputedPmfmControl: true, skipDisabledPmfmControl: true }, options);
        // Initial state
        this._state.set({
            readyStep: MeasurementsFormReadySteps.STARTING,
            forceOptional: false,
            requiredStrategy: false,
            requiredGear: false,
        });
        if (!this.cd && !environment.production) {
            console.warn(this._logPrefix + 'No injected ChangeDetectorRef found! Please make sure your component has \'changeDetection: ChangeDetectionStrategy.OnPush\'');
        }
        // DEBUG
        this._logPrefix = '[measurements-values] ';
        //this.debug = !environment.production;
    }
    set pmfms(pmfms) {
        // /!\ DO NOT emit event if not loaded.
        // (e.g. Required to avoid form ready to be resetted, when pmfms not changed)
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
    get isNewData() {
        var _a;
        return isNil((_a = this.data) === null || _a === void 0 ? void 0 : _a.id);
    }
    get programControl() {
        return this.form.get('program');
    }
    get measurementValuesForm() {
        return this._measurementValuesForm || this.form.controls.measurementValues;
    }
    ngOnInit() {
        super.ngOnInit();
        this._state.hold(this._state.select('acquisitionLevel'), acquisitionLevel => {
            this._logPrefix = `[measurements-values] (${acquisitionLevel}) `;
        });
        // Load pmfms; when input property set (skip if component is starting = waiting markAsReady())
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
            .pipe(map(step => step >= MeasurementsFormReadySteps.FORM_GROUP_READY)));
        // Listen form changes
        this.registerSubscription(this.form.valueChanges
            .pipe(filter(() => !this.loading && !this.applyingValue && this.valueChanges.observers.length > 0))
            .subscribe((_) => this.valueChanges.emit(this.value)));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this._state.ngOnDestroy();
    }
    /**
     * Reset all data to original value. Useful sometimes, to re init the component (e.g. physical gear form).
     * Note: Keep @Input() attributes unchanged
     */
    unload() {
        this.data = null;
        this.applyingValue = false;
        this._measurementValuesForm = null;
        this.loadingSubject.next(true);
        this.readySubject.next(false);
        this.errorSubject.next(null);
        this.resetPmfms();
    }
    setValue(data, opts) {
        return this.applyValue(data, opts);
    }
    reset(data, opts) {
        // Applying value to form (that should be ready).
        return this.updateView(data, opts);
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
        // Wait form loaded, before mark as loaded
        this.doWhenReady(() => super.markAsLoaded(opts));
    }
    trackPmfmFn(index, pmfm) {
        // Add properties that can be changed
        return `${pmfm.id}-${pmfm.required}-${pmfm.hidden}`;
    }
    isVisiblePmfm(pmfm) {
        return !pmfm.hidden;
    }
    /* -- protected methods -- */
    doWhenReady(runnable) {
        // Wait form ready, before executing
        this._state.hold(firstTrue(this.ready$), runnable);
    }
    /**
     * Wait form is ready, before setting the value to form
     * /!\ should NOT be overwritten by subclasses.
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
                if (data && data === this.data) {
                    // Applying value to form (that should be ready).
                    yield this.updateView(data, opts);
                    this.markAsLoaded();
                }
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
                this.markAsLoaded();
            }
            finally {
                this.applyingValue = false;
            }
        });
    }
    onApplyingEntity(data, opts) {
        var _a;
        // Propagate program
        if ((_a = data === null || data === void 0 ? void 0 : data.program) === null || _a === void 0 ? void 0 : _a.label) {
            this.programLabel = data.program.label;
        }
    }
    updateView(data, opts) {
        const _super = Object.create(null, {
            setValue: { get: () => super.setValue }
        });
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Warn is form is NOT ready
            if (this.debug && this.readyStep < MeasurementsFormReadySteps.FORM_GROUP_READY) {
                console.warn(`${this._logPrefix} Trying to set value, but form may be not ready!`);
            }
            // DEBUG
            if (this.debug)
                console.debug(`${this._logPrefix} updateView() with value:`, data);
            // Adapt measurement values to form (if not skip)
            if (!opts || opts.normalizeEntityToForm !== false) {
                this.normalizeEntityToForm(data);
            }
            // If a program has been filled, always keep it
            const program = (_a = this.programControl) === null || _a === void 0 ? void 0 : _a.value;
            if (data && (program === null || program === void 0 ? void 0 : program.label)) {
                data.program = program;
            }
            this.data = data;
            yield _super.setValue.call(this, data, opts);
            if (!opts || opts.emitEvent !== false) {
                this.form.markAsPristine();
                this.form.markAsUntouched();
                this.markForCheck();
            }
            // Restore form status
            this.updateViewState(Object.assign({ onlySelf: true }, opts));
        });
    }
    getValue() {
        var _a, _b;
        if (this.loading)
            return this.data; // Avoid to return not well loaded data
        const measurementValuesForm = this.measurementValuesForm;
        const json = this.form.value;
        if (measurementValuesForm) {
            // Filter pmfms, to avoid saving all, when update
            const filteredPmfms = (this.pmfms || [])
                .filter(pmfm => {
                const control = measurementValuesForm.controls[pmfm.id];
                return control
                    // Disabled (skipped by default)
                    && (!control.disabled || this.options.skipDisabledPmfmControl === false)
                    // Computed (skipped by default)
                    && (!pmfm.isComputed || this.options.skipComputedPmfmControl === false);
            });
            if (filteredPmfms.length) {
                json.measurementValues = Object.assign(((_a = this.data) === null || _a === void 0 ? void 0 : _a.measurementValues) || {}, MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, filteredPmfms, { keepSourceObject: false }));
            }
        }
        // Restore program, if disabled
        const programControl = this.form.get('program');
        if (programControl === null || programControl === void 0 ? void 0 : programControl.disabled) {
            json.program = programControl.value;
        }
        if ((_b = this.data) === null || _b === void 0 ? void 0 : _b.fromObject) {
            this.data.fromObject(json);
        }
        else {
            this.data = json;
        }
        return this.data;
    }
    setReadyStep(step) {
        // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
        step = toNumber(step, MeasurementsFormReadySteps.LOADING_PMFMS);
        // Emit, if changed
        if (this.readyStep !== step) {
            // DEBUG
            if (this.debug)
                console.debug(`${this._logPrefix} Loading step -> ${step}`);
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
            || (this.requiredStrategy && isNil(this.strategyLabel))
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
            //if (this.debug) console.debug(`${this._logPrefix} setPmfms()`);
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
                if (this.options.mapPmfms) {
                    pmfms = yield this.options.mapPmfms(pmfms);
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
        this._state.set('pmfms', (_) => undefined);
    }
    translateControlPath(path, pmfms) {
        if (path.includes('measurementValues.')) {
            pmfms = pmfms || this.pmfms;
            const parts = path.split('.');
            const pmfmId = parseInt(parts[parts.length - 1]);
            const pmfm = pmfms === null || pmfms === void 0 ? void 0 : pmfms.find(p => p.id === pmfmId);
            if (pmfm) {
                return this._pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nSuffix });
            }
        }
        const fieldName = path.substring(path.lastIndexOf('.') + 1);
        const i18nKey = (this.i18nFieldPrefix || '') + changeCaseToUnderscore(fieldName).toUpperCase();
        return this.translate.instant(i18nKey);
    }
    updateFormGroup(pmfms, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            pmfms = pmfms || this.pmfms;
            if (!pmfms)
                return; // Skip
            const form = this.form;
            this._measurementValuesForm = form.get('measurementValues');
            // Disable the form (if exists)
            if ((_a = this._measurementValuesForm) === null || _a === void 0 ? void 0 : _a.enabled) {
                this._measurementValuesForm.disable({ onlySelf: true, emitEvent: false });
            }
            // Mark as loading
            this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
            if (this.debug)
                console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);
            // No pmfms (= empty form)
            if (!pmfms.length) {
                // Reset measurement form (if exists)
                if (this._measurementValuesForm) {
                    this.measurementsValidatorService.updateFormGroup(this._measurementValuesForm, { pmfms: [], emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
                    this._measurementValuesForm.reset({}, { onlySelf: true, emitEvent: false });
                }
            }
            else {
                // Create measurementValues form group
                if (!this._measurementValuesForm) {
                    this._measurementValuesForm = this.measurementsValidatorService.getFormGroup(null, { pmfms });
                    form.addControl('measurementValues', this._measurementValuesForm, { emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
                    this._measurementValuesForm.disable({ onlySelf: true, emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
                }
                // Or update if already exist
                else {
                    this.measurementsValidatorService.updateFormGroup(this._measurementValuesForm, { pmfms });
                }
            }
            // Call options function
            if ((_b = this.options) === null || _b === void 0 ? void 0 : _b.onUpdateFormGroup) {
                yield this.options.onUpdateFormGroup(form);
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
    normalizeEntityToForm(data) {
        if (!data)
            return; // skip
        // Adapt entity measurement values to reactive form
        const pmfms = this.pmfms || [];
        MeasurementValuesUtils.normalizeEntityToForm(data, pmfms, this.form);
    }
    waitIdleThenRefreshPmfms(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Wait previous loading is finished
                yield this.waitIdle({ stop: this.destroySubject, stopError: false });
                // Then refresh pmfms
                yield this.loadPmfms();
            }
            catch (err) {
                console.error(err);
            }
        });
    }
    markForCheck() {
        var _a;
        (_a = this.cd) === null || _a === void 0 ? void 0 : _a.markForCheck();
    }
};
__decorate([
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementValuesForm.prototype, "readyStep", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], MeasurementValuesForm.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "floatLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "i18nPmfmPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], MeasurementValuesForm.prototype, "forceOptionalExcludedPmfmIds", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "programLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], MeasurementValuesForm.prototype, "strategyLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementValuesForm.prototype, "strategyId", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementValuesForm.prototype, "requiredStrategy", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], MeasurementValuesForm.prototype, "gearId", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementValuesForm.prototype, "requiredGear", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], MeasurementValuesForm.prototype, "forceOptional", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], MeasurementValuesForm.prototype, "pmfms", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], MeasurementValuesForm.prototype, "value", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], MeasurementValuesForm.prototype, "valueChanges", void 0);
MeasurementValuesForm = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __param(4, Optional()),
    __param(5, Optional()),
    __metadata("design:paramtypes", [Injector,
        MeasurementsValidatorService,
        UntypedFormBuilder,
        ProgramRefService,
        UntypedFormGroup, Object])
], MeasurementValuesForm);
export { MeasurementValuesForm };
//# sourceMappingURL=measurement-values.form.class.js.map