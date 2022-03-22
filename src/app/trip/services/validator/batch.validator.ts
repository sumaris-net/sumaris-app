import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { EntityUtils, FormArrayHelper, isNil, isNotNilOrBlank, isNotNilOrNaN, SharedAsyncValidators, SharedValidators, toBoolean, toFloat, toNumber } from '@sumaris-net/ngx-components';
import { Batch, BatchUtils, BatchWeight } from '../model/batch.model';
import { MethodIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { Subscription } from 'rxjs';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';

@Injectable({providedIn: 'root'})
export class BatchValidatorService<T extends Batch = Batch> implements ValidatorService {

  pmfms: IPmfm[];
  showSamplingBatchColumns: boolean = true;

  constructor(
    protected measurementsValidatorService: MeasurementsValidatorService,
    protected formBuilder: FormBuilder) {
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: T, opts?: {
    withWeight?: boolean;
    rankOrderRequired?: boolean;
    labelRequired?: boolean;
    withChildren?: boolean;
    withMeasurements?: boolean;
    pmfms?: IPmfm[];
    qvPmfm?: IPmfm;
  }): FormGroup {
    const form = this.formBuilder.group(this.getFormGroupConfig(data, {...opts}));

    if (opts && opts.withChildren) {
      // there is a second level of children only if there is qvPmfm and sampling batch columns
      const formChildrenHelper = this.getChildrenFormHelper(form, {withChildren: !!opts.qvPmfm && this.showSamplingBatchColumns});

      formChildrenHelper.resize(opts.qvPmfm?.qualitativeValues?.length || 1);
    }

    // Add weight sub form
    if (opts && opts.withWeight) {
      form.addControl('weight', this.getWeightFormGroup(data && data.weight));
    }

    if (opts && opts.withMeasurements && opts.pmfms) {
      if (form.contains('measurementValues')) form.removeControl('measurementValues')
      form.addControl('measurementValues', this.measurementsValidatorService.getFormGroup(null, {
        pmfms: opts.pmfms,
        forceOptional: true
      }));
    }

    return form;
  }

  protected getFormGroupConfig(data?: T, opts?: {
    rankOrderRequired?: boolean;
    labelRequired?: boolean;
  }): { [key: string]: any } {
    const rankOrder = toNumber(data && data.rankOrder, null);
    const label = data && data.label || null;
    return {
      __typename: [Batch.TYPENAME],
      id: [toNumber(data && data.id, null)],
      updateDate: [data && data.updateDate || null],
      rankOrder: !opts || opts.rankOrderRequired !== false ? [rankOrder, Validators.required] : [rankOrder],
      label: !opts || opts.labelRequired !== false ? [label, Validators.required] : [label],
      individualCount: [toNumber(data && data.individualCount, null), Validators.compose([Validators.min(0), SharedValidators.integer])],
      samplingRatio: [toNumber(data && data.samplingRatio, null), SharedValidators.double()],
      samplingRatioText: [data && data.samplingRatioText || null],
      taxonGroup: [data && data.taxonGroup || null, SharedValidators.entity],
      taxonName: [data && data.taxonName || null, SharedValidators.entity],
      comments: [data && data.comments || null],
      parent: [data && data.parent || null, SharedValidators.entity],
      measurementValues: this.formBuilder.group({}),
      children: this.formBuilder.array([]),
      // Quality properties
      controlDate: [data && data.controlDate || null],
      qualificationDate: [data && data.qualificationDate || null],
      qualificationComments: [data && data.qualificationComments || null],
      qualityFlagId: [toNumber(data && data.qualityFlagId, 0)]
    };
  }

  getWeightFormGroup(data?: BatchWeight): FormGroup {
    return this.formBuilder.group({
      methodId: [toNumber(data && data.methodId, null), SharedValidators.integer],
      estimated: [toBoolean(data && data.estimated, null)],
      computed: [toBoolean(data && data.computed, null)],
      value: [toNumber(data && data.value, null), SharedValidators.double({maxDecimals: 2})]
    });
  }

  protected getChildrenFormHelper(form: FormGroup, opts?: { withChildren: boolean }): FormArrayHelper<T> {
    let arrayControl = form.get('children') as FormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      form.addControl('children', arrayControl);
    }
    return new FormArrayHelper<T>(
      arrayControl,
      (value) => this.getFormGroup(value, {withWeight: true, qvPmfm: undefined, withMeasurements: true, pmfms: this.pmfms, ...opts}),
      (v1, v2) => EntityUtils.equals(v1, v2, 'label'),
      (value) => isNil(value),
      {allowEmptyArray: true}
    );
  }

  enableSamplingWeightComputation(form: FormGroup, opts?: {
    requiredSampleWeight?: boolean;
    markForCheck?: () => void;
  }): Subscription {

    // Sampling ratio: should be a percentage
    form.get('samplingRatio')?.setValidators(
      Validators.compose([Validators.min(0), Validators.max(100), SharedValidators.double({maxDecimals: 2})])
    );

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.samplingWeightComputation(opts),
      {markForCheck: opts?.markForCheck}
    );
  }

  enableWeightLengthConversion(form: FormGroup, opts?: {
    requiredWeight?: boolean;
    markForCheck?: () => void;
  }): Subscription {

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.weightLengthConversion(opts),
      {markForCheck: opts?.markForCheck}
    );
  }

  enableRoundWeightConversion(form: FormGroup, opts?: {
    requiredWeight?: boolean;
    markForCheck?: () => void;
  }): Subscription {

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.roundWeightConversion(opts),
      {markForCheck: opts?.markForCheck}
    );
  }
}

