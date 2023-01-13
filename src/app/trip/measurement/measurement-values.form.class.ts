import { ChangeDetectorRef, Directive, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { isObservable, merge, Observable } from 'rxjs';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { filter, map } from 'rxjs/operators';
import { IEntityWithMeasurement, MeasurementValuesUtils } from '../services/model/measurement.model';
import { AppForm, equals, firstNotNilPromise, firstTrue, isNil, toNumber } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';

export interface IMeasurementValuesFormOptions {
  mapPmfms?: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
  onUpdateFormGroup?: (formGroup: UntypedFormGroup) => void | Promise<void>;
  skipDisabledPmfmControl?: boolean; // True by default
  skipComputedPmfmControl?: boolean; // True by default
}

export interface MeasurementValuesState {
  ready: boolean;
  readyStep: number;
  programLabel: string;
  acquisitionLevel: string;
  strategyLabel: string;
  requiredStrategy: boolean;
  gearId: number;
  requiredGear: boolean;
  forceOptional: boolean;
  pmfms: IPmfm[];
}

export const PmfmFormReadySteps = Object.freeze({
  STARTING: 0, // initial state
  LOADING_PMFMS: 1,
  SETTING_PMFMS: 2,
  UPDATING_FORM_GROUP: 3,
  FORM_GROUP_READY: 4 // OK, the form is ready
});

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class MeasurementValuesForm<
  T extends IEntityWithMeasurement<T>,
  S extends MeasurementValuesState = MeasurementValuesState>
  extends AppForm<T>
  implements OnInit, OnDestroy {

  protected readonly _state: RxState<S> = new RxState<S>();
  protected _logPrefix: string;
  protected _onRefreshPmfms = new EventEmitter<any>();
  protected data: T;
  protected applyingValue = false;
  protected _measurementValuesForm: UntypedFormGroup;
  protected options: IMeasurementValuesFormOptions;
  protected cd: ChangeDetectorRef = null;

  readonly programLabel$ = this._state.select('programLabel');
  readonly strategyLabel$ = this._state.select('strategyLabel');
  readonly pmfms$ = this._state.select('pmfms');
  readonly ready$ = this._state.select('ready');

  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() i18nPmfmPrefix: string = null;
  @Input() i18nSuffix: string = null;

  @Input()
  set programLabel(value: string) {
    this._state.set('programLabel', (_) => value);
  }
  get programLabel(): string {
    return this._state.get('programLabel');
  }

  @Input()
  set acquisitionLevel(value: string) {
    this._state.set('acquisitionLevel', (_) => value);
  }
  get acquisitionLevel(): string {
    return this._state.get('acquisitionLevel');
  }

  @Input()
  set strategyLabel(value: string) {
    this._state.set('strategyLabel', (_) => value);
  }
  get strategyLabel(): string {
    return this._state.get('strategyLabel');
  }

  @Input() set requiredStrategy(value: boolean) {
    this._state.set('requiredStrategy', _ => value);
  }
  get requiredStrategy(): boolean {
    return this._state.get('requiredStrategy');
  }

  @Input()
  set gearId(value: number) {
    this._state.set('gearId', _ => value);
  }
  get gearId(): number {
    return this._state.get('gearId');
  }

  @Input() set requiredGear(value: boolean) {
    this._state.set('requiredGear', _ => value);
  };
  get requiredGear(): boolean {
    return this._state.get('requiredGear');
  }

  @Input()
  set value(value: T) {
    this.applyValue(value);
  }

  get value(): T {
    return this.getValue();
  }

  @Input() set pmfms(pmfms: IPmfm[]) {
    this.setPmfms(pmfms);
  }
  get pmfms(): IPmfm[] {
    return this._state.get('pmfms');
  }

  @Input()
  set forceOptional(value: boolean) {
    this._state.set('forceOptional', (_) => value);
  }
  get forceOptional(): boolean {
    return this._state.get('forceOptional');
  }

  @Input() forceOptionalExcludedPmfmIds: number[]; // Pmfm that should NOT be forced as optional

  @Output() valueChanges = new EventEmitter<any>();

  protected get readyStep(): number {
    return this._state.get('readyStep');
  }

  get starting(): boolean {
    return this.readyStep === PmfmFormReadySteps.STARTING;
  }

  get isNewData(): boolean {
    return isNil(this.data?.id);
  }

  get programControl(): AbstractControl {
    return this.form.get('program');
  }

  get measurementValuesForm(): UntypedFormGroup {
    return this._measurementValuesForm || (this.form.controls.measurementValues as UntypedFormGroup);
  }

  protected constructor(injector: Injector,
                        protected measurementsValidatorService: MeasurementsValidatorService,
                        protected formBuilder: UntypedFormBuilder,
                        protected programRefService: ProgramRefService,
                        form?: UntypedFormGroup,
                        options?: IMeasurementValuesFormOptions
  ) {
    super(injector, form);
    this.cd = injector.get(ChangeDetectorRef);
    this.options = {
      skipComputedPmfmControl: true,
      skipDisabledPmfmControl: true,
      ...options
    };

    // Load pmfms; when input property set (skip if component is starting = waiting markAsready())
    this._state.hold(merge(
        this._state.select(['programLabel', 'acquisitionLevel', 'forceOptional'], res => res),
        this._state.select(['requiredStrategy', 'strategyLabel'], res => res),
        this._state.select(['requiredGear', 'gearId'], res => res),
      )
        .pipe(
          // Only if markAsReady() called
          filter(_ => !this.starting)
        ),
        // /!\ DO NOT emit event if not loaded.
        // (e.g. Required to avoid CatchBatchForm to have 'loading=true', when gearId is set)
        (_) => this.loadPmfms({emitEvent: false})
    );

    // Update form, when pmfms set
    this._state.hold(this.pmfms$, (pmfms) => this.updateFormGroup(pmfms));

    this._state.connect('ready', this._state.select('readyStep')
      .pipe(
        map(step => step >= PmfmFormReadySteps.FORM_GROUP_READY)
      ));

    // Initial state
    this._state.set(<Partial<S>>{
      readyStep: PmfmFormReadySteps.STARTING,
      forceOptional: false,
      requiredStrategy: false,
      requiredGear: false,
    });

    // DEBUG
    this._logPrefix = '[measurements-values]';
    this._state.hold(this._state.select('acquisitionLevel'), acquisitionLevel => {
      this._logPrefix += `[measurements-values] (${acquisitionLevel})`;
    });
    //this.debug = !environment.production;

    if (!this.cd && !environment.production) {
      console.warn(this._logPrefix + 'No injected ChangeDetectorRef found! Please make sure your component has \'changeDetection: ChangeDetectionStrategy.OnPush\'')
    }
  }

  ngOnInit() {
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

  setValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean;}): Promise<void> | void {
    return this.applyValue(data, opts);
  }

  reset(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean;}) {
    return this.applyValue(data, opts);
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    // Start loading pmfms
    if (this.starting) {
      this.setReadyStep(PmfmFormReadySteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Wait form ready, before mark as ready
    this._state.hold(firstTrue(this.ready$),
      () => super.markAsReady(opts));
  }

  markAsLoaded(opts?: {
    emitEvent?: boolean;
  }) {
    // Wait form loaded, before mark as loaded
    this._state.hold(firstTrue(this.ready$, {stop: this.destroySubject}),
      () => super.markAsLoaded(opts));
  }

  trackPmfmFn(index: number, pmfm: IPmfm): any {
    // Add properties that can be changed
    return `${pmfm.id}-${pmfm.required}-${pmfm.hidden}`;
  }

  /* -- protected methods -- */

  /**
   * Wait form is ready, before setting the value to form
   * @param data
   * @param opts
   */
  protected async applyValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any}) {
    this.applyingValue = true;

    try {
      // Will avoid data to be set inside function updateFormGroup()
      this.data = data;

      if (this.debug) console.debug(`${this._logPrefix} Applying value...`, data);
      this.onApplyingEntity(data, opts);

      // Wait form is ready, before applying the data
      await this.ready({stop: this.destroySubject});

      // Data is still the same (not changed : applying)
      if (data === this.data) {
        // Applying value to form (that should be ready).
        await this.updateView(data, opts);
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
    // Propagate program
    if (data?.program?.label) {
      this.programLabel = data.program.label;
    }
  }

  protected async updateView(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; }) {
    // Warn is form is NOT ready
    if (this.debug && this.readyStep < PmfmFormReadySteps.FORM_GROUP_READY) {
      console.warn(`${this._logPrefix} Trying to set value, but form may be not ready!`);
    }

    // DEBUG
    if (this.debug) console.debug(`${this._logPrefix} updateView() with value:`, data);

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

    await super.setValue(data, opts);

    if (!opts || opts.emitEvent !== false) {
      this.form.markAsPristine();
      this.form.markAsUntouched();
      this.markForCheck();
    }

    // Restore form status
    this.updateViewState({onlySelf: true, ...opts});
  }

  protected getValue(): T {
    if (this.loading) return this.data; // Avoid to return not well loaded data

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
        json.measurementValues = Object.assign(this.data?.measurementValues || {},
          MeasurementValuesUtils.normalizeValuesToModel(json.measurementValues, filteredPmfms, {keepSourceObject: false}));
      }
    }

    // Restore program, if disabled
    const programControl = this.form.get('program');
    if (programControl?.disabled) {
      json.program = programControl.value;
    }

    if (this.data?.fromObject) {
      this.data.fromObject(json);
    }
    else {
      this.data = json;
    }

    return this.data;
  }

  protected setReadyStep(step: number) {
    // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
    step = toNumber(step, PmfmFormReadySteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.readyStep !== step) {
      // DEBUG
      if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);

      this._state.set('readyStep', (_) => step);
    }

    // Call markAsLoading, if the step is the first step
    if (this.loaded && step <= PmfmFormReadySteps.LOADING_PMFMS) {
      if (this.dirty) this.data = this.value;
      this.markAsLoading();
    }
  }

  /**
   * Check if can load (must have: program, acquisition - and gear if required)
   */
  protected canLoadPmfms(): boolean{
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

  protected async loadPmfms(opts?: {emitEvent: boolean}) {
    if (!this.canLoadPmfms()) return;

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} loadPmfms()`);

    if (!opts || opts.emitEvent !== false) {
      this.setReadyStep(PmfmFormReadySteps.LOADING_PMFMS);
    }

    let pmfms;
    try {
      // Load pmfms
      // DO NOT call loadProgramPmfms(). Next setPmfms() will call a firstNotNilPromise() with options.stop
      pmfms = this.programRefService.watchProgramPmfms(
        this.programLabel,
        {
          strategyLabel: this.strategyLabel,
          acquisitionLevel: this.acquisitionLevel,
          gearId: this.gearId
        });
    } catch (err) {
      console.error(`${this._logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
      pmfms = undefined;
    }

    // Apply pmfms
    await this.setPmfms(pmfms, opts);
  }

  async setPmfms(pmfms: IPmfm[] | Observable<IPmfm[]>, opts?: {emitEvent?: boolean}): Promise<IPmfm[]> {
    // If undefined: reset pmfms
    if (!pmfms) {
      this.resetPmfms();
      return undefined; // break
    }

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} setPmfms()`);

    // Mark as settings pmfms
    if (!opts || opts.emitEvent !== false) {
      this.setReadyStep(PmfmFormReadySteps.SETTING_PMFMS);
    }

    try {

      // Wait loaded, if observable
      if (isObservable<IPmfm[]>(pmfms)) {
        if (this.debug) console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNilPromise(pmfms, {stop: this.destroySubject});
        if (this.debug) console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable [OK]`);
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
        const res = this.options.mapPmfms(pmfms);
        pmfms = (res instanceof Promise) ? await res : res;
      }

      // Apply (if changed)
      if (!equals(pmfms, this.pmfms)) {
        // DEBUG log
        if (this.debug) console.debug(`${this._logPrefix} Pmfms changed: `, pmfms);

        // next step
        this.setReadyStep(PmfmFormReadySteps.UPDATING_FORM_GROUP);

        // Apply pmfms to state
        this._state.set('pmfms', (_) => <IPmfm[]>pmfms);
      }

      return pmfms;
    }
    catch(err) {
      if (err?.message !== 'stop') {
        console.error(`${this._logPrefix} Error while applying pmfms: ${err && err.message || err}`, err);
      }
      this.resetPmfms();
      return undefined;
    }
  }

  resetPmfms() {
    if (isNil(this.pmfms)) return; // Already reset

    if (this.debug) console.warn(`${this._logPrefix} Reset pmfms`);

    // Reset step
    if (!this.starting && this.loaded) this.setReadyStep(PmfmFormReadySteps.STARTING);

    // Update state
    this._state.set('pmfms', (_) => undefined);
  }

  private async updateFormGroup(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.pmfms;
    if (!pmfms) return; // Skip

    const form = this.form;
    this._measurementValuesForm = form.get('measurementValues') as UntypedFormGroup;

    // Disable the form (if exists)
    if (this._measurementValuesForm?.enabled) {
      this._measurementValuesForm.disable({onlySelf: true, emitEvent: false});
    }

    // Mark as loading
    this.setReadyStep(PmfmFormReadySteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset measurement form (if exists)
      if (this._measurementValuesForm) {
        this.measurementsValidatorService.updateFormGroup(this._measurementValuesForm, {pmfms: []});
        this._measurementValuesForm.reset({}, {onlySelf: true, emitEvent: false});
      }
    } else {

      // Create measurementValues form group
      if (!this._measurementValuesForm) {
        this._measurementValuesForm = this.measurementsValidatorService.getFormGroup(null, {pmfms});

        form.addControl('measurementValues', this._measurementValuesForm);
        this._measurementValuesForm.disable({onlySelf: true, emitEvent: false});
      }

      // Or update if already exist
      else {
        this.measurementsValidatorService.updateFormGroup(this._measurementValuesForm, {pmfms});
      }
    }

    // Call options function
    if (this.options?.onUpdateFormGroup) {
      await this.options.onUpdateFormGroup(form);
    }

    if (this.debug) console.debug(`${this._logPrefix} Form controls updated`);
    this.setReadyStep(PmfmFormReadySteps.FORM_GROUP_READY);

    // Data already set: apply value again to fill the form
    if (!this.applyingValue) {
      // Update data in view
      if (this.data) {
        await this.updateView(this.data, {emitEvent: false});
        this.markAsLoaded();
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
    const pmfms = this.pmfms || [];
    MeasurementValuesUtils.normalizeEntityToForm(data, pmfms, this.form);
  }

  private async waitIdleThenRefreshPmfms(event?: any) {
    try {
      // Wait previous loading is finished
      await this.waitIdle({stop: this.destroySubject, stopError: false});
      // Then refresh pmfms
      await this.loadPmfms();
    }
    catch(err) {
      console.error(err);
    }
  }

  protected markForCheck() {
    this.cd?.markForCheck();
  }
}
