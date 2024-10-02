import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { FloatLabelType } from '@angular/material/form-field';
import { combineLatestWith, merge, mergeMap, Observable, switchMap, tap } from 'rxjs';
import { distinctUntilChanged, filter, map, takeUntil } from 'rxjs/operators';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MeasurementsValidatorService } from './measurement.validator';
import {
  AppForm,
  createPromiseEventEmitter,
  emitPromiseEvent,
  firstTrue,
  isNil,
  isNotNil,
  PromiseEvent,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Measurement, MeasurementType, MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { IPmfm, PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateRegister, RxStateSelect } from '@app/shared/state/state.decorator';
import { MeasurementsFormReadySteps, MeasurementsFormState } from '@app/data/measurement/measurements.utils';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { PmfmFormField } from '@app/referential/pmfm/field/pmfm.form-field.component';

export declare type MapPmfmEvent = PromiseEvent<IPmfm[], { pmfms: IPmfm[] }>;
export declare type UpdateFormGroupEvent = PromiseEvent<void, { form: UntypedFormGroup }>;

@Component({
  selector: 'app-form-measurements',
  templateUrl: './measurements.form.component.html',
  styleUrls: ['./measurements.form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class MeasurementsForm<S extends MeasurementsFormState = MeasurementsFormState> extends AppForm<Measurement[]> implements OnInit, OnDestroy {
  @RxStateRegister() protected readonly _state: RxState<S> = inject(RxState, { self: true });
  protected readonly _pmfmNamePipe = inject(PmfmNamePipe);
  protected _logPrefix: string;
  protected data: Measurement[];
  protected applyingValue = false;
  protected keepRankOrder = false;
  protected skipDisabledPmfmControl = true;
  protected skipComputedPmfmControl = true;
  protected cd: ChangeDetectorRef = null;

  @RxStateSelect() initialPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() filteredPmfms$: Observable<IPmfm[]>;
  @RxStateSelect() ready$: Observable<boolean>;

  @RxStateProperty() protected readyStep: number;
  @RxStateProperty() protected initialPmfms: IPmfm[];
  @RxStateProperty() protected filteredPmfms: IPmfm[];

  @Input() showError = false;
  @Input() compact = false;
  @Input() floatLabel: FloatLabelType = 'auto';
  @Input() entityName: MeasurementType;
  @Input() animated = false;
  @Input() mobile: boolean;
  @Input() maxVisibleButtons: number;
  @Input() maxItemCountForButtons: number;
  @Input() showButtonIcons: boolean;
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
  set value(value: Measurement[]) {
    this.applyValue(value);
  }
  get value(): Measurement[] {
    return this.getValue();
  }

  @Output() mapPmfms: EventEmitter<MapPmfmEvent> = createPromiseEventEmitter<IPmfm[], { pmfms: IPmfm[] }>();
  @Output('updateFormGroup') onUpdateFormGroup: EventEmitter<UpdateFormGroupEvent> = createPromiseEventEmitter<void, { form: UntypedFormGroup }>();

  get starting(): boolean {
    return this.readyStep === MeasurementsFormReadySteps.STARTING;
  }

  get formError(): string {
    return this.getFormError(this.form);
  }

  @ViewChildren(PmfmFormField) pmfmFormFields: QueryList<PmfmFormField>;

  constructor(
    injector: Injector,
    protected measurementValidatorService: MeasurementsValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected programRefService: ProgramRefService
  ) {
    super(injector, measurementValidatorService.getFormGroup([]));
    this.cd = injector.get(ChangeDetectorRef);

    const readySteps$ = this._state.select('readyStep');
    this._state.connect(
      'ready',
      readySteps$.pipe(
        distinctUntilChanged(),
        map((step) => step >= MeasurementsFormReadySteps.FORM_GROUP_READY)
      )
    );

    // Load pmfms; when input property set (skip if component is starting = waiting markAsReady())
    this._state.connect(
      'initialPmfms',
      readySteps$.pipe(
        filter((step) => step === MeasurementsFormReadySteps.LOADING_PMFMS),
        combineLatestWith(
          merge(
            this._state.select(['programLabel', 'acquisitionLevel', 'forceOptional'], (res) => res),
            this._state.select(['requiredStrategy', 'strategyLabel'], (res) => res),
            this._state.select(['requiredStrategy', 'strategyId'], (res) => res),
            this._state.select(['requiredGear', 'gearId'], (res) => res)
          )
        ),
        filter(() => !this.starting && this.canLoadPmfms()),
        tap(() => this.setReadyStep(MeasurementsFormReadySteps.SETTING_PMFMS)),
        switchMap(() => this.watchProgramPmfms())
      )
    );

    // Update form, when pmfms set
    this._state.connect(
      'filteredPmfms',
      this.initialPmfms$.pipe(
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
    this._logPrefix = '[measurements-form]';
    this._state.hold(this._state.select('acquisitionLevel'), (acquisitionLevel) => {
      this._logPrefix += `[measurements-form] (${acquisitionLevel})`;
    });
    //this.debug = !environment.production;
  }

  ngOnInit() {
    this.mobile = toBoolean(this.mobile, this.settings.mobile);
    super.ngOnInit();
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

  setValue(data: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    return this.applyValue(data, opts);
  }

  reset(data?: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
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

  markAsLoaded(opts?: { emitEvent?: boolean }) {
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

  translateFormPath(path: string, pmfms?: IPmfm[]) {
    if (PMFM_ID_REGEXP.test(path)) {
      const pmfmId = parseInt(path);
      const pmfm = (pmfms || this.initialPmfms)?.find((p) => p.id === pmfmId);
      if (pmfm) {
        return this._pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nSuffix });
      }
    }
    return super.translateFormPath(path);
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
  protected async applyValue(data: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    this.applyingValue = true;

    try {
      // Will avoid data to be set inside function updateFormGroup()
      this.data = data;

      if (this.debug) console.debug(`${this._logPrefix} Applying value...`, data);
      this.onApplyingEntity(data, opts);

      // Wait form is ready, before applying the data
      await this.ready({ stop: this.destroySubject });

      // Data is still the same (not changed : applying)
      if (data && data === this.data) {
        // Applying value to form (that should be ready).
        await this.updateView(data, opts);
        this.markAsLoaded();
      }
    } catch (err) {
      if (err?.message !== 'stop') {
        console.error(`${this._logPrefix} Error while applying value: ${(err && err.message) || err}`, err);
        this.setError((err && err.message) || err);
      }
      this.markAsLoaded();
    } finally {
      this.applyingValue = false;
    }
  }

  protected onApplyingEntity(data: Measurement[], opts?: { [key: string]: any }) {
    // Can be override by subclasses
  }

  protected async updateView(data: Measurement[], opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    // Warn is form is NOT ready
    if (this.debug && this.readyStep < MeasurementsFormReadySteps.FORM_GROUP_READY) {
      console.warn(`${this._logPrefix} Trying to set value, but form not ready!`);
    }

    // DEBUG
    if (this.debug) console.debug(`${this._logPrefix} updateView() with value:`, data);

    const pmfms = this.pmfms;
    this.data = MeasurementUtils.initAllMeasurements(data, pmfms, this.entityName, this.keepRankOrder);
    const json = MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(this.data), pmfms);

    this.form.patchValue(json, opts);

    // Restore form status
    this.updateViewState({ onlySelf: true, ...opts });
  }

  getValue(): Measurement[] {
    if (this.loading) return this.data; // Avoid to return not well loaded data

    // Find dirty pmfms, to avoid full update
    const form = this.form;
    const filteredPmfms = (this.pmfms || []).filter((pmfm) => {
      const control = form.controls[pmfm.id];
      return (
        control &&
        (control.dirty || (this.skipDisabledPmfmControl === false && control.disabled) || (this.skipComputedPmfmControl === false && pmfm.isComputed))
      );
    });

    // Update data
    if (filteredPmfms.length) {
      MeasurementUtils.setValuesByFormValues(this.data, form.value, filteredPmfms);
    }

    return this.data;
  }

  protected setReadyStep(step: number) {
    // /!\ do NOT use STARTING step here (only used to avoid to many refresh, BEFORE ngOnInit())
    step = toNumber(step, MeasurementsFormReadySteps.LOADING_PMFMS);

    // Emit, if changed
    if (this.readyStep !== step) {
      // DEBUG
      if (this.debug) console.debug(`${this._logPrefix} Loading step -> ${step}`);

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
  protected canLoadPmfms(): boolean {
    // Check if can load (must have: program, acquisition - and gear if required)
    if (
      isNil(this.programLabel) ||
      isNil(this.acquisitionLevel) ||
      (this.requiredStrategy && isNil(this.strategyLabel) && isNil(this.strategyId)) ||
      (this.requiredGear && isNil(this.gearId))
    ) {
      // DEBUG
      //if (this.debug) console.debug(`${this._logPrefix} cannot load pmfms (missing some inputs)`);

      return false;
    }
    return true;
  }

  protected watchProgramPmfms(): Observable<IPmfm[]> {
    // DEBUG
    //if (this.debug) console.debug(`${this._logPrefix} watchProgramPmfms()`);

    let pmfms$ = this.programRefService
      .watchProgramPmfms(this.programLabel, {
        acquisitionLevel: this.acquisitionLevel,
        strategyId: this.strategyId,
        strategyLabel: this.strategyLabel,
        gearId: this.gearId,
      })
      .pipe(takeUntil(this.destroySubject));

    // DEBUG log
    if (this.debug) {
      pmfms$ = pmfms$.pipe(
        tap((pmfms) => {
          if (!pmfms.length) {
            console.debug(
              `${this._logPrefix}No pmfm found for {program: '${this.programLabel}', acquisitionLevel: '${this.acquisitionLevel}', strategy: '${
                this.strategyId || this.strategyLabel
              }'}. Please fill program's strategies !`
            );
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
        pmfms = pmfms.map((pmfm) => {
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
        const res = await emitPromiseEvent(this.mapPmfms, 'pmfms', { detail: { pmfms } });
        pmfms = Array.isArray(res) ? res : pmfms;
      }

      return pmfms;
    } catch (err) {
      if (err?.message !== 'stop') {
        console.error(`${this._logPrefix} Error while applying pmfms: ${(err && err.message) || err}`, err);
      }
      this.resetPmfms();
      return undefined;
    }
  }

  private async _updateFormGroup(pmfms?: IPmfm[]) {
    pmfms = pmfms || this.pmfms;
    if (!pmfms) return; // Skip

    const form = this.form;
    if (form.enabled) {
      form.disable();
    }

    // Mark as loading
    this.setReadyStep(MeasurementsFormReadySteps.UPDATING_FORM_GROUP);
    if (this.debug) console.debug(`${this._logPrefix} Updating form controls, force_optional: ${this.forceOptional}}, using pmfms:`, pmfms);

    // No pmfms (= empty form)
    if (!pmfms.length) {
      // Reset form
      this.measurementValidatorService.updateFormGroup(form, { pmfms: [] });
      form.reset({}, { onlySelf: true, emitEvent: false });
    } else {
      // Update the existing form
      this.measurementValidatorService.updateFormGroup(form, { pmfms });
    }

    // Call options function
    if (this.onUpdateFormGroup.observed) {
      await emitPromiseEvent(this.onUpdateFormGroup, 'onUpdateFormGroup', { detail: { form } });
    }

    if (this.debug) console.debug(`${this._logPrefix} Form controls updated`);
    this.setReadyStep(MeasurementsFormReadySteps.FORM_GROUP_READY);

    // Data already set: apply value again to fill the form
    if (!this.applyingValue) {
      // Update data in view
      if (this.data) {
        await this.updateView(this.data, { onlySelf: true, emitEvent: false });
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
    } else {
      this.disable(opts);
    }
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }
}