export class BatchValidators {

  /**
   * Computing weight, sampling weight and/or sampling ratio
   * @param opts
   */
  static samplingWeightComputation(opts?: {
    requiredSampleWeight?: boolean;
  }): ValidatorFn {
    return (control) => BatchValidators.computeSamplingWeight(control as FormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  /**
   * Same, but on a batch group
   * @param opts
   */
  static samplingWeightRowComputation(opts: {
    requiredSampleWeight?: boolean;
    qvPmfm?: IPmfm;
  }): ValidatorFn {
    if (!opts?.qvPmfm) {
      return (control) => {
        const form = control as FormGroup;
        return BatchValidators.computeSamplingWeight(form, {...opts, emitEvent: false, onlySelf: false});
      };
    }

    return Validators.compose((opts.qvPmfm.qualitativeValues || [])
      .map((qv, qvIndex) => {
        const qvSuffix = `children.${qvIndex}.`;
        const qvOpts = {
          ...opts,
          weightPath: qvSuffix + 'weight',
          samplingWeightPath: qvSuffix + 'children.0.weight',
          samplingRatioPath: qvSuffix + 'children.0.samplingRatio',
          qvIndex
        };
        return (control) => {
          const form = control as FormGroup;
          // Enable total individual count
          if (form.get(qvSuffix + 'individualCount').disabled) {
            form.get(qvSuffix + 'individualCount').enable();
          }
          // Enable sampling individual count
          if (form.get(qvSuffix + 'children.0.individualCount').disabled) {
            form.get(qvSuffix + 'children.0.individualCount').enable();
          }
          return BatchValidators.computeSamplingWeight(form, {...qvOpts, emitEvent: false, onlySelf: false});
        }
      }));
  }

  static weightLengthConversion(opts?: {
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
    // Length
    lengthPath?: string;
    lengthPmfmId?: number;
  }): ValidatorFn {
    return (control) => BatchValidators.computeWeightLengthConversion(control as FormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  static roundWeightConversion(opts?: {
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
  }): ValidatorFn {
    return (control) => BatchValidators.computeRoundWeightConversion(control as FormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  /* -- internal function -- */
  private static computeSamplingWeight(form: FormGroup, opts?: {
    // Event propagation
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    requiredSampleWeight?: boolean;
    // Control path (used by batch group row validator)
    weightPath?: string;
    samplingWeightPath?: string;
    samplingRatioPath?: string;
    qvIndex?: number;
    // UI function
    //markForCheck?: () => void
  }): ValidationErrors | null {

    const qvSuffix = opts && isNotNilOrNaN(opts.qvIndex) ? 'children.' + opts.qvIndex.toString() : '';
    const sampleFormSuffix = qvSuffix + (qvSuffix ? '.' : '') + 'children.0';

    const sampleForm = form.get(sampleFormSuffix);
    if (!sampleForm) return; // No sample batch: skip

    const weightPath = opts && opts.weightPath || 'weight';
    const samplingWeightPath = opts && opts.samplingWeightPath || sampleFormSuffix + '.' + weightPath;
    const samplingRatioPath = opts && opts.samplingRatioPath || sampleFormSuffix + '.samplingRatio';

    const totalWeightControl = form.get(weightPath);
    const samplingRatioControl = form.get(samplingRatioPath);
    const samplingRatioTextControl = form.get(samplingRatioPath + 'Text');
    const samplingWeightControl = form.get(samplingWeightPath);
    const samplingWeightValueControl = form.get(samplingWeightPath + ".value");

    const totalWeight = toFloat(totalWeightControl.value?.value);
    const samplingRatioPct = toNumber(samplingRatioControl.value);
    const samplingRatioText = samplingRatioTextControl?.value;
    const samplingRatioComputed = samplingRatioText && samplingRatioText.includes('/') || false;

    const samplingWeight = toFloat(samplingWeightControl.value?.value);

    if (totalWeightControl.disabled) totalWeightControl.enable(opts);
    if (samplingRatioControl.disabled) samplingRatioControl.enable(opts);
    if (samplingWeightControl.disabled) samplingWeightControl.enable(opts);

    const batch = isNotNilOrBlank(qvSuffix) ? form.get(qvSuffix).value : form.value;
    if (!batch.weight) {
      batch.weight = {
        value: totalWeight || 0,
        computed: false,
        estimated: false
      };
    }

    let sampleBatch = BatchUtils.getSamplingChild(batch);
    if (!sampleBatch) {
      sampleBatch = sampleForm.value;
      batch.children.push(sampleBatch);
    }
    if (!sampleBatch.weight) {
      sampleBatch.weight = {
        value: samplingWeight || 0,
        computed: false,
        estimated: false,
        methodId: batch.weight.methodId
      };
    }

    // DEBUG
    console.debug('[batch-validator] Start computing: ', [totalWeight, samplingRatioPct, samplingWeight, samplingRatioText]);

    // Compute samplingRatio, using weights
    if (!batch.weight.computed && isNotNilOrNaN(totalWeight) && totalWeight > 0
      && !sampleBatch.weight.computed && isNotNilOrNaN(samplingWeight) && samplingWeight > 0) {

      // Sampling weight must be under total weight
      if (toNumber(samplingWeight) > toNumber(totalWeight)) {
        if (!samplingWeightControl.hasError('max') || samplingWeightValueControl.errors['max'] !== totalWeight) {
          samplingWeightValueControl.markAsPending({ onlySelf: true, emitEvent: true }); //{onlySelf: true, emitEvent: false});
          samplingWeightValueControl.markAsTouched({ onlySelf: true });
          samplingWeightValueControl.setErrors({ ...samplingWeightValueControl.errors, max: { max: totalWeight } }, opts);
        }
        return { max: { max: totalWeight } } as ValidationErrors;
      } else {
        SharedValidators.clearError(samplingWeightValueControl, 'max');
      }

      // Update sampling ratio
      const computedSamplingRatioPct = Math.round(100 * samplingWeight / totalWeight);
      if (samplingRatioPct !== computedSamplingRatioPct) {
        sampleForm.patchValue({
          samplingRatio: computedSamplingRatioPct,
          samplingRatioText: `${samplingWeight}/${totalWeight}`,
        }, opts);
      }
      return;
    }

    // Compute sample weight using ratio and total weight
    else if (!samplingRatioComputed && isNotNilOrNaN(samplingRatioPct) && samplingRatioPct <= 100 && samplingRatioPct > 0
      && !batch.weight.computed && isNotNilOrNaN(totalWeight) && totalWeight >= 0) {

      if (sampleBatch.weight.computed || isNil(samplingWeight)) {
        const computedSamplingWeight = Math.round(totalWeight * samplingRatioPct) / 100;
        if (samplingWeight !== computedSamplingWeight) {
          sampleForm.patchValue({
            samplingRatioText: `${samplingRatioPct}%`,
            weight: {
              computed: true,
              estimated: false,
              value: computedSamplingWeight,
              methodId: MethodIds.CALCULATED
            }
          }, opts);
        }
        return;
      }
    }

    // Compute total weight using ratio and sample weight
    else if (!samplingRatioComputed && isNotNilOrNaN(samplingRatioPct) && samplingRatioPct <= 100 && samplingRatioPct > 0
      && !sampleBatch.weight.computed && isNotNilOrNaN(samplingWeight) && samplingWeight >= 0) {
      if (batch.weight.computed || isNil(totalWeight)) {
        const computedTotalWeight = Math.round(samplingWeight * (100 / samplingRatioPct) * 100) / 100
        if (totalWeight !== computedTotalWeight) {
          totalWeightControl.patchValue({
            computed: true,
            estimated: false,
            value: computedTotalWeight,
            methodId: MethodIds.CALCULATED
          }, opts);
          sampleForm.patchValue({
            samplingRatioText: `${samplingRatioPct}%`,
            weight: {
              computed: false
            }
          }, opts);
          return;
        }
      }
    }

    // Nothing can be computed: enable all controls
    else {

      // Enable total weight (and remove computed value, if any)
      if (batch.weight.computed) {
        totalWeightControl.patchValue({
          value: null,
          computed: false,
          estimated: false
        }, opts);
      }
      if (totalWeightControl.disabled) totalWeightControl.enable(opts);

      if (sampleForm.enabled) {
        // Clear computed sampling ratio
        if (samplingRatioComputed) {
          samplingRatioTextControl?.patchValue(null, opts);
          samplingRatioControl.patchValue(null, opts);
        }
        // Enable sampling ratio
        if (samplingRatioControl.disabled) samplingRatioControl.enable({ ...opts, emitEvent: true/*force repaint*/ });

        // Enable sampling weight (and remove computed value, if any)
        if (sampleBatch.weight.computed) {
          samplingWeightControl.patchValue({
            value: null,
            computed: false,
            estimated: false
          }, opts);
        }

        // If sampling weight is required
        if (opts && opts.requiredSampleWeight === true) {
          if (!samplingWeightControl.hasError('required')) {
            samplingWeightControl.setErrors({ ...samplingWeightControl.errors, required: true }, opts);
          }
        }

        // If sampling weight is NOT required
        else {
          samplingWeightControl.setErrors(null, opts);
        }
        if (!samplingWeightControl.enabled) {
          samplingWeightControl.enable(opts);
        }

      }
      // Disable sampling fields
      else {
        if (samplingRatioControl.enabled) samplingRatioControl.disable({ ...opts, emitEvent: true/*force repaint*/ });
        if (samplingWeightControl.enabled) samplingWeightControl.disable(opts);
      }
    }
  }

  /**
   * Converting length into a weight
   * @param form
   * @param opts
   */
  private static computeWeightLengthConversion(form: FormGroup, opts?: {
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
    // Length
    lengthPath?: string;
    lengthPmfmId?: number;
  }) : ValidationErrors | null {

    const weightPath = opts?.weightPath || 'weight';
    const lengthPath = opts?.lengthPath || toNumber(opts?.lengthPmfmId, PmfmIds.LENGTH_TOTAL_CM).toString();

    let weightControl = form.get(weightPath);
    const lengthControl = form.get(lengthPath);

    if (!lengthControl) throw Error(`Cannot resolve control with path: '${lengthPath}'`);

    // Create weight control - should not occur ??
    if (!weightControl) {
      console.warn('Creating missing weight control - Please add it to the validator instead')
      const weightValidators = opts?.requiredWeight ? Validators.required : undefined;
      weightControl = new FormControl(null, weightValidators);
      form.addControl(weightPath, weightControl);
    }

    if (weightControl.disabled) weightControl.enable(opts);
    if (lengthControl.disabled) lengthControl.enable(opts);

    const length = lengthControl.value;
    const weight = weightControl.value;
    // DEBUG
    console.debug('[batch-validator] Start computing weight from length: ', [length]);


    // Compute weight, using length
    if (!weight.computed && isNotNilOrNaN(length) && length > 0) {

      // TODO
      const computedWeight = length * 20 ;

      if (weight.value !== computedWeight) {
        weightControl.patchValue({
          value: computedWeight,
          computed: true,
          estimated: false
        }, opts);
      }
    }

    return null;
  }

  /**
   * Converting length into a weight
   * @param form
   * @param opts
   */
  private static computeRoundWeightConversion(form: FormGroup, opts?: {
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
  }) : ValidationErrors | null {

    const weightPath = opts?.weightPath || 'weight';

    let weightControl = form.get(weightPath);

    // Create weight control - should not occur ??
    if (!weightControl) {
      console.warn('Creating missing weight control - Please add it to the validator instead')
      const weightValidators = opts?.requiredWeight ? Validators.required : undefined;
      weightControl = new FormControl(null, weightValidators);
      form.addControl(weightPath, weightControl);
    }

    if (weightControl.disabled) weightControl.enable(opts);

    const weight = weightControl.value;
    // DEBUG
    console.debug('[batch-validator] Start computing round weight: ');

    // TODO

    return null;
  }
}
