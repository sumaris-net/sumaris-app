import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Optional, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { isObservable, merge, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { AppForm, AppFormUtils, createPromiseEventEmitter, emitPromiseEvent, equals, firstNotNilPromise, firstTrue, isNil, PromiseEvent, toNumber } from '@sumaris-net/ngx-components';
import { Measurement, MeasurementType, MeasurementUtils, MeasurementValuesUtils } from '../services/model/measurement.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmFormReadySteps } from '@app/trip/measurement/measurement-values.form.class';
import { RxState } from '@rx-angular/state';

export declare type MapPmfmEvent = PromiseEvent<IPmfm[], {pmfms: IPmfm[]}>;
export declare type UpdateFormGroupEvent = PromiseEvent<void, {form: UntypedFormGroup}>;

interface MeasurementsFormState {
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

@Component({
  selector: 'app-form-measurements',
  templateUrl: './measurements.form.component.html',
  styleUrls: ['./measurements.form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeasurementsForm<S extends MeasurementsFormState = MeasurementsFormState> extends AppForm<Measurement[]> implements OnInit, OnDestroy {

  protected readonly _state: RxState<S> = new RxState<S>();
  protected _logPrefix: string;
  protected _onRefreshPmfms = new EventEmitter<any>();
  protected data: Measurement[];
  protected applyingValue = false;
  protected keepRankOrder = false;
  protected skipDisabledPmfmControl = true;
  protected skipComputedPmfmControl = true;
  protected cd: ChangeDetectorRef = null;

  readonly pmfms$ = this._state.select('pmfms');
  readonly ready$ = this._state.select('ready');

  @Input() showError = false;
  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() entityName: MeasurementType;
  @Input() animated = false;
  @Input() mobile = false;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() showButtonIcons: boolean;
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
  set value(value: Measurement[]) {
    this.applyValue(value);
  }
  get value(): Measurement[] {
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

  protected get readyStep(): number {
    return this._state.get('readyStep');
  }

  @Output('mapPmfms') onMapPmfms: EventEmitter<MapPmfmEvent> = createPromiseEventEmitter<IPmfm[], {pmfms: IPmfm[]}>();
  @Output('updateFormGroup') onUpdateFormGroup: EventEmitter<UpdateFormGroupEvent> = createPromiseEventEmitter<void, {form: UntypedFormGroup}>();

  get starting(): boolean {
    return this.readyStep === PmfmFormReadySteps.STARTING;
  }

  get formError(): string {
    return this.getFormError(this.form);
  }

  constructor(injector: Injector,
              protected measurementValidatorService: MeasurementsValidatorService,
              protected formBuilder: UntypedFormBuilder,
              protected programRefService: ProgramRefService,
              @Optional() private __state?: RxState<S>
  ) {
    super(injector, measurementValidatorService.getFormGroup([]));
    this.cd = injector.get(ChangeDetectorRef);

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
        // (e.g. Required to avoid CatchBatchForm to revert to 'loading=true', when gearId is set)
        (_) => this.loadPmfms({emitEvent: this.loaded})
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
    this._logPrefix = '[measurements-form]';
    this._state.hold(this._state.select('acquisitionLevel'), acquisitionLevel => {
      this._logPrefix += `[measurements-form] (${acquisitionLevel})`;
    });
    //this.debug = !environment.production;
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

  setValue(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    return this.applyValue(data, opts);
  }

  reset(data?: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    return this.applyValue(data, opts);
  }

  markAsReady(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {

    // Start loading pmfms
    if (this.starting) {
      this.setReadyStep(PmfmFormReadySteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Wait form ready, before mark as ready
    this._state.hold(firstTrue(this.ready$, {stop: this.destroySubject}),
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

  protected getFormError(form: UntypedFormGroup): string {
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
        }).join(',');

        return fieldName + ': ' + errorMsg;
      }).join(',');
  }

  /**
   * Wait form is ready, before setting the value to form
   * @param data
   * @param opts
   */
  protected async applyValue(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
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

  protected onApplyingEntity(data: Measurement[], opts?: {[key: string]: any;}) {
    // Can be override by subclasses
  }

  protected async updateView(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    // Warn is form is NOT ready
    if (this.debug && this.readyStep < PmfmFormReadySteps.FORM_GROUP_READY) {
      console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
    }

    const pmfms = this.pmfms;
    this.data = MeasurementUtils.initAllMeasurements(data, pmfms, this.entityName, this.keepRankOrder);
    const json = MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(this.data), pmfms);

    this.form.patchValue(json, opts);

    // Restore form status
    this.updateViewState({onlySelf: true, ...opts});
  }

  protected getValue(): Measurement[] {
    if (this.loading) return this.data; // Avoid to return not well loaded data

    // Find dirty pmfms, to avoid full update
    const form = this.form;
    const filteredPmfms = (this.pmfms || []).filter(pmfm => {
      const control = form.controls[pmfm.id];
      return control && (control.dirty
        || (this.skipDisabledPmfmControl === false && control.disabled)
        || (this.skipComputedPmfmControl === false && pmfm.isComputed)
      );
    });

    if (filteredPmfms.length) {
      // Update measurements value
      const json = form.value;
      MeasurementUtils.setValuesByFormValues(this.data, json, filteredPmfms);
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

    // Remember previous state (to be able to restore state if nothing changed)
    const previousLoadingStep = this.readyStep;

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
      if (this.onMapPmfms.observers.length) {
        const res = await emitPromiseEvent(this.onMapPmfms, 'pmfms', {detail: {pmfms}});
        pmfms = Array.isArray(res) ? res : pmfms;
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
      else {
        // Nothing changes: restoring previous steps (if need)
        if ((!opts || opts.emitEvent !== false) && previousLoadingStep > this.readyStep) {
          this.setReadyStep(previousLoadingStep);
        }
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
    if (form.enabled) {
      form.disable();
    }

    // Mark as loading
    this.setReadyStep(PmfmFormReadySteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset form
      this.measurementValidatorService.updateFormGroup(this.form, {pmfms: []});
      this.form.reset({}, {onlySelf: true, emitEvent: false});

    } else {
      // Update the existing form
      this.measurementValidatorService.updateFormGroup(this.form, {pmfms});
    }

    // Call options function
    if (this.onUpdateFormGroup.observers.length) {
      await emitPromiseEvent(this.onUpdateFormGroup, 'onUpdateFormGroup', {detail: {form}});
    }

    if (this.debug) console.debug(`${this._logPrefix} Form controls updated`);
    this.setReadyStep(PmfmFormReadySteps.FORM_GROUP_READY);

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
        this.updateViewState({onlySelf: true, emitEvent: false});
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
    this.cd.markForCheck();
  }
}
