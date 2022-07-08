import { ChangeDetectorRef, Directive, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { BehaviorSubject, isObservable, Observable } from 'rxjs';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { filter, first } from 'rxjs/operators';
import { IEntityWithMeasurement, MeasurementValuesUtils } from '../services/model/measurement.model';
import { AppForm, firstNotNilPromise, isNil, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';

export interface MeasurementValuesFormOptions<T extends IEntityWithMeasurement<T>> {
  mapPmfms?: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
  onUpdateFormGroup?: (formGroup: FormGroup) => void | Promise<void>;
  skipDisabledPmfmControl?: boolean; // True by default
  skipComputedPmfmControl?: boolean; // True by default
}

export const MeasurementFormLoadingSteps = Object.freeze({
  STARTING: 0,
  LOADING_PMFMS: 1,
  SETTING_PMFMS: 2,
  UPDATING_FORM_GROUP: 3,
  FORM_GROUP_READY: 4,
  READY: 5,
  LOADED: 6
});

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class MeasurementValuesForm<T extends IEntityWithMeasurement<T>> extends AppForm<T>
  implements OnInit, OnDestroy {

  $loadingStep = new BehaviorSubject<number>(MeasurementFormLoadingSteps.STARTING);
  $programLabel = new BehaviorSubject<string>(undefined);
  $strategyLabel = new BehaviorSubject<string>(undefined);
  $pmfms = new BehaviorSubject<IPmfm[]>(undefined);

  protected _logPrefix: string;
  protected _gearId: number = null;
  protected _acquisitionLevel: string;
  protected _forceOptional = false;
  protected _onRefreshPmfms = new EventEmitter<any>();
  protected data: T;
  protected applyingValue = false;
  protected _measurementValuesForm: FormGroup;
  protected options: MeasurementValuesFormOptions<T>;
  protected cd: ChangeDetectorRef = null;

  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() requiredStrategy = false;
  @Input() requiredGear = false;
  @Input() i18nPmfmPrefix: string = null;
  @Input() i18nSuffix: string = null;

  @Input()
  set programLabel(value: string) {
    this.setProgramLabel(value, {emitEvent: !this.starting});
  }

  get programLabel(): string {
    return this.$programLabel.value;
  }

  @Input()
  set strategyLabel(value: string) {
    this.setStrategyLabel(value, {emitEvent: !this.starting});
  }

  get strategyLabel(): string {
    return this.$strategyLabel.value;
  }

  @Input()
  set acquisitionLevel(value: string) {
    this.setAcquisitionLevel(value, {emitEvent: !this.starting});
  }

  get acquisitionLevel(): string {
    return this._acquisitionLevel;
  }

  @Input()
  set gearId(value: number) {
    this.setGearId(value, {emitEvent: !this.starting});
  }

  get gearId(): number {
    return this._gearId;
  }

  @Input()
  set value(value: T) {
    this.applyValue(value);
  }

  get value(): T {
    return this.getValue();
  }

  @Input() set pmfms(pmfms: Observable<IPmfm[]> | IPmfm[]) {
    if (pmfms !== this.$pmfms.value) {
      this.setPmfms(pmfms);
    }
  }

  @Input()
  set forceOptional(value: boolean) {
    if (this._forceOptional !== value) {
      this._forceOptional = value;
      if (!this.starting) this._onRefreshPmfms.emit();
    }
  }

  get forceOptional(): boolean {
    return this._forceOptional;
  }

  @Output() valueChanges = new EventEmitter<any>();

  @Output() get strategyLabelChanges(): Observable<string> {
    return this.$strategyLabel.asObservable();
  }

  get starting(): boolean {
    return this.$loadingStep.value === MeasurementFormLoadingSteps.STARTING;
  }

  get loading(): boolean {
    return this.loadingSubject.value;
  }

  get isNewData(): boolean {
    return isNil(this.data?.id);
  }

  get programControl(): AbstractControl {
    return this.form.get('program');
  }

  get measurementValuesForm(): FormGroup {
    return this._measurementValuesForm || (this.form.controls.measurementValues as FormGroup);
  }

  protected constructor(injector: Injector,
                        protected measurementValidatorService: MeasurementsValidatorService,
                        protected formBuilder: FormBuilder,
                        protected programRefService: ProgramRefService,
                        form?: FormGroup,
                        options?: MeasurementValuesFormOptions<T>
  ) {
    super(injector, form);
    this.cd = injector.get(ChangeDetectorRef);
    this.options = {
      skipComputedPmfmControl: true,
      skipDisabledPmfmControl: true,
      ...options
    };

    this.registerSubscription(
      this._onRefreshPmfms.subscribe(() => this.loadPmfms())
    );
    // Auto update form, when pmfms are loaded
    this.registerSubscription(
      this.$pmfms
        .pipe(filter(isNotNil))
        .subscribe(pmfms => this.updateFormGroup(pmfms))
    );

    // DEBUG
    //this.debug = !environment.production;
  }

  ngOnInit() {
    this._logPrefix = this._logPrefix || `[meas-values-${this._acquisitionLevel?.toLowerCase().replace(/[_]/g, '-') || '?'}]`;

    super.ngOnInit();

    // Listen form changes
    this.registerSubscription(
      this.form.valueChanges
        .pipe(
          filter(() => !this.loading && !this.applyingValue && this.valueChanges.observers.length > 0)
        )
        .subscribe((_) => this.valueChanges.emit(this.value))
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$loadingStep.unsubscribe();
    this.$pmfms.unsubscribe();
    this.$programLabel.unsubscribe();
    this.$strategyLabel.unsubscribe();
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
    this.resetPmfms();
  }

  setValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean;}): Promise<void> | void {
    return this.applyValue(data, opts);
  }

  reset(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean;}) {
    return this.applyValue(data, opts);
  }

  markAsLoading(opts?: {step?: number; emitEvent?: boolean;}) {

    // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
    const step = toNumber(opts?.step, MeasurementFormLoadingSteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.$loadingStep.value !== step) {
      if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);
      this.$loadingStep.next(step);
    }

    // Call inherited function (to update loadingSubject)
    if (step <= MeasurementFormLoadingSteps.LOADING_PMFMS) {
      super.markAsLoading(opts);
    }
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    // Start loading pmfms
    if (this.starting) {
      this.setLoadingProgression(MeasurementFormLoadingSteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Wait form ready, before mark as ready
    if (this.$loadingStep.value < MeasurementFormLoadingSteps.FORM_GROUP_READY) {
      this.registerSubscription(
        this.$loadingStep.pipe(
          filter(step => step >= MeasurementFormLoadingSteps.FORM_GROUP_READY),
          first()
        )
        .subscribe(() => super.markAsReady(opts))
      )
    }
    else {
      super.markAsReady(opts);
    }
  }

  markAsLoaded() {
    // Wait form loaded, before mark as loaded
    if (this.$loadingStep.value < MeasurementFormLoadingSteps.FORM_GROUP_READY) {
      this.registerSubscription(
        this.$loadingStep.pipe(
          filter(step => step >= MeasurementFormLoadingSteps.FORM_GROUP_READY),
          first()
        )
        .subscribe(() => super.markAsLoaded())
      )
    }
    else {
      super.markAsLoaded();
    }
  }

  translateControlPath(path: string): string {
    if (path.startsWith('measurementValues.')) {
      const pmfmId = parseInt(path.split('.')[1]);
      const pmfm = (this.$pmfms.value || []).find(p => p.id === pmfmId);
      if (pmfm) return PmfmUtils.getPmfmName(pmfm);
    }
    return super.translateControlPath(path);
  }

  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return pmfm.id;
  }

  /* -- protected methods -- */

  /**
   * /!\ should NOT be overwritten by subclasses. Use setFormValue() instead
   * @param data
   * @param opts
   */
  async applyValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any}) {
    this.applyingValue = true;

    try {
      // Will avoid data to be set inside function updateFormGroup()
      this.data = data;

      if (this.debug) console.debug(`${this._logPrefix} Applying value...`, data);
      this.onApplyingEntity(data, opts);

      // Wait form is ready, before applying the data
      await this.ready();

      // Data is still the same (not changed : applying)
      if (data === this.data) {
        // Applying value to form (that should be ready).
        await this.updateView(this.data, opts);
        this.markAsLoaded();
      }
    }
    catch(err) {
      console.error(err);
      this.error = err && err.message || err;
      this.markAsLoaded();
    }
    finally {
      this.applyingValue = false;
    }
  }

  protected onApplyingEntity(data: T, opts?: {[key: string]: any;}) {
    if (data.program?.label) {
      // Propagate program
      this.setProgramLabel(data.program?.label);
    }
  }

  protected async updateView(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; }) {
    // Warn is form is NOT ready
    if (this.readySubject.value !== true) {
      console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
    }

    if (this.debug) console.debug(`${this._logPrefix} updateView() with:`, data);

    // Adapt measurement values to form (if not skip)
    if (!opts || opts.normalizeEntityToForm !== false) {
      this.normalizeEntityToForm(data);
    }

    // If a program has been filled, always keep it
    const program = this.programControl?.value;
    if (program?.label) {
      data.program = program;
    }

    this.data = data;

    super.setValue(data, opts);

    if (!opts || opts.emitEvent !== false) {
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.markForCheck();
    }

    // Restore form status
    this.updateViewState({onlySelf: true, ...opts});

  }

  protected setProgramLabel(value: string,  opts = {emitEvent: true}) {
    if (isNotNil(value) && this.$programLabel.value !== value) {

      this.$programLabel.next(value);

      // Reload pmfms
      if (opts.emitEvent !== false) this._onRefreshPmfms.emit();
    }
  }

  protected setStrategyLabel(value: string,  opts = {emitEvent: true}) {
    if (isNotNil(value) && this.$strategyLabel.value !== value) {

      this.$strategyLabel.next(value);

      // Reload pmfms
      if (opts.emitEvent !== false) this._onRefreshPmfms.emit();
    }
  }

  protected setAcquisitionLevel(value: string, opts = {emitEvent: true}) {
    if (isNotNil(value) && this._acquisitionLevel !== value) {
      this._acquisitionLevel = value;
      if (this._logPrefix?.indexOf('?') !== -1) this._logPrefix = `[meas-values-${this._acquisitionLevel.toLowerCase().replace(/[_]/g, '-')}]`;

      // Reload pmfms
      if (opts.emitEvent !== false) this._onRefreshPmfms.emit();
    }
  }

  protected setGearId(value: number, opts = {emitEvent: true}) {
    if (this._gearId !== value) {
      this._gearId = value;

      // Reload pmfms
      if (opts.emitEvent !== false) this._onRefreshPmfms.emit();
    }
  }

  protected getValue(): T {
    if (this.loading) return this.data; // Avoid to return not well loaded data

    const measurementValuesForm = this.measurementValuesForm;

    const json = this.form.value;

    if (measurementValuesForm) {
      // Filter pmfms, to avoid saving all, when update
      const filteredPmfms = (this.$pmfms.value || [])
        .filter(pmfm => {
          const control = measurementValuesForm.controls[pmfm.id];
          return control && (
            // Dirty
            control.dirty
            // Disabled (skipped by default)
            || (this.options.skipDisabledPmfmControl === false && control.disabled))
            // Computed (skipped by default)
            || (this.options.skipComputedPmfmControl === false && pmfm.isComputed);
        });

      if (filteredPmfms.length) {
        json.measurementValues = Object.assign(this.data?.measurementValues || {},
          MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, filteredPmfms, {keepSourceObject: false}));
      }
    }

    if (this.data && this.data.fromObject) {
      this.data.fromObject(json);
    } else {
      this.data = json;
    }

    return this.data;
  }

  protected setLoadingProgression(step: number) {
    this.markAsLoading({step})
  }

  /**
   * Check if can load (must have: program, acquisition - and gear if required)
   */
  protected canLoadPmfms(): boolean{
    // Check if can load (must have: program, acquisition - and gear if required)
    if (isNil(this.programLabel)
      || isNil(this._acquisitionLevel)
      || (this.requiredStrategy && isNil(this.strategyLabel))
      || (this.requiredGear && isNil(this._gearId))) {

      // DEBUG
      //if (this.debug) console.debug(`${this.logPrefix} cannot load pmfms (missing some inputs)`);

      return false;
    }
    return true;
  }

  protected async loadPmfms() {
    if (!this.canLoadPmfms()) return;

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} loadPmfms()`);

    this.setLoadingProgression(MeasurementFormLoadingSteps.LOADING_PMFMS);
    //if (this.$pmfms.value) this.$pmfms.next(undefined);

    let pmfms;
    try {
      // Load pmfms
      pmfms = (await this.programRefService.loadProgramPmfms(
        this.programLabel,
        {
          strategyLabel: this.strategyLabel,
          acquisitionLevel: this._acquisitionLevel,
          gearId: this._gearId
        })) || [];
    } catch (err) {
      console.error(`${this._logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
      pmfms = undefined;
    }

    // Apply pmfms
    await this.setPmfms(pmfms);
  }

  async setPmfms(value: IPmfm[] | Observable<IPmfm[]>): Promise<IPmfm[]> {
    // If undefined: reset pmfms
    if (!value) {
      this.resetPmfms();
      return undefined; // break
    }

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} setPmfms()`);

    // Mark as settings pmfms
    const previousLoadingStep = this.$loadingStep.value;
    this.setLoadingProgression(MeasurementFormLoadingSteps.SETTING_PMFMS);

    try {

      // Wait loaded, if observable
      let pmfms: IPmfm[];
      if (isObservable<IPmfm[]>(value)) {
        if (this.debug) console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNilPromise(value);
      } else {
        pmfms = value;
      }

      // If force to optional, create a copy of each pmfms that should be forced
      if (this._forceOptional) {
        pmfms = pmfms.map(pmfm => {
          if (pmfm.required) {
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
        const res = this.options.mapPmfms(pmfms);
        pmfms = (res instanceof Promise) ? await res : res;
      }

      // Apply (if changed)
      if (pmfms !== this.$pmfms.value) {
        // DEBUG log
        if (this.debug) console.debug(`${this._logPrefix} Pmfms changed {acquisitionLevel: '${this._acquisitionLevel}'}`, pmfms);

        // next step
        this.setLoadingProgression(MeasurementFormLoadingSteps.UPDATING_FORM_GROUP);
        this.$pmfms.next(pmfms);
      }
      else {
        // Nothing changes: restoring previous steps
        this.setLoadingProgression(previousLoadingStep);
      }

      return pmfms;
    }
    catch(err) {
      console.error(`${this._logPrefix} Error while applying pmfms: ${err && err.message || err}`, err);
      this.resetPmfms();
      return undefined;
    }
  }

  resetPmfms() {
    if (isNil(this.$pmfms.value)) return; // Already resetted

    if (this.debug) console.warn(`${this._logPrefix} Reset pmfms`);

    if (!this.starting && !this.loading) this.markAsLoading();
    this.$pmfms.next(undefined);
  }

  private async updateFormGroup(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.$pmfms.value;
    if (!pmfms) return; // Skip

    const form = this.form;
    this._measurementValuesForm = form.get('measurementValues') as FormGroup;

    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this._forceOptional}}, using pmfms:`, pmfms);

    // Disable the form (if need)
    if (this._measurementValuesForm?.enabled) {
      this._measurementValuesForm.disable({onlySelf: true, emitEvent: false});
    }

    // Mark as loading
    this.setLoadingProgression(MeasurementFormLoadingSteps.UPDATING_FORM_GROUP);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset measurement form (if exists)
      if (this._measurementValuesForm) {
        this.measurementValidatorService.updateFormGroup(this._measurementValuesForm, {pmfms: []});
        this._measurementValuesForm.reset({}, {onlySelf: true, emitEvent: false});
      }
    } else {
      if (this.debug) console.debug(`${this._logPrefix} Updating form controls, using pmfms:`, pmfms);

      // Create measurementValues form group
      if (!this._measurementValuesForm) {
        this._measurementValuesForm = this.measurementValidatorService.getFormGroup(null, {pmfms});

        form.addControl('measurementValues', this._measurementValuesForm);
        this._measurementValuesForm.disable({onlySelf: true, emitEvent: false});
      }

      // Or update if already exist
      else {
        this.measurementValidatorService.updateFormGroup(this._measurementValuesForm, {pmfms});
      }
    }

    // Call options function
    if (this.options && this.options.onUpdateFormGroup) {
      const res = this.options.onUpdateFormGroup(form);
      if (res instanceof Promise) {
        await res;
      }
    }

    if (this.debug) console.debug(`${this._logPrefix} Form controls updated`);
    this.setLoadingProgression(MeasurementFormLoadingSteps.FORM_GROUP_READY);

    if (!this.applyingValue) {
      // Update data in view
      if (this.data) {
        await this.updateView(this.data, {emitEvent: false});
      }
      // No data defined yet
      else {
        // Restore enable state (because form.setValue() can change it !)
        this.updateViewState({ onlySelf: true, emitEvent: false });
      }
    }

    return true;
  }

  protected updateViewState(opts?: { emitEvent?: boolean; onlySelf?: boolean; }) {
    if (this._enable) {
      this.enable(opts);
    }
    else {
      this.disable(opts);
    }
  }

  protected normalizeEntityToForm(data: T) {
    if (!data) return; // skip

    // Adapt entity measurement values to reactive form
    const pmfms = this.$pmfms.value || [];
    MeasurementValuesUtils.normalizeEntityToForm(data, pmfms, this.form);
  }

  protected markForCheck() {
    this.cd?.markForCheck();
  }
}
