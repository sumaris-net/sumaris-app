import { ChangeDetectorRef, Directive, EventEmitter, inject, Injector, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { combineLatestWith, merge, mergeMap, Observable } from 'rxjs';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from './measurement.validator';
import { distinctUntilChanged, filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { IEntityWithMeasurement, MeasurementValuesUtils } from './measurement.model';
import { AppForm, changeCaseToUnderscore, firstTrue, isNil, isNotNil, toNumber } from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { RxState } from '@rx-angular/state';
import { environment } from '@environments/environment';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { MeasurementsFormReadySteps, MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { AcquisitionLevelType } from '@app/referential/services/model/model.enum';

export interface IMeasurementsFormOptions {
  mapPmfms?: (pmfms: IPmfm[]) => IPmfm[] | Promise<IPmfm[]>;
  onUpdateFormGroup?: (formGroup: UntypedFormGroup) => void | Promise<void>;
  skipDisabledPmfmControl?: boolean; // True by default
  skipComputedPmfmControl?: boolean; // True by default
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class MeasurementValuesForm<
  T extends IEntityWithMeasurement<T>,
  S extends MeasurementsFormState = MeasurementsFormState>
  extends AppForm<T>
  implements OnInit, OnDestroy {

  @RxStateRegister() protected readonly _state: RxState<S> = inject(RxState, {self: true});
  protected readonly _pmfmNamePipe = inject(PmfmNamePipe);
  protected _logPrefix: string;
  protected _onRefreshPmfms = new EventEmitter<any>();
  protected data: T;
  protected applyingValue = false;
  protected _measurementValuesForm: UntypedFormGroup;
  protected options: IMeasurementsFormOptions;
  protected cd: ChangeDetectorRef = null;

  @RxStateSelect() acquisitionLevel$: Observable<AcquisitionLevelType>;
  @RxStateSelect() programLabel$: Observable<string>;
  @RxStateSelect() strategyId$: Observable<number>
  @RxStateSelect() strategyLabel$: Observable<string>;
  @RxStateSelect() initialPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() filteredPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() ready$: Observable<boolean>;

  @RxStateProperty() protected readyStep: number;
  @RxStateProperty() protected initialPmfms: IPmfm[];
  @RxStateProperty() protected filteredPmfms: IPmfm[];

  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() i18nPmfmPrefix: string = null;
  @Input() i18nSuffix: string = null;
  @Input() forceOptionalExcludedPmfmIds: number[]; // Pmfm that should NOT be forced as optional
  @Input() @RxStateProperty() programLabel: string;
  @Input() @RxStateProperty() acquisitionLevel: string;
  @Input() @RxStateProperty() strategyLabel: string;
  @Input() @RxStateProperty() strategyId: number;
  @Input() @RxStateProperty() requiredStrategy: boolean;
  @Input() @RxStateProperty() gearId: number;
  @Input() @RxStateProperty() requiredGear: boolean;
  @Input() @RxStateProperty() forceOptional: boolean;

  @Input() set pmfms(pmfms: IPmfm[]) {
    this.initialPmfms = pmfms;
  }
  get pmfms(): IPmfm[] {
    return this.filteredPmfms;
  }

  get pmfms$(): Observable<IPmfm[]> {
    return this.filteredPmfms$;
  }

  @Input()
  set value(value: T) {
    this.applyValue(value);
  }
  get value(): T {
    return this.getValue();
  }

  get starting(): boolean {
    return this.readyStep === MeasurementsFormReadySteps.STARTING;
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

  @Output() valueChanges = new EventEmitter<any>();

  protected constructor(injector: Injector,
                        protected measurementsValidatorService: MeasurementsValidatorService,
                        protected formBuilder: UntypedFormBuilder,
                        protected programRefService: ProgramRefService,
                        @Optional() form?: UntypedFormGroup,
                        @Optional() options?: IMeasurementsFormOptions
  ) {
    super(injector, form);
    this.cd = injector.get(ChangeDetectorRef);
    this.options = {
      skipComputedPmfmControl: true,
      skipDisabledPmfmControl: true,
      ...options
    };

    const readySteps$ = this._state.select('readyStep');
    this._state.connect('ready', readySteps$
      .pipe(
        distinctUntilChanged(),
        map((step) => step >= MeasurementsFormReadySteps.FORM_GROUP_READY)
      )
    );

    // Load pmfms; when input property set (skip if component is starting = waiting markAsReady())
    this._state.connect('initialPmfms',
      readySteps$.pipe(
        filter((step) => step === MeasurementsFormReadySteps.LOADING_PMFMS),
        combineLatestWith(
          merge(
            this._state.select(['programLabel', 'acquisitionLevel', 'forceOptional'], res => res),
            this._state.select(['requiredStrategy', 'strategyLabel'], res => res),
            this._state.select(['requiredStrategy', 'strategyId'], res => res),
            this._state.select(['requiredGear', 'gearId'], res => res),
          )
        ),
        filter(() => !this.starting && this.canLoadPmfms()),
        tap(() => this.setReadyStep(MeasurementsFormReadySteps.SETTING_PMFMS)),
        switchMap(() => this.watchProgramPmfms())
      )
    );

    // Update form, when pmfms set
    this._state.connect('filteredPmfms', this.initialPmfms$.pipe(
        mergeMap((pmfms) => this.filterPmfms(pmfms)),
        filter(isNotNil),
        filter((pmfms) => {
          if (PmfmUtils.arrayEquals(pmfms, this.pmfms)) {
            this.setReadyStep(MeasurementsFormReadySteps.FORM_GROUP_READY);
            return false;
          }
          this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
          // DEBUG
          //if (this.debug) console.debug(`${this._logPrefix}Filtered pmfms changed`);
          return true;
        })
        )
    );

    this._state.hold(this.filteredPmfms$, (pmfms) => this._updateFormGroup(pmfms));

    // Initial state
    this._state.set(<Partial<S>>{
      readyStep: MeasurementsFormReadySteps.STARTING,
      forceOptional: false,
      requiredStrategy: false,
      requiredGear: false,
    });


    // DEBUG
    this._logPrefix = '[measurement-values] ';
    this._state.hold(this._state.select('acquisitionLevel'), acquisitionLevel => {
      this._logPrefix = `[measurement-values] (${acquisitionLevel}) `;
    });
    //this.debug = !environment.production;

    // Warn if no change detection
    if (!this.cd && !environment.production) {
      console.warn(this._logPrefix + 'No injected ChangeDetectorRef found! Please make sure your component has \'changeDetection: ChangeDetectionStrategy.OnPush\'');
    }
  }

  ngOnInit() {
    super.ngOnInit();

    // Listen form changes
    this.registerSubscription(
      this.form.valueChanges
        .pipe(
          filter(() => !this.loading && !this.applyingValue && this.valueChanges.observed)
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

  setValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean}): Promise<void> | void {
    return this.applyValue(data, opts);
  }

  reset(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any; waitIdle?: boolean}) {
    // Applying value to form (that should be ready).
    return this.applyValue(data, opts);
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    // Start loading pmfms
    if (this.starting) {
      this.setReadyStep(MeasurementsFormReadySteps.LOADING_PMFMS);
    }

    // Wait form ready, before mark as ready
    this.doWhenReady(() => super.markAsReady(opts));
  }

  markAsLoaded(opts?: {
    emitEvent?: boolean;
  }) {
    // Wait form ready, before mark as loaded
    this.doWhenReady(() => super.markAsLoaded(opts));
  }

  trackPmfmFn(index: number, pmfm: IPmfm): any {
    // Add properties that can be changed
    return `${pmfm.id}-${pmfm.required}-${pmfm.hidden}`;
  }

  isVisiblePmfm(pmfm: IPmfm): boolean {
    return !pmfm.hidden;
  }

  resetPmfms() {
    if (isNil(this.pmfms)) return; // Already reset

    if (this.debug) console.warn(`${this._logPrefix} Reset pmfms`);

    // Reset step
    if (!this.starting && this.loaded) this.setReadyStep(MeasurementsFormReadySteps.STARTING);

    // Update state
    this._state.set('filteredPmfms', () => undefined);
    this._state.set('initialPmfms', () => undefined);
  }

  translateControlPath(path: string, pmfms?: IPmfm[]): string {
    if (path.includes('measurementValues.')) {
      const parts = path.split('.');
      const controlName = parts[parts.length-1];
      if (PMFM_ID_REGEXP.test(controlName)) {
        const pmfmId = parseInt(controlName);
        const pmfm = (pmfms || this.initialPmfms)?.find(p => p.id === pmfmId);
        if (pmfm) {
          return this._pmfmNamePipe.transform(pmfm, {i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nSuffix});
        }
      }
    }
    const fieldName = path.substring(path.lastIndexOf('.') + 1);
    const i18nKey = (this.i18nFieldPrefix || '') + changeCaseToUnderscore(fieldName).toUpperCase();
    return this.translate?.instant(i18nKey);
  }

  /* -- protected methods -- */

  protected doWhenReady(runnable: () => void) {
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
  protected async applyValue(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any}) {
    this.applyingValue = true;

    try {
      // Will avoid data to be set inside function updateFormGroup()
      this.data = data;

      if (this.debug) console.debug(`${this._logPrefix}Applying value...`, data);
      this.onApplyingEntity(data, opts);

      // Wait form is ready, before applying the data
      await this.ready({stop: this.destroySubject});

      // Data is still the same (not changed : applying)
      if (data && data === this.data) {
        // Applying value to form (that should be ready).
        await this.updateView(data, opts);
        this.markAsLoaded();
      }
    }
    catch(err) {
      if (err?.message !== 'stop') {
        console.error(`${this._logPrefix}Error while applying value: ${err && err.message || err}`, err);
        this.setError(err && err.message || err);
      }
      this.markAsLoaded();
    }
    finally {
      this.applyingValue = false;
    }
  }

  protected onApplyingEntity(data: T, opts?: {[key: string]: any}) {
    // Propagate program
    if (data?.program?.label) {
      this.programLabel = data.program.label;
    }
  }

  protected async updateView(data: T, opts?: { emitEvent?: boolean; onlySelf?: boolean; normalizeEntityToForm?: boolean; [key: string]: any }) {
    // Warn is form is NOT ready
    if (this.debug && this.readyStep < MeasurementsFormReadySteps.FORM_GROUP_READY) {
      console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
    }

    // DEBUG
    if (this.debug) console.debug(`${this._logPrefix} updateView() with value:`, data);

    // Adapt measurement values to form (if not skip)
    if (!opts || opts.normalizeEntityToForm !== false) {
      this.normalizeEntityToForm(data);
    }

    // If a program has been filled, always keep it
    const program = this.programControl?.value;
    if (data && program?.label) {
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

      // Update measurement values
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

    // Update data
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
    step = toNumber(step, MeasurementsFormReadySteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.readyStep !== step) {
      // DEBUG
      //if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);

      this.readyStep = step;
    }

    // Call markAsLoading, if the step is the first step
    if (this.loaded && step <= MeasurementsFormReadySteps.LOADING_PMFMS) {
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
      || (this.requiredStrategy && isNil(this.strategyLabel) && isNil(this.strategyId))
      || (this.requiredGear && isNil(this.gearId))) {

      // DEBUG
      //if (this.debug) console.debug(`${this._logPrefix} cannot load pmfms (missing some inputs)`);

      return false;
    }
    return true;
  }

  protected watchProgramPmfms(): Observable<IPmfm[]> {

    // DEBUG
    //if (this.debug) console.debug(`${this._logPrefix} watchProgramPmfms()`);

    let pmfms$ = this.programRefService.watchProgramPmfms(
      this.programLabel,
      {
        acquisitionLevel: this.acquisitionLevel,
        strategyId: this.strategyId,
        strategyLabel: this.strategyLabel,
        gearId: this.gearId
      })
      .pipe(
        takeUntil(this.destroySubject)
      );

    // DEBUG log
    if (this.debug) {
      pmfms$ = pmfms$.pipe(
        tap(pmfms => {
          if (!pmfms.length) {
            console.debug(`${this._logPrefix}No pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${this.acquisitionLevel}', strategy: '${this.strategyId || this.strategyLabel}'}. Please fill program's strategies !`);
          } else {
            // DEBUG
            //console.debug(`${this._logPrefix}${pmfms.length} pmfms found for {program: '${this.programLabel}', acquisitionLevel: '${this.acquisitionLevel}', strategy: '${this.strategyId || this.strategyLabel}'}`);
          }
        })
      );
    }

    return pmfms$;
  }

  protected async filterPmfms(pmfms: IPmfm[]): Promise<IPmfm[]> {
    // If undefined: reset pmfms
    if (!pmfms) {
      this.resetPmfms();
      return undefined; // break
    }

    // DEBUG
    //if (this.debug) console.debug(`${this._logPrefix} filterPmfms()`);

    try {

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
        const res = await this.options.mapPmfms(pmfms);
        pmfms = Array.isArray(res) ? res : pmfms;
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


  private async _updateFormGroup(pmfms?: IPmfm[], opts?: {emitEvent?: boolean}) {
    pmfms = pmfms || this.pmfms;
    if (!pmfms) return; // Skip

    const form = this.form;
    this._measurementValuesForm = form.get('measurementValues') as UntypedFormGroup;

    // Disable the form (if exists)
    if (this._measurementValuesForm?.enabled) {
      this._measurementValuesForm.disable({onlySelf: true, emitEvent: false});
    }

    // Mark as loading
    this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset measurement form (if exists)
      if (this._measurementValuesForm) {
        this.measurementsValidatorService.updateFormGroup(this._measurementValuesForm, {pmfms: [], emitEvent: opts?.emitEvent});
        this._measurementValuesForm.reset({}, {onlySelf: true, emitEvent: false});
      }
    } else {

      // Create measurementValues form group
      if (!this._measurementValuesForm) {
        this._measurementValuesForm = this.measurementsValidatorService.getFormGroup(null, {pmfms});

        form.addControl('measurementValues', this._measurementValuesForm, {emitEvent: opts?.emitEvent});
        this._measurementValuesForm.disable({onlySelf: true, emitEvent: opts?.emitEvent});
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
    this.setReadyStep(MeasurementsFormReadySteps.FORM_GROUP_READY);

    // Data already set: apply value again to fill the form
    if (!this.applyingValue) {
      // Update data in view
      if (this.data) {
        await this.updateView(this.data, {onlySelf: true, emitEvent: false});
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

  protected updateViewState(opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
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

  protected markForCheck() {
    this.cd?.markForCheck();
  }
}
