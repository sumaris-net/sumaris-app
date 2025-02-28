import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Batch } from '../common/batch.model';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import {
  AppFormUtils,
  InputElement,
  isNil,
  isNotNilOrBlank,
  ReferentialUtils,
  toBoolean,
  waitFor,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { BatchGroupValidatorOptions, BatchGroupValidatorService } from './batch-group.validator';
import { BatchForm, BatchFormState } from '../common/batch.form';
import { debounceTime, distinctUntilChanged, filter, map, tap } from 'rxjs/operators';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge, Observable } from 'rxjs';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { RxState } from '@rx-angular/state';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';

export interface IPmfmMap {
  [key: number]: IPmfm[];
}

export interface BatchGroupFormState extends BatchFormState {
  childrenPmfmsByQvId: IPmfmMap;
  qvPmfm: IPmfm;
  hasSubBatches: boolean;
  childrenState: Partial<BatchFormState>;
}

@Component({
  selector: 'app-batch-group-form',
  templateUrl: 'batch-group.form.html',
  styleUrls: ['batch-group.form.scss'],
  providers: [{ provide: BatchForm, useExisting: forwardRef(() => BatchGroupForm) }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchGroupForm
  extends BatchForm<BatchGroup, BatchGroupFormState, BatchGroupValidatorService, BatchGroupValidatorOptions>
  implements OnInit
{
  @RxStateSelect() protected childrenPmfmsByQvId$: Observable<IPmfmMap>;
  @RxStateSelect() protected hasSubBatches$: Observable<boolean>;
  protected readonly hasSubBatchesControl = new UntypedFormControl(false);

  @Input() childrenPmfms: IPmfm[];
  @Input() taxonGroupsNoWeight: string[];
  @Input() allowSubBatches = true;
  @Input() defaultHasSubBatches = false;
  @Input() showHasSubBatchesButton = true;
  @Input() @RxStateProperty() hasSubBatches: boolean;
  @Input() @RxStateProperty() qvPmfm: IPmfm;

  @Input() get childrenState(): Partial<BatchFormState> {
    return this._state.get('childrenState');
  }
  set childrenState(value: Partial<BatchFormState>) {
    this._state.set(
      'childrenState',
      (oldState) =>
        <Partial<BatchFormState>>{
          ...oldState.childrenState,
          ...value,
        }
    );
  }

  @ViewChildren('firstInput') firstInputFields!: QueryList<InputElement>;
  @ViewChildren('childForm') childrenList!: QueryList<BatchForm>;

  get invalid(): boolean {
    return this.form.invalid || this.childrenList?.some((child) => child.invalid) || this.hasSubBatchesControl.invalid || false;
  }

  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
    return (
      (this.form.valid &&
        (!this.childrenList || !this.childrenList?.some((child) => child.enabled && !child.valid)) &&
        (this.hasSubBatchesControl.disabled /*ignore when disabled*/ || this.hasSubBatchesControl.valid)) ||
      false
    );
  }

  get pending(): boolean {
    return this.form.pending || this.childrenList?.some((child) => child.pending) || this.hasSubBatchesControl.pending;
  }

  get loading(): boolean {
    return super.loading || this.childrenList?.some((child) => child.loading) || false;
  }

  get dirty(): boolean {
    return (
      this.form.dirty ||
      this.childrenList?.some((child) => child.dirty) ||
      (this.hasSubBatchesControl.enabled /*ignore when disabled*/ && this.hasSubBatchesControl.dirty) ||
      false
    );
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.markAllAsTouched(opts);
    this.childrenList?.forEach((f) => f.markAllAsTouched(opts));
    this.hasSubBatchesControl.markAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean }) {
    super.markAsPristine(opts);
    (this.childrenList || []).forEach((child) => child.markAsPristine(opts));
    this.hasSubBatchesControl.markAsPristine(opts);
  }

  markAsUntouched(opts?: { onlySelf?: boolean }) {
    super.markAsUntouched(opts);
    (this.childrenList || []).forEach((child) => child.markAsUntouched(opts));
    this.hasSubBatchesControl.markAsUntouched(opts);
  }

  markAsDirty(opts?: { onlySelf?: boolean }) {
    super.markAsDirty(opts);
    (this.childrenList || []).forEach((child) => child.markAsDirty(opts));
    this.hasSubBatchesControl.markAsDirty(opts);
  }

  disable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.disable(opts);
    (this.childrenList || []).forEach((child) => child.disable(opts));
    this.updateHasSubBatchesControl(this.hasSubBatches, opts);
  }

  enable(opts?: { onlySelf?: boolean; emitEvent?: boolean }) {
    super.enable(opts);
    (this.childrenList || []).forEach((child) => child.enable(opts));
    this.updateHasSubBatchesControl(this.hasSubBatches, opts);
  }

  constructor(
    injector: Injector,
    measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: UntypedFormBuilder,
    programRefService: ProgramRefService,
    referentialRefService: ReferentialRefService,
    validatorService: BatchGroupValidatorService
  ) {
    super(injector, measurementsValidatorService, formBuilder, programRefService, referentialRefService, validatorService, {
      withWeight: false,
      withChildren: false,
      withMeasurements: false,
    });

    // Default value
    this._state.set(
      (state) =>
        <BatchFormState>{
          ...state,
          showSamplingBatch: false,
          showWeight: false,
        }
    );

    // DEBUG
    //this.debug = !environment.production;
    this._logPrefix = '[batch-group-form]';
  }

  ngOnInit() {
    super.ngOnInit();

    this.showHasSubBatchesButton = this.showHasSubBatchesButton ?? true;
    this.defaultHasSubBatches = this.defaultHasSubBatches ?? false;

    // Set isSampling on each child forms, when has indiv. measure changed
    this._state.connect(
      'hasSubBatches',
      this.hasSubBatchesControl.valueChanges.pipe(
        filter(() => !this.applyingValue && this.loaded),
        distinctUntilChanged(),
        tap((_) => this.markAsDirty())
      )
    );

    this._state.hold(this.hasSubBatches$, (hasSubBatches) => this.updateHasSubBatchesControl(hasSubBatches));

    // Listen form changes, to update children state (e.g. when taxonGroup changes, check if RJB special case)
    this._state.connect(
      'childrenState',
      merge(this.form.valueChanges, this.hasSubBatches$).pipe(
        filter(() => !this.applyingValue && this.enabled && !this.loading),
        debounceTime(450),
        map((_) => this.computeChildrenState(this.form.value))
      )
    );

    // Listen children state, and update forms
    this._state.hold(this._state.select('childrenState').pipe(filter(() => this.enabled && !this.loading)), (childrenState) => {
      if (this.qvPmfm) {
        this.childrenList?.forEach((childForm) => childForm.applyState(childrenState));
      }
      // No QV: apply to himself
      else this.applyState(childrenState);
    });
  }

  focusFirstInput() {
    const element = this.firstInputFields.first;
    if (element) element.focus();
  }

  logFormErrors(logPrefix: string) {
    logPrefix = logPrefix || '';
    AppFormUtils.logFormErrors(this.form, logPrefix);
    if (this.childrenList)
      this.childrenList.forEach((childForm, index) => {
        AppFormUtils.logFormErrors(childForm.form, logPrefix, `children#${index}`);
      });
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready(opts);
  }

  /* -- protected methods -- */

  protected waitForChildren(opts?: WaitForOptions) {
    return waitFor(() => this.childrenList?.length > 0, opts);
  }

  protected mapPmfms(pmfms: IPmfm[]) {
    if (this.debug) console.debug('[batch-group-form] mapPmfm()...');

    let qvPmfm = this.qvPmfm || BatchGroupUtils.getQvPmfm(pmfms);
    if (qvPmfm) {
      // Create a copy, to keep original pmfm unchanged
      qvPmfm = qvPmfm.clone();

      // Hide for children form, and change it as required
      qvPmfm.hidden = true;
      qvPmfm.required = true;

      const qvPmfmIndex = pmfms.findIndex((pmfm) => pmfm.id === qvPmfm.id);
      const speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
      const childrenPmfms = [qvPmfm, ...pmfms.filter((pmfm, index) => index > qvPmfmIndex)];

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
    } else {
      if (this.debug) console.debug('[batch-group-form] No qv pmfms...');
      return super.mapPmfms(pmfms);
    }
  }

  protected async updateView(data: BatchGroup, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    if (this.debug) console.debug(this._logPrefix + ' updateView() with value:', data);

    // Show comments if any
    this.showComment = this.showComment || isNotNilOrBlank(data?.comments);

    // Compute has sub batches (will be updated later in this function)
    let hasSubBatches = data.observedIndividualCount > 0 || this.defaultHasSubBatches || false;

    const qvPmfm = this.qvPmfm;
    if (qvPmfm) {
      // Prepare data array, for each qualitative values
      data.children = qvPmfm.qualitativeValues.map((qv, index) => {
        // Find existing child, or create a new one
        // tslint:disable-next-line:triple-equals
        const child = (data.children || []).find((c) => MeasurementValuesUtils.hasPmfmValue(c.measurementValues, qvPmfm.id, qv)) || new Batch();

        // Make sure label and rankOrder are correct
        child.label = `${data.label}.${qv.label}`;
        child.measurementValues[this.qvPmfm.id] = qv;
        child.rankOrder = index + 1;

        // Should have sub batches, when sampling batch exists
        const samplingBatch = BatchUtils.getSamplingChild(child);
        hasSubBatches = hasSubBatches || (samplingBatch && BatchUtils.isNotEmptySamplingBatch(samplingBatch));

        // Create sampling batch, if has sub batches
        if (hasSubBatches && !samplingBatch) BatchUtils.getOrCreateSamplingChild(child);

        return child;
      });

      // Update has sub batches, if changed
      if (this.hasSubBatches !== hasSubBatches) this.hasSubBatches = hasSubBatches;

      // Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
      this.childrenState = this.computeChildrenState(data, { hasSubBatches });

      // Wait children forms
      this.cd.detectChanges();
      await this.waitForChildren({ stop: this.destroySubject });

      // Set value of each child form
      await Promise.all(
        this.childrenList.map(async (childForm, index) => {
          childForm.markAsReady();
          return childForm.setValue(data.children[index] || new Batch(), { emitEvent: true });
        })
      );

      // Set value (batch group)
      await super.updateView(data, { ...opts, emitEvent: false });
    }

    // No QV pmfm
    else {
      // Should have sub batches, when sampling batch exists
      const samplingBatch = BatchUtils.getSamplingChild(data);
      hasSubBatches = hasSubBatches || (samplingBatch && BatchUtils.isNotEmptySamplingBatch(samplingBatch));

      // Create sampling batch, if has sub batches
      if (hasSubBatches && !samplingBatch) BatchUtils.getOrCreateSamplingChild(data);

      // Configure as child form (will copy some childrenXXX properties into self)
      if (hasSubBatches !== this.hasSubBatches) this.hasSubBatches = hasSubBatches;

      // Compute state
      const state = this.computeChildrenState(data, { hasSubBatches });
      this.applyState(state);
      this.childrenState = state;
      this.markAsReady();

      // Set value (batch group)
      await super.updateView(data, opts);
    }

    // Apply computed value
    this.updateHasSubBatchesControl(hasSubBatches, { emitEvent: false });
  }

  getValue(): BatchGroup {
    const data = super.getValue();
    if (!data) return; // No set yet

    if (this.qvPmfm) {
      // For each child
      data.children = this.childrenList.map((childForm, index) => {
        const qv = this.qvPmfm.qualitativeValues[index];
        const child = childForm.value;
        if (!child) return; // No set yet

        child.rankOrder = index + 1;
        child.label = `${data.label}.${qv.label}`;
        child.measurementValues = child.measurementValues || {};
        child.measurementValues[this.qvPmfm.id.toString()] = '' + qv.id;

        // Copy other pmfms
        const childMeasurementValues = childForm.measurementValuesForm.value;
        Object.keys(childMeasurementValues)
          .filter((key) => isNil(child.measurementValues[key]))
          .forEach((key) => (child.measurementValues[key] = childMeasurementValues[key]));

        return child;
      });
    } else {
      // Nothing to do
    }

    if (this.debug) console.debug(this._logPrefix + 'getValue():', data);

    return data;
  }

  /**
   * Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
   *
   * @param data
   * @param opts
   * @protected
   */
  protected computeChildrenState(data?: Batch, opts?: { hasSubBatches?: boolean }): Partial<BatchFormState> {
    data = data || this.data;
    if (this.debug) console.debug(this._logPrefix + 'updateChildrenFormState():', data);

    // Generally, individual count are not need, on a root species batch, because filled in sub-batches,
    // but some species (e.g. RJB) can have no weight.
    const taxonGroupNoWeight = ReferentialUtils.isNotEmpty(data?.taxonGroup) && (this.taxonGroupsNoWeight || []).includes(data.taxonGroup.label);

    const hasSubBatches = toBoolean(opts?.hasSubBatches, this.hasSubBatches);

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
    const childrenState: Partial<BatchFormState> = {
      ...this.childrenState,
      showWeight,
      requiredWeight,
      showIndividualCount,
      requiredIndividualCount,
      showSamplingBatch,
      showSampleWeight,
      requiredSampleWeight,
      showChildrenWeight,
      samplingBatchEnabled,
    };

    return childrenState;
  }

  protected async onUpdateFormGroup(form?: UntypedFormGroup): Promise<void> {
    await super.onUpdateFormGroup(form);
  }

  protected setHasSubBatches(value?: boolean) {
    this.hasSubBatches = value;
    // This will trigger the state property, then call updateHasSubBatchesControl() below
  }

  protected updateHasSubBatchesControl(hasSubBatches?: boolean, opts?: { emitEvent?: boolean }) {
    hasSubBatches = hasSubBatches ?? this.hasSubBatches;
    if (isNil(hasSubBatches)) return; // Skip

    if (this.debug) console.debug(this._logPrefix + 'Updating hasSubBatchesControl with value: ' + hasSubBatches);

    if (this.hasSubBatchesControl.value !== hasSubBatches) {
      this.hasSubBatchesControl.setValue(hasSubBatches, { emitEvent: this.loaded, ...opts });
      this.markForCheck();
    }

    // Enable / disable
    const enable = this.showHasSubBatchesButton && !(this.data.observedIndividualCount > 0) && !this.defaultHasSubBatches && this.enabled;
    AppFormUtils.setControlEnabled(this.hasSubBatchesControl, enable, { emitEvent: false });
  }
}
