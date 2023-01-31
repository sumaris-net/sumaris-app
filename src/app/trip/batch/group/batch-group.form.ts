import { ChangeDetectionStrategy, Component, forwardRef, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { Batch } from '../common/batch.model';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { AcquisitionLevelCodes, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { AppFormUtils, equals, InputElement, isNil, isNotNil, ReferentialUtils, toBoolean, waitFor, WaitForOptions } from '@sumaris-net/ngx-components';
import { BatchGroupValidatorOptions, BatchGroupValidatorService } from './batch-group.validator';
import { BatchForm, BatchFormState } from '../common/batch.form';
import { debounceTime, filter } from 'rxjs/operators';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { MeasurementsValidatorService } from '../../services/validator/measurement.validator';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { merge } from 'rxjs';

export interface BatchGroupFormState extends BatchFormState {
  childrenPmfmsByQvId: {[key: number]: IPmfm[]};
  qvPmfm: IPmfm;
  hasSubBatches: boolean;
  childrenState: Partial<BatchFormState>;
}

@Component({
  selector: 'app-batch-group-form',
  templateUrl: 'batch-group.form.html',
  styleUrls: ['batch-group.form.scss'],
  providers: [
    { provide: BatchForm, useExisting: forwardRef(() => BatchGroupForm)},
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BatchGroupForm extends BatchForm<BatchGroup, BatchGroupFormState, BatchGroupValidatorService, BatchGroupValidatorOptions> {

  readonly childrenPmfmsByQvId$ = this._state.select('childrenPmfmsByQvId');
  readonly hasSubBatches$ = this._state.select('hasSubBatches');
  readonly hasSubBatchesControl: UntypedFormControl;

  @Input() set qvPmfm(value: IPmfm) {
    this._state.set('qvPmfm', _ => value);
  }
  get qvPmfm(): IPmfm {
    return this._state.get('qvPmfm');
  }

  @Input() childrenPmfms: IPmfm[];
  @Input() taxonGroupsNoWeight: string[];
  @Input() allowSubBatches = true;
  @Input() defaultHasSubBatches = false;
  @Input() showHasSubBatchesButton = true;

  @Input() get childrenState(): Partial<BatchFormState> {
    return this._state.get('childrenState');
  }
  set childrenState(value: Partial<BatchFormState>) {
    this._state.set('childrenState', oldState => <Partial<BatchFormState>>{
      ...oldState.childrenState,
      ...value
    });
  }

  @ViewChildren('firstInput') firstInputFields !: QueryList<InputElement>;
  @ViewChildren('childForm') childrenList !: QueryList<BatchForm>;


  get invalid(): boolean {
    return this.form.invalid
      || this.hasSubBatchesControl.invalid
      || ((this.childrenList || []).find(child => child.invalid) && true) || false;
  }

  get valid(): boolean {
    // Important: Should be not invalid AND not pending, so use '!valid' (and NOT 'invalid')
    return this.form.valid
      && (this.hasSubBatchesControl.disabled /*ignore when disabled*/ || this.hasSubBatchesControl.valid)
      && (!this.childrenList || !this.childrenList.find(child => child.enabled && !child.valid)) || false;
  }

  get pending(): boolean {
    return this.form.pending
      || this.hasSubBatchesControl.pending
      || (this.childrenList && this.childrenList.find(child => child.pending) && true) || false;
  }

  get loading(): boolean {
    return super.loading || (this.childrenList && this.childrenList.find(child => child.loading) && true) || false;
  }

  get dirty(): boolean {
    return this.form.dirty || this.hasSubBatchesControl.dirty ||
      (this.childrenList && this.childrenList.find(child => child.dirty) && true) || false;
  }

  markAllAsTouched(opts?: { onlySelf?: boolean; emitEvent?: boolean; }) {
    super.markAllAsTouched(opts);
    this.childrenList?.forEach(f => f.markAllAsTouched(opts));
    this.hasSubBatchesControl.markAsTouched(opts);
  }

  markAsPristine(opts?: { onlySelf?: boolean; }) {
    super.markAsPristine(opts);
    (this.childrenList || []).forEach(child => child.markAsPristine(opts));
    this.hasSubBatchesControl.markAsPristine(opts);
  }

  markAsUntouched(opts?: { onlySelf?: boolean; }) {
    super.markAsUntouched(opts);
    (this.childrenList || []).forEach(child => child.markAsUntouched(opts));
    this.hasSubBatchesControl.markAsUntouched(opts);
  }

  markAsDirty(opts?: {
    onlySelf?: boolean;
  }) {
    super.markAsDirty(opts);
    (this.childrenList || []).forEach(child => child.markAsDirty(opts));
    this.hasSubBatchesControl.markAsDirty(opts);
  }

  disable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    super.disable(opts);
    (this.childrenList || []).forEach(child => child.disable(opts));
    this.hasSubBatchesControl.disable(opts);
  }

  enable(opts?: {
    onlySelf?: boolean;
    emitEvent?: boolean;
  }) {
    super.enable(opts);
    (this.childrenList || []).forEach(child => child.enable(opts));
  }

  protected updateViewState(opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    super.updateViewState(opts);
    // if (this._enable) {
    //   (this.childrenList || []).forEach(child => child.enable(opts));
    // }
    // else {
    //   (this.childrenList || []).forEach(child => child.disable(opts));
    //   this.hasSubBatchesControl.disable(opts);
    // }
  }

  get hasSubBatches(): boolean {
    return this._state.get('hasSubBatches');
  }

  @Input()
  set hasSubBatches(value: boolean) {
    this._state.set('hasSubBatches', _ => value);
  }

  constructor(
    injector: Injector,
    measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: UntypedFormBuilder,
    programRefService: ProgramRefService,
    referentialRefService: ReferentialRefService,
    validatorService: BatchGroupValidatorService
  ) {
    super(injector,
      measurementsValidatorService,
      formBuilder,
      programRefService,
      referentialRefService,
      validatorService, {
        withWeight: false,
        withChildren: false,
        withMeasurements: false
      });

    // Default value
    this._state.set((state) => <BatchFormState>{
      ...state,
      showSamplingBatch: false,
      showWeight: false
    });

    // Create control for hasSubBatches button
    this.hasSubBatchesControl = new UntypedFormControl(false);

    // DEBUG
    //this.debug = !environment.production;
    this._logPrefix = '[batch-group-form]';
  }

  ngOnInit() {
    super.ngOnInit();

    this.showHasSubBatchesButton = toBoolean(this.showHasSubBatchesButton, true);
    this.defaultHasSubBatches = toBoolean(this.defaultHasSubBatches, false);

    // Set isSampling on each child forms, when has indiv. measure changed
    this._state.connect('hasSubBatches', this.hasSubBatchesControl.valueChanges
      .pipe(filter(() => !this.applyingValue && !this.loading))
    );

    this._state.hold(this.hasSubBatches$, (value) => {
      if (this.hasSubBatchesControl.value !== value) {
        this.hasSubBatchesControl.setValue(value);
      }
      // Enable control if need
      if (!value && this.hasSubBatchesControl.disabled && this.enabled) {
        this.hasSubBatchesControl.enable();
      }
      // Disable control if need
      else if (value && this.hasSubBatchesControl.enabled && this.enabled) {
        this.hasSubBatchesControl.disable();
      }
    });

    // Listen form changes
    this._state.hold(merge(
      this.form.valueChanges,
      this.hasSubBatches$
    ).pipe(
      filter(() => !this.applyingValue && !this.loading),
      debounceTime(450)
    ),
      _ => this.computeChildrenState(this.form.value)
    );

    this._state.hold(this._state.select('childrenState').pipe(debounceTime(100)),
      async (childrenState) => {
        if (this.qvPmfm) {
          await this.waitForChildren({timeout: 2000});
          this.childrenList.forEach(childForm => this.updateChildFormState(childForm, childrenState));
        }
        else {
          this.updateChildFormState(this, childrenState)
        }
      });
  }

  focusFirstInput() {
    const element = this.firstInputFields.first;
    if (element) element.focus();
  }

  logFormErrors(logPrefix: string) {
    logPrefix = logPrefix || '';
    AppFormUtils.logFormErrors(this.form, logPrefix);
    if (this.childrenList) this.childrenList.forEach((childForm, index) => {
      AppFormUtils.logFormErrors(childForm.form, logPrefix, `children#${index}`);
    });
  }

  async ready(opts?: WaitForOptions): Promise<void> {
    await super.ready();
    if (this.qvPmfm) {
      await this.waitForChildren({stop: this.destroySubject, ...opts});
      await Promise.all(this.childrenList.map(child => child.ready({stop: this.destroySubject, ...opts})));
    }
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

      const qvPmfmIndex = pmfms.findIndex(pmfm => pmfm.id === qvPmfm.id);
      const speciesPmfms = pmfms.filter((pmfm, index) => index < qvPmfmIndex);
      const childrenPmfms = [
        qvPmfm,
        ...pmfms.filter((pmfm, index) => index > qvPmfmIndex)
      ];

      // Prepare a map of pmfm, by QV id.
      const childrenPmfmsByQvId = qvPmfm.qualitativeValues.reduce((res, qv ) => {
        // Map PMFM, for batch group's children
        // Depending of the qvId, some pmfms can be hidden (e.g. DRESSING and PRESERVATION)
        res[qv.id] = BatchGroupUtils.mapChildrenPmfms(childrenPmfms, {qvPmfm, qvId: qv.id})
        return res;
      }, {});

      // Update state
      this._state.set({childrenPmfmsByQvId, qvPmfm});

      // Limit to species pmfms
      pmfms = speciesPmfms;
    }
    else {
      if (this.debug) console.debug('[batch-group-form] No qv pmfms...');

      // Not need child form, so apply children properties to self
      const state = this.computeChildrenState(null, {hasSubBatches: this.hasSubBatches});
      this.updateChildFormState(this, state);
    }

    return super.mapPmfms(pmfms);
  }

  protected async updateView(data: BatchGroup, opts?: { emitEvent?: boolean; onlySelf?: boolean; }) {

    if (this.debug) console.debug(this._logPrefix + ' updateView() with value:', data);

    // Compute has sub batches (will be updated later in this function)
    let hasSubBatches = data.observedIndividualCount > 0 || this.defaultHasSubBatches || false;

    if (this.qvPmfm) {

      // Prepare data array, for each qualitative values
      data.children = this.qvPmfm.qualitativeValues.map((qv, index) => {

        // Find existing child, or create a new one
        // tslint:disable-next-line:triple-equals
        const child = (data.children || []).find(c => +(c.measurementValues[this.qvPmfm.id]) == qv.id)
          || new Batch();

        // Make sure label and rankOrder are correct
        child.label = `${data.label}.${qv.label}`;
        child.measurementValues[this.qvPmfm.id] = qv;
        child.rankOrder = index + 1;

        // Should have sub batches, when sampling batch exists
        const samplingBatchExists = isNotNil(BatchUtils.getSamplingChild(child));
        hasSubBatches = hasSubBatches || samplingBatchExists;

        // Create sampling batch, if has sub batches
        if (hasSubBatches && !samplingBatchExists) BatchUtils.getOrCreateSamplingChild(child);

        return child;
      });

      // Set has subbatches, if changed
      if (this.hasSubBatches !== hasSubBatches) this.hasSubBatches = hasSubBatches;

      // Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
      this.computeChildrenState(data, {hasSubBatches});

      // Wait children forms
      this.cd.detectChanges();
      await this.waitForChildren({timeout: 2000});

      // Set value of each child form
      await Promise.all(
        this.childrenList.map((childForm, index) => {
          const childBatch = data.children[index] || new Batch();
          return childForm.setValue(childBatch, {emitEvent: true});
        })
      );

      // Set value (batch group)
      await super.updateView(data, {...opts, emitEvent: false});
    }

    // No QV pmfm
    else {

      // Should have sub batches, when sampling batch exists
      const samplingBatchExists = isNotNil(BatchUtils.getSamplingChild(data));
      hasSubBatches = hasSubBatches || samplingBatchExists;

      // Create sampling batch, if has sub batches
      if (hasSubBatches && !samplingBatchExists) BatchUtils.getOrCreateSamplingChild(data);

      // Configure as child form (will copy some childrenXXX properties into self)
      if (hasSubBatches !== this.hasSubBatches) this.hasSubBatches = hasSubBatches;

      // Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
      const state = this.computeChildrenState(data, {hasSubBatches});

      // Configure form, using the state
      Object.assign(this, state);

      // Set value (batch group)
      await super.updateView(data, opts);

    }

    // Apply computed value
    if (this.showHasSubBatchesButton || !this.hasSubBatchesControl.value) {
      this.hasSubBatchesControl.setValue(hasSubBatches, {emitEvent: false});
    }

    // If there is already some measure
    // Not allow to change 'has measure' field
    if (data.observedIndividualCount > 0) {
      this.hasSubBatchesControl.disable();
    } else if (this.enabled) {
      this.hasSubBatchesControl.enable();
    }
  }

  protected updateChildFormState(childForm: BatchForm, childrenState: Partial<BatchFormState>, opts?: {emitEvent?: boolean}){
    if (!childrenState) return; // Skip

    childForm.updateState(childrenState);

    if (!opts || opts.emitEvent !== false) {
      if (this.enabled) {
        childForm.enable({onlySelf: true, ...opts});
      } else {
        childForm.disable({onlySelf: true, ...opts});
      }
      childForm.markAsReady();
    }
  }

  protected getValue(): BatchGroup {
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
          .filter(key => isNil(child.measurementValues[key]))
          .forEach(key => child.measurementValues[key] = childMeasurementValues[key]);

        return child;
      });
    }
    else {
      // Nothing to do
    }

    if (this.debug) console.debug(this._logPrefix + 'getValue():', data);

    return data;
  }

  /**
   * Compute if should show total individual count, instead of weight (eg. ADAP program, for species "RJB_x - Pocheteaux")
   * @param data
   * @param opts
   * @protected
   */
  protected computeChildrenState(data?: Batch, opts?: {hasSubBatches?: boolean}): Partial<BatchFormState> {
    data = data || this.data;
    if (this.debug) console.debug(this._logPrefix + 'updateChildrenFormState():', data);

    // Generally, individual count are not need, on a root species batch, because filled in sub-batches,
    // but some species (e.g. RJB) can have no weight.
    const taxonGroupNoWeight = ReferentialUtils.isNotEmpty(data?.taxonGroup)
      && (this.taxonGroupsNoWeight || []).includes(data.taxonGroup.label);

    const hasSubBatches = toBoolean(opts?.hasSubBatches, this.hasSubBatches)

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
    const oldChildrenState = this.childrenState;
    const childrenState: Partial<BatchFormState> = {
      ...oldChildrenState,
      showWeight,
      requiredWeight,
      showIndividualCount,
      requiredIndividualCount,
      showSamplingBatch,
      showSampleWeight,
      requiredSampleWeight,
      showChildrenWeight,
      samplingBatchEnabled
    }
    if (!equals(childrenState, oldChildrenState)) {
      this.childrenState = childrenState;
    }

    return childrenState;
    //if (!opts || opts.emitEvent !== false) this.markForCheck();
  }

  protected async onUpdateFormGroup(form?: UntypedFormGroup): Promise<void> {
    // if (this.qvPmfm) {
    //   // Ignore
    // }
    // else {
      await super.onUpdateFormGroup(form);
    //}
  }
}
