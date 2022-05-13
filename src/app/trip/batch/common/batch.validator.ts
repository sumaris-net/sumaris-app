import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  EntityUtils,
  FormArrayHelper,
  isNil, isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LocalSettingsService,
  SharedAsyncValidators,
  SharedValidators,
  toBoolean,
  toFloat,
  toNumber
} from '@sumaris-net/ngx-components';
import { Batch, BatchSamplingRatio, BatchWeight } from './batch.model';
import { MethodIds } from '@app/referential/services/model/model.enum';
import { Subscription } from 'rxjs';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { SamplingRatioType } from '@app/trip/batch/common/batch.form';
import { roundHalfUp } from '@app/shared/functions';

export interface BatchValidatorOptions extends DataEntityValidatorOptions {
  withWeight?: boolean;
  weightRequired?: boolean;
  //withSamplingRatio?: boolean;
  rankOrderRequired?: boolean;
  labelRequired?: boolean;
  withChildren?: boolean;
  withMeasurements?: boolean;
  pmfms?: IPmfm[];
  qvPmfm?: IPmfm;
}

@Injectable({providedIn: 'root'})
export class BatchValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchValidatorOptions = BatchValidatorOptions
  > extends DataEntityValidatorService<T, O> {

  pmfms: IPmfm[];
  showSamplingBatchColumns: boolean = true;

  protected constructor(
    formBuilder: FormBuilder,
    protected measurementsValidatorService: MeasurementsValidatorService,
    settings?: LocalSettingsService
  ) {
    super(formBuilder, settings);
  }

  getFormGroupConfig(data?: T, opts?: {
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
      samplingRatio: [toNumber(data && data.samplingRatio, null), SharedValidators.decimal()],
      samplingRatioText: [data && data.samplingRatioText || null],
      samplingRatioComputed: [isNotNil(data?.samplingRatioComputed) ? data.samplingRatioComputed : BatchUtils.isSamplingRatioComputed(data)],
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

  getFormGroup(data?: T, opts?: O): FormGroup {
    const form = super.getFormGroup(data, opts);

    if (opts && opts.withChildren) {
      // there is a second level of children only if there is qvPmfm and sampling batch columns
      const formChildrenHelper = this.getChildrenFormHelper(form, {withChildren: !!opts.qvPmfm && this.showSamplingBatchColumns});
      formChildrenHelper.resize(opts.qvPmfm?.qualitativeValues?.length || 1);
    }

    // Add weight sub form
    if (opts && opts.withWeight) {
      const weightPmfms = opts.pmfms?.filter(PmfmUtils.isWeight);
      form.addControl('weight', this.getWeightFormGroup(data && data.weight, {
          required: opts?.weightRequired,
          pmfm: BatchUtils.getWeightPmfm(data?.weight, weightPmfms)
        })
      );
    }

    // Add weight sub form
    /*if (opts && opts.withSamplingRatio) {
      form.addControl('samplingRatio', this.getSamplingRatioFormGroup(data && data.samplingRatio, {
          //required: opts?.weightRequired
        })
      );
    }*/

    // Add measurement values
    if (opts && opts.withMeasurements && opts.pmfms) {
      if (form.contains('measurementValues')) form.removeControl('measurementValues')
      form.addControl('measurementValues', this.measurementsValidatorService.getFormGroup(null, {
        pmfms: opts.pmfms,
        forceOptional: true
      }));
    }

    return form;
  }



  protected getWeightFormGroup(data?: BatchWeight, opts?: {
    required?: boolean;
    maxDecimals?: number;
    pmfm?: IPmfm;
  }): FormGroup {
    return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
  }

  protected getSamplingRatioFormGroup(data?: BatchSamplingRatio, opts?: {
    required?: boolean;
    maxDecimals?: number;
  }): FormGroup {
    // DEBUG
    console.debug('[batch-validator] Creating sampling ratio form group...', opts);
    return this.formBuilder.group(BatchSamplingRatioValidator.getFormGroupConfig(data, opts));
  }

  protected getChildrenFormHelper(form: FormGroup, opts?: { withChildren: boolean }): FormArrayHelper<T> {
    let arrayControl = form.get('children') as FormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      form.addControl('children', arrayControl);
    }
    return new FormArrayHelper<T>(
      arrayControl,
      (value) => this.getFormGroup(value, <O>{withWeight: true, qvPmfm: undefined, withMeasurements: true, pmfms: this.pmfms, ...opts}),
      (v1, v2) => EntityUtils.equals(v1, v2, 'label'),
      (value) => isNil(value),
      {allowEmptyArray: true}
    );
  }

  enableSamplingRatioAndWeight(form: FormGroup, opts?: {
    samplingRatioType: SamplingRatioType;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    markForCheck?: () => void;
  }): Subscription {

    // Sampling ratio: should be a percentage
    form.get('samplingRatio')?.setValidators(
      SharedValidators.decimal({maxDecimals: 2})
    );

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.samplingRatioAndWeight(opts),
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

export class BatchWeightValidator {

  /**
   *
   * @param data
   * @param opts Use 'required' or 'maxDecimals'
   */
  static getFormGroupConfig(data?: BatchWeight, opts?: {
    required?: boolean;
    maxDecimals?: number;
    pmfm?: IPmfm;
  }): {[key: string]: any} {
    const maxDecimals = toNumber(opts?.pmfm && opts.pmfm?.maximumNumberDecimals, opts?.maxDecimals || 3);
    const required = toBoolean(opts?.required, toBoolean(opts?.pmfm && opts.pmfm?.required, false));
    const validator = required
      ? Validators.compose([Validators.required, SharedValidators.decimal({maxDecimals})])
      : SharedValidators.decimal({maxDecimals});
    return {
      methodId: [toNumber(data?.methodId, null), SharedValidators.integer],
      estimated: [toBoolean(data?.estimated, null)],
      computed: [toBoolean(data?.computed, null)],
      value: [toNumber(data?.value, null), validator]
    };
  }
}


export class BatchSamplingRatioValidator {

  /**
   *
   * @param data
   * @param opts Use 'required' or 'maxDecimals'
   */
  static getFormGroupConfig(data?: BatchSamplingRatio, opts?: {
    required?: boolean;
    maxDecimals?: number;
  }): {[key: string]: any} {
    const maxDecimals = toNumber(opts?.maxDecimals, 2);
    return {
      value: [toNumber(data?.value, null), opts?.required
          ? Validators.compose([Validators.required, SharedValidators.decimal({maxDecimals})])
          : SharedValidators.decimal({maxDecimals})],
      computed: [toBoolean(data?.computed, null)],
      text: [data?.text || null]
    };
  }
}

export class BatchValidators {

  /**
   * Computing weight, sampling weight and/or sampling ratio
   * @param opts
   */
  static samplingRatioAndWeight(opts?: {
    samplingRatioType: SamplingRatioType;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
  }): ValidatorFn {
    return (control) => BatchValidators.computeSamplingRatioAndWeight(control as FormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  static roundWeightConversion(opts?: {
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
  }): ValidatorFn {
    return (control) => BatchValidators.computeRoundWeightConversion(control as FormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  static computeSamplingRatioAndWeight(form: FormGroup, opts?: {
    // Event propagation
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    samplingRatioType: SamplingRatioType;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    // Control path (used by batch group row validator)
    weightPath?: string;
    samplingWeightPath?: string;
    samplingRatioPath?: string;
    qvIndex?: number;
    // UI function
    //markForCheck?: () => void
  }): ValidationErrors | null {
    if (!opts.samplingRatioType) throw Error('[batch-validator] Missing sampling ratio type. Skip computation');

    const qvSuffix = opts && isNotNilOrNaN(opts.qvIndex) ? 'children.' + opts.qvIndex.toString() : '';
    const sampleFormSuffix = qvSuffix + (qvSuffix ? '.' : '') + 'children.0';

    const samplingForm = form.get(sampleFormSuffix);
    if (!samplingForm) return; // No sample batch: skip

    const weightPath = opts && opts.weightPath || 'weight';
    const samplingWeightPath = opts && opts.samplingWeightPath || sampleFormSuffix + '.' + weightPath;
    const samplingRatioPath = opts && opts.samplingRatioPath || sampleFormSuffix + '.samplingRatio';

    const totalWeightControl = form.get(weightPath);
    const samplingRatioControl = form.get(samplingRatioPath);
    const samplingWeightControl = form.get(samplingWeightPath);
    const samplingWeightValueControl = form.get(samplingWeightPath + ".value");

    const totalWeight = toFloat(totalWeightControl.value?.value);

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

    let samplingBatch = BatchUtils.getSamplingChild(batch);
    const samplingWeight: BatchWeight = samplingWeightControl?.value || samplingBatch.weight;
    const samplingWeightComputed = samplingWeight.computed == true && samplingWeight.methodId !== MethodIds.CALCULATED_WEIGHT_LENGTH_SUM;
    if (!samplingBatch) {
      samplingBatch = samplingForm.value;
      batch.children.push(samplingBatch);
    }
    if (!samplingBatch.weight) {
      samplingBatch.weight = {
        value: samplingWeight?.value || 0,
        computed: false,
        estimated: false,
        methodId: toNumber(samplingWeight?.methodId, batch.weight.methodId)
      };
    }

    opts.samplingRatioType = opts.samplingRatioType || BatchUtils.getSamplingRatioType(samplingBatch);
    if (!opts.samplingRatioType) {
      console.warn('[batch-validator] Missing sampling ratio type. Skip computation');
      return;
    }
    const samplingRatioComputed = isNotNil(samplingBatch.samplingRatioComputed) ? samplingBatch.samplingRatioComputed
      : BatchUtils.isSamplingRatioComputed(samplingBatch, opts.samplingRatioType);
    BatchUtils.normalizedSamplingRatioToModel(samplingBatch, opts.samplingRatioType);
    const samplingRatioValid = !samplingRatioComputed && isNotNilOrNaN(samplingBatch.samplingRatio) && samplingBatch.samplingRatio > 0
      && samplingBatch.samplingRatio <= 1;

    // DEBUG
    console.debug(`[batch-validator] Start computing: totalWeight=${totalWeight}, samplingRatio=${samplingBatch.samplingRatio} (${samplingRatioValid ? 'valid' : 'invalid'}), samplingWeight=${samplingWeight?.value}`, );

    // Compute samplingRatio, using totalWeight/samplingWeight
    if (!batch.weight.computed && isNotNilOrNaN(totalWeight) && totalWeight > 0
      && !samplingWeightComputed && isNotNilOrNaN(samplingWeight?.value) && samplingWeight.value > 0) {

      // Sampling weight must be under total weight
      if (toNumber(samplingWeight?.value) > toNumber(totalWeight)) {
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
      samplingBatch.samplingRatio = samplingWeight.value / totalWeight;
      samplingBatch.samplingRatioText = null; // Force recompute
      samplingBatch.samplingRatioComputed = true;
      BatchUtils.normalizedSamplingRatioToForm(samplingBatch, opts.samplingRatioType);
      if (samplingRatioControl.value !== samplingBatch.samplingRatio) {
        console.debug('[batch-validator] Applying computed sampling ratio = ' + samplingBatch.samplingRatio);
        samplingForm.patchValue({
          samplingRatio: samplingBatch.samplingRatio,
          samplingRatioText: samplingBatch.samplingRatioText,
          samplingRatioComputed: true
        }, opts);
      }
      return;
    }

    // Compute sampling weight, form total weight and ratio
    else if (samplingRatioValid && !batch.weight.computed && isNotNilOrNaN(totalWeight) && totalWeight >= 0) {

      if (samplingWeightComputed || isNil(samplingWeight?.value)) {
        const computedSamplingWeight = roundHalfUp(totalWeight * samplingBatch.samplingRatio, opts.weightMaxDecimals || 3);
        if (samplingWeight?.value !== computedSamplingWeight) {
          samplingForm.patchValue({
            samplingRatioText: null,
            samplingRatioComputed: false,
            weight: <BatchWeight>{
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
    else if (samplingRatioValid && !samplingWeightComputed && isNotNilOrNaN(samplingWeight?.value) && samplingWeight.value >= 0) {
      if (batch.weight.computed || isNil(totalWeight)) {
        const computedTotalWeight = roundHalfUp(samplingWeight.value / samplingBatch.samplingRatio, opts.weightMaxDecimals || 3)
        if (totalWeight !== computedTotalWeight) {
          totalWeightControl.patchValue({
            computed: true,
            estimated: false,
            value: computedTotalWeight,
            methodId: MethodIds.CALCULATED
          }, opts);
          samplingForm.patchValue({
            samplingRatioText: null, //opts.samplingRatioType === '1/w' ? `1/${samplingRatio}` : `${samplingRatio}%`,
            samplingRatioComputed: false,
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

      if (samplingForm.enabled) {
        // Clear computed sampling ratio
        if (samplingRatioComputed) {
          samplingForm.patchValue({
            samplingRatio: null,
            samplingRatioComputed: false,
          }, opts);
        }
        // Enable sampling ratio
        if (samplingRatioControl.disabled) samplingRatioControl.enable({ ...opts, emitEvent: true/*force repaint*/ });

        // Enable sampling weight (and remove computed value, if any)
        if (samplingWeightComputed) {
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

    //const weight = weightControl.value;
    // DEBUG
    console.debug('[batch-validator] Start computing round weight: ');

    // TODO

    return null;
  }
}
