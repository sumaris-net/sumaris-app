import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { BehaviorSubject, isObservable, Observable } from 'rxjs';
import { filter, first } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { AppForm, AppFormUtils, createPromiseEventEmitter, emitPromiseEvent, filterNotNil, firstNotNilPromise, isNil, isNotNil, PromiseEvent, toNumber } from '@sumaris-net/ngx-components';
import { Measurement, MeasurementType, MeasurementUtils, MeasurementValuesUtils } from '../services/model/measurement.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { PmfmFormReadySteps } from '@app/trip/measurement/measurement-values.form.class';

export declare type MapPmfmEvent = PromiseEvent<IPmfm[], {pmfms: IPmfm[]}>;
export declare type UpdateFormGroupEvent = PromiseEvent<void, {form: UntypedFormGroup}>;

@Component({
  selector: 'app-form-measurements',
  templateUrl: './measurements.form.component.html',
  styleUrls: ['./measurements.form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeasurementsForm extends AppForm<Measurement[]> implements OnInit, OnDestroy {

  $programLabel = new BehaviorSubject<string>(undefined);
  $strategyLabel = new BehaviorSubject<string>(undefined);
  $pmfms = new BehaviorSubject<IPmfm[]>(undefined);

  protected $readyStepSubject = new BehaviorSubject<number>(PmfmFormReadySteps.STARTING);
  protected _logPrefix: string;
  protected _gearId: number = null;
  protected _acquisitionLevel: string;
  protected _forceOptional = false;
  protected _onRefreshPmfms = new EventEmitter<any>();
  protected data: Measurement[];
  protected applyingValue = false;
  protected keepRankOrder = false;
  protected skipDisabledPmfmControl = true;
  protected skipComputedPmfmControl = true;
  protected cd: ChangeDetectorRef = null;

  @Input() showError = false;
  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() requiredStrategy = false;
  @Input() requiredGear = false;
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
  set value(value: Measurement[]) {
    this.applyValue(value);
  }

  get value(): Measurement[] {
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
      if (!this.starting) this.waitIdleThenRefreshPmfms('set forceOptional');
    }
  }

  get forceOptional(): boolean {
    return this._forceOptional;
  }

  @Input() forceOptionalExcludedPmfmIds: number[]; // Pmfm that should NOT be forced as optional

  @Output() valueChanges = new EventEmitter<any>();
  @Output('mapPmfms') mapPmfms: EventEmitter<MapPmfmEvent> = createPromiseEventEmitter<IPmfm[], {pmfms: IPmfm[]}>();
  @Output('updateFormGroup') onUpdateFormGroup: EventEmitter<UpdateFormGroupEvent> = createPromiseEventEmitter<void, {form: UntypedFormGroup}>();

  get starting(): boolean {
    return this.$readyStepSubject.value === PmfmFormReadySteps.STARTING;
  }

  get formError(): string {
    return this.getFormError(this.form);
  }

  constructor(injector: Injector,
              protected measurementValidatorService: MeasurementsValidatorService,
              protected formBuilder: UntypedFormBuilder,
              protected programRefService: ProgramRefService
  ) {
    super(injector, measurementValidatorService.getFormGroup([]));
    this.cd = injector.get(ChangeDetectorRef);

    this.registerSubscription(
      this._onRefreshPmfms.subscribe(() => this.loadPmfms())
    );
    // Auto update form, when pmfms are loaded
    this.registerSubscription(filterNotNil(this.$pmfms)
        .subscribe(pmfms => this.updateFormGroup(pmfms))
    );

    // DEBUG
    //this.debug = !environment.production;
  }

  ngOnInit() {
    this._logPrefix = this._logPrefix || `[measurements-form-${this._acquisitionLevel?.toLowerCase().replace(/[_]/g, '-') || '?'}]`;

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
    this.$readyStepSubject.unsubscribe();
    this.$pmfms.unsubscribe();
    this.$programLabel.unsubscribe();
    this.$strategyLabel.unsubscribe();
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
      this.setInitStep(PmfmFormReadySteps.LOADING_PMFMS);
      this.loadPmfms();
    }

    // Wait form ready, before mark as ready
    if (this.$readyStepSubject.value < PmfmFormReadySteps.FORM_GROUP_READY) {
      this.registerSubscription(
        this.$readyStepSubject.pipe(
          filter(step => step >= PmfmFormReadySteps.FORM_GROUP_READY),
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
    if (this.$readyStepSubject.value < PmfmFormReadySteps.FORM_GROUP_READY) {
      this.registerSubscription(
        this.$readyStepSubject.pipe(
          filter(step => step >= PmfmFormReadySteps.FORM_GROUP_READY),
          first()
        )
        .subscribe(() => super.markAsLoaded())
      )
    }
    else {
      super.markAsLoaded();
    }
  }

  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return pmfm.id;
  }

  /* -- protected methods -- */

  protected getFormError(form: UntypedFormGroup): string {
    const errors = AppFormUtils.getFormErrors(form);
    return Object.getOwnPropertyNames(errors)
      .map(field => {
        let fieldName;
        const pmfmId = parseInt(field);
        const pmfm = (this.$pmfms.value || []).find(p => p.id === pmfmId);
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
      await this.ready();

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
    if (this.readySubject.value !== true) {
      console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
    }

    this.data = MeasurementUtils.initAllMeasurements(data, this.$pmfms.value, this.entityName, this.keepRankOrder);

    const json = MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(this.data), this.$pmfms.value);

    this.form.patchValue(json, opts);

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
      if (this._logPrefix?.indexOf('?') !== -1) this._logPrefix = `[meas-${this._acquisitionLevel.toLowerCase().replace(/[_]/g, '-')}]`;

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

  protected getValue(): Measurement[] {
    if (this.loading) return this.data; // Avoid to return not well loaded data

    // Find dirty pmfms, to avoid full update
    const form = this.form;
    const filteredPmfms = (this.$pmfms.value || []).filter(pmfm => {
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

  protected setInitStep(step: number) {
    // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
    step = toNumber(step, PmfmFormReadySteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.$readyStepSubject.value !== step) {

      // DEBUG
      if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);

      this.$readyStepSubject.next(step);
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
      || isNil(this._acquisitionLevel)
      || (this.requiredStrategy && isNil(this.strategyLabel))
      || (this.requiredGear && isNil(this._gearId))) {

      // DEBUG
      //if (this.debug) console.debug(`${this._logPrefix} cannot load pmfms (missing some inputs)`);

      return false;
    }
    return true;
  }

  protected async loadPmfms() {
    if (!this.canLoadPmfms()) return;

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} loadPmfms()`);

    this.setInitStep(PmfmFormReadySteps.LOADING_PMFMS);

    let pmfms;
    try {
      // Load pmfms
      // DO NOT call loadProgramPmfms(). Next setPmfms() will call a firstNotNilPromise() with options.stop
      pmfms = this.programRefService.watchProgramPmfms(
        this.programLabel,
        {
          strategyLabel: this.strategyLabel,
          acquisitionLevel: this._acquisitionLevel,
          gearId: this._gearId
        });
    } catch (err) {
      console.error(`${this._logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
      pmfms = undefined;
    }

    // Apply pmfms
    await this.setPmfms(pmfms);
  }

  protected async setPmfms(pmfms: IPmfm[] | Observable<IPmfm[]>): Promise<IPmfm[]> {
    // If undefined: reset pmfms
    if (!pmfms) {
      this.resetPmfms();
      return undefined; // break
    }

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} setPmfms()`);

    // Mark as settings pmfms
    const previousLoadingStep = this.$readyStepSubject.value;
    this.setInitStep(PmfmFormReadySteps.SETTING_PMFMS);

    try {

      // Wait loaded, if observable
      if (isObservable<IPmfm[]>(pmfms)) {
        if (this.debug) console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNilPromise(pmfms, {stop: this.destroySubject});
        if (this.debug) console.debug(`${this._logPrefix} setPmfms(): waiting pmfms observable [OK]`);
      }

      // If force to optional, create a copy of each pmfms that should be forced
      if (this._forceOptional) {
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
      if (this.mapPmfms.observers.length) {
        const res = await emitPromiseEvent(this.mapPmfms, 'pmfms', {detail: {pmfms}});
        pmfms = Array.isArray(res) ? res : pmfms;
      }

      // Apply (if changed)
      if (pmfms !== this.$pmfms.value) {
        // DEBUG log
        if (this.debug) console.debug(`${this._logPrefix} Pmfms changed {acquisitionLevel: '${this._acquisitionLevel}'}`, pmfms);

        // next step
        this.setInitStep(PmfmFormReadySteps.UPDATING_FORM_GROUP);
        this.$pmfms.next(pmfms);
      }
      else {
        // Nothing changes: restoring previous steps
        this.setInitStep(previousLoadingStep);
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
    if (isNil(this.$pmfms.value)) return; // Already reset

    if (this.debug) console.warn(`${this._logPrefix} Reset pmfms`);

    if (!this.starting && this.loaded) this.setInitStep(PmfmFormReadySteps.STARTING);
    this.$pmfms.next(undefined);
  }

  private async updateFormGroup(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.$pmfms.value;
    if (!pmfms) return; // Skip

    const form = this.form;
    if (form.enabled) form.disable();

    // Mark as loading
    this.setInitStep(PmfmFormReadySteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this._forceOptional}}, using pmfms:`, pmfms);

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
    this.setInitStep(PmfmFormReadySteps.FORM_GROUP_READY);

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
