import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { BehaviorSubject, isObservable, Observable } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from '../services/validator/measurement.validator';
import { AppForm, AppFormUtils, firstNotNilPromise, isNil, isNotNil, toNumber, WaitForOptions, waitForTrue } from '@sumaris-net/ngx-components';
import { Measurement, MeasurementType, MeasurementUtils, MeasurementValuesUtils } from '../services/model/measurement.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormLoadingSteps } from '@app/trip/measurement/measurement-values.form.class';

@Component({
  selector: 'app-form-measurements',
  templateUrl: './measurements.form.component.html',
  styleUrls: ['./measurements.form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeasurementsForm extends AppForm<Measurement[]> implements OnInit, OnDestroy {

  $loadingStep = new BehaviorSubject<number>(MeasurementFormLoadingSteps.STARTING);

  $programLabel = new BehaviorSubject<string>(undefined);
  $strategyLabel = new BehaviorSubject<string>(undefined);
  $pmfms = new BehaviorSubject<IPmfm[]>(undefined);

  protected _gearId: number;
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
  @Input() maxVisibleButtons: number = 3;
  @Input() showButtonIcons: boolean;
  @Input() i18nPmfmPrefix: string = null;
  @Input() i18nSuffix: string = null;

  @Output() valueChanges = new EventEmitter<any>();

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

  @Input()
  set forceOptional(value: boolean) {
    if (this._forceOptional !== value) {
      this._forceOptional = value;
      this.refreshPmfmsIfLoaded('set forceOptional');
    }
  }

  get forceOptional(): boolean {
    return this._forceOptional;
  }

  get formError(): string {
    return this.getFormError(this.form);
  }

  get loading(): boolean {
    return this.$loadingStep.value < MeasurementFormLoadingSteps.FORM_GROUP_READY;
  }

  get starting(): boolean {
    return this.$loadingStep.value === MeasurementFormLoadingSteps.STARTING;
  }

  constructor(injector: Injector,
              protected measurementValidatorService: MeasurementsValidatorService,
              protected formBuilder: FormBuilder,
              protected programRefService: ProgramRefService
  ) {
    super(injector, measurementValidatorService.getFormGroup([]));
    this._$loading.next(false); // Important, must be false
    this.cd = injector.get(ChangeDetectorRef);

    this.registerSubscription(
      this._onRefreshPmfms.subscribe(() => this.loadPmfms())
    );
    // Auto update the view, when pmfms are filled
    this.registerSubscription(
      this.$pmfms
        .pipe(filter(isNotNil))
        .subscribe(pmfms => this.updateFormGroup(pmfms))
    );
    // TODO: DEV only
    //this.debug = true;
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

    // Try to load pmfms
    if (this.starting) {
      this.setLoadingProgression(MeasurementFormLoadingSteps.LOADING_PMFMS);
      this.loadPmfms();
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.$loadingStep.unsubscribe();
    this.$pmfms.unsubscribe();
  }

  /**
   * Reset all data to original value. Useful sometimes, to re init the component (e.g. operation page).
   * Note: Keep @Input() attributes unchanged
   */
  unload() {
    this.data = null;
    this.applyingValue = false;
    this._$ready.next(false);
    this.resetPmfms();
  }

  setValue(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    return this.applyValue(data, opts);
  }

  reset(data?: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    return this.applyValue(data, opts);
  }

  markAsLoading(opts?: {step?: number; emitEvent?: boolean;}) {

    // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
    const step = toNumber(opts && opts.step, MeasurementFormLoadingSteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.$loadingStep.value !== step) {
      if (this.debug) console.debug(`${this.logPrefix} Loading step -> ${step}`);
      this.$loadingStep.next(step);
    }
  }

  markAsLoaded() {
    if (this.$loadingStep.value < MeasurementFormLoadingSteps.FORM_GROUP_READY) {
      this.$loadingStep.next(MeasurementFormLoadingSteps.FORM_GROUP_READY);
    }
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    try {
      await waitForTrue(this._$ready.pipe(
        filter(value => value === true),
        // Wait form ready
        switchMap(_ => this.$loadingStep),
        map(step => step >= MeasurementFormLoadingSteps.FORM_GROUP_READY)
      ), opts);
    } catch(err) {
      if (err?.message === 'object unsubscribed') throw 'CANCELLED'; // Cancelled
      throw err;
    }
  }

  async setAcquisitionLevel(value: string, opts?: { emitEvent?: boolean; data?: Measurement[] }) {
    if (this._acquisitionLevel !== value && isNotNil(value)) {
      this._acquisitionLevel = value;

      // Reload pmfms
      if (!opts || opts.emitEvent !== false) {
        await this.loadPmfms();
      }
    }

    // Apply given data
    if (opts?.data) {
      await this.applyValue(opts?.data, opts);
    }
  }

  protected getFormError(form: FormGroup): string {
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

  trackPmfmFn(index: number, pmfm: IPmfm): any {
    return pmfm.id;
  }

  /* -- protected methods -- */

  /**
   * Wait form is ready, before setting the value to form
   * @param data
   */
  protected async applyValue(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    this.applyingValue = true;

    try {
      // Will avoid data to be set inside function updateFormGroup()
      this.data = data;

      // Wait form controls ready
      await this.ready();

      // Data is still the same (not changed : applying)
      if (data === this.data) {

        this.updateView(this.data, opts);

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

  protected updateView(data: Measurement[], opts?: {emitEvent?: boolean; onlySelf?: boolean; }) {
    // Warn is form is NOT ready
    if (this.loading) {
      console.warn(`${this.logPrefix} Trying to set value, but form not ready!`);
    }

    this.data = MeasurementUtils.initAllMeasurements(data, this.$pmfms.value, this.entityName, this.keepRankOrder);

    const json = MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(this.data), this.$pmfms.value);

    this.form.patchValue(json, opts);

    // Restore form status
    this.updateViewState({onlySelf: true, emitEvent: opts && opts.emitEvent});
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

  protected setGearId(value: number, opts = {emitEvent: true}) {
    if (this._gearId !== value) {
      this._gearId = value;

      // Reload pmfms
      if (opts.emitEvent !== false) this._onRefreshPmfms.emit();
    }
  }

  protected getValue(): Measurement[] {

    if (this.loading) return this.data; // Avoid to return not loading data

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

  /**
   * Check if can load (must have: program, acquisition - and gear if required)
   */
  protected canLoadPmfms(): boolean{
    // Check if can load (must have: program, acquisition - and gear if required)
    if (isNil(this.programLabel)
      || isNil(this._acquisitionLevel)
      // TODO: enable this
      //|| (this.requiredStrategy && isNil(this.strategyLabel))
      || (this.requiredGear && isNil(this._gearId))) {

      // DEBUG
      if (this.debug) console.debug(`${this.logPrefix} cannot load pmfms (missing some inputs)`);

      return false;
    }
    return true;
  }

  protected async loadPmfms(event?: any) {
    if (!this.canLoadPmfms()) return;

    // DEBUG
    //if (this.debug) console.debug(`${this.logPrefix} loadPmfms()`);

    this.setLoadingProgression(MeasurementFormLoadingSteps.LOADING_PMFMS);

    let pmfms;
    try {
      // Load pmfms
      pmfms = this.programRefService.watchProgramPmfms(
        this.programLabel,
        {
          // TODO enable this
          //strategyLabel: this.strategyLabel,
          acquisitionLevel: this._acquisitionLevel,
          gearId: this._gearId
        });
    } catch (err) {
      console.error(`${this.logPrefix} Error while loading pmfms: ${err && err.message || err}`, err);
      pmfms = undefined;
    }

    // Apply
    await this.setPmfms(pmfms);

  }

  protected async setPmfms(value: IPmfm[] | Observable<IPmfm[]>): Promise<IPmfm[]> {
    // If undefined: reset pmfms
    if (!value) {
      this.resetPmfms();
      return; // break
    }

    // Mark as settings pmfms
    const previousLoadingStep = this.$loadingStep.value;
    this.setLoadingProgression(MeasurementFormLoadingSteps.SETTING_PMFMS);

    try {

      // Wait loaded, if observable
      let pmfms: IPmfm[];
      if (isObservable<IPmfm[]>(value)) {
        if (this.debug) console.debug(`${this.logPrefix} setPmfms(): waiting pmfms observable...`);
        pmfms = await firstNotNilPromise(value);
      } else {
        pmfms = value;
      }

      // If force to optional, create a copy of each pmfms that should be forced
      if (this._forceOptional) {
        pmfms = pmfms.map(pmfm => {
          if (pmfm.required) {
            pmfm = pmfm.clone(); // Keep original entity
            pmfm.required = false;
          }
          // Return original pmfm, as not need to be overrided
          return pmfm;
        });
      }

      // Apply (if changed)
      if (pmfms !== this.$pmfms.value) {
        // DEBUG log
        if (this.debug) console.debug(`${this.logPrefix} Pmfms changed {acquisitionLevel: '${this._acquisitionLevel}'}`, pmfms);

        // next step
        this.setLoadingProgression(MeasurementFormLoadingSteps.UPDATING_FORM_GROUP);
        this.$pmfms.next(pmfms);
      }
      else {
        // Nothing changes: restoring previous steps
        this.setLoadingProgression(previousLoadingStep);
      }
    }
    catch(err) {
      console.error(`${this.logPrefix} Error while applying pmfms: ${err && err.message || err}`, err);
      this.resetPmfms();
      return undefined;
    }
  }

  resetPmfms() {
    if (isNil(this.$pmfms.value)) return; // Already resetted

    if (this.debug) console.warn(`${this.logPrefix} Reset pmfms`);

    if (!this.starting && !this.loading) this.markAsLoading();
    this.$pmfms.next(undefined);
  }

  protected setLoadingProgression(step: number) {
    this.markAsLoading({step})
  }

  protected async updateFormGroup(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.$pmfms.value;
    if (!pmfms) return; // Skip

    const form = this.form;
    if (form.enabled) form.disable();

    // Mark as loading
    this.setLoadingProgression(MeasurementFormLoadingSteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this.logPrefix} Updating form controls, force_optional: ${this._forceOptional}}, using pmfms:`, pmfms);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset form
      this.measurementValidatorService.updateFormGroup(this.form, {pmfms: []});
      this.form.reset({}, {onlySelf: true, emitEvent: false});

    } else {
      // Update the existing form
      this.measurementValidatorService.updateFormGroup(this.form, {
        pmfms
      });
    }

    if (this.debug) console.debug(`${this.logPrefix} Form controls updated`);
    this.setLoadingProgression(MeasurementFormLoadingSteps.FORM_GROUP_READY);

    // Data already set: apply value again to fill the form
    if (!this.applyingValue) {
      if (this.data) {
        this.updateView(this.data, {onlySelf: true, emitEvent: false});
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

  protected get logPrefix(): string {
    const acquisitionLevel = this._acquisitionLevel && this._acquisitionLevel.toLowerCase().replace(/[_]/g, '-') || '?';
    return `[meas-form-${acquisitionLevel}]`;
  }

  private async refreshPmfmsIfLoaded(event?: any) {
    // Wait previous loading is finished
    await this.waitIdle();
    // Then refresh pmfms
    await this.loadPmfms(event);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
