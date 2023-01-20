import { Injectable } from '@angular/core';
import { FormGroup, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  AppFormArray,
  EntityUtils, equals,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrNaN,
  LocalSettingsService,
  SharedAsyncValidators,
  SharedValidators,
  toBoolean,
  toFloat,
  toNumber
} from '@sumaris-net/ngx-components';
import { Batch, BatchWeight } from './batch.model';
import { MethodIds, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { Subscription } from 'rxjs';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { roundHalfUp } from '@app/shared/functions';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { debounceTime } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

export function getFormOptions<O>(form: UntypedFormGroup): O|undefined {
  return form['__options'] as O;
}
export function setFormOptions<O>(form: UntypedFormGroup, opts?: O) {
  form['__options'] = opts;
}

export interface BatchValidatorOptions<O extends BatchValidatorOptions<any> = BatchValidatorOptions<any>> extends DataEntityValidatorOptions {
  withWeight?: boolean;
  withChildrenWeight?: boolean;
  weightRequired?: boolean;
  individualCountRequired?: boolean; // false by default
  rankOrderRequired?: boolean; // true by default
  labelRequired?: boolean; // true by default
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  pmfms?: IPmfm[];

  // Children
  withChildren?: boolean;
  childrenCount?: number;
  childrenOptions?: O;
}

@Injectable({providedIn: 'root'})
export class BatchValidatorService<
  T extends Batch<T> = Batch<any>,
  O extends BatchValidatorOptions = BatchValidatorOptions
  > extends DataEntityValidatorService<T, O> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withWeight = toBoolean(opts.withWeight, true);
    opts.withChildrenWeight = toBoolean(opts.withChildrenWeight, false);

    return opts;
  }

  getFormGroupConfig(data?: T, opts?: O): { [key: string]: any } {
    const rankOrder = toNumber(data?.rankOrder, null);
    const label = data?.label || null;
    const samplingRatioComputed = data && (isNotNil(data.samplingRatioComputed) ? data.samplingRatioComputed : BatchUtils.isSamplingRatioComputed(data.samplingRatioText)) || false;
    const config = {
      __typename: [Batch.TYPENAME],
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      rankOrder: opts?.rankOrderRequired !== false ? [rankOrder, Validators.required] : [rankOrder],
      label: opts?.labelRequired !== false ? [label, Validators.required] : [label],
      individualCount: [toNumber(data?.individualCount, null),
        (opts?.individualCountRequired === true)
          ? Validators.compose([Validators.required, Validators.min(0), SharedValidators.integer])
          : Validators.compose([Validators.min(0), SharedValidators.integer])
      ],
      samplingRatio: [toNumber(data?.samplingRatio, null), SharedValidators.decimal()],
      samplingRatioText: [data?.samplingRatioText || null],
      samplingRatioComputed: [samplingRatioComputed],
      taxonGroup: [data?.taxonGroup || null, SharedValidators.entity],
      taxonName: [data?.taxonName || null, SharedValidators.entity],
      comments: [data?.comments || null],
      parent: [data?.parent || null, SharedValidators.entity],
      // Quality properties
      controlDate: [data?.controlDate || null],
      qualificationDate: [data?.qualificationDate || null],
      qualificationComments: [data?.qualificationComments || null],
      qualityFlagId: [toNumber(data?.qualityFlagId, QualityFlagIds.NOT_QUALIFIED)],
      // Sub forms
      measurementValues: this.formBuilder.group({}),
      // TODO: add operationId, saleId, parentId
    };

    // there is a second level of children only if there is qvPmfm and sampling batch columns
    if (opts?.withChildren) {
      const childrenArray = this.getChildrenFormArray(data?.children, opts.childrenOptions);
      if (opts?.childrenCount > 0) {
        childrenArray.resize(opts?.childrenCount);
      }
      config['children'] = childrenArray;
    }
    else {
      config['children'] = this.formBuilder.array([]);
    }

    if (opts?.withWeight || opts?.withChildrenWeight) {

      const weightPmfms = opts.pmfms?.filter(PmfmUtils.isWeight);
      // Add weight sub form
      if (opts.withWeight) {
        config['weight'] = this.getWeightFormGroup(data?.weight, {
            required: opts?.weightRequired,
            pmfm: BatchUtils.getWeightPmfm(data?.weight, weightPmfms)
          });
      }

      // Add weight sub form
      if (opts.withChildrenWeight) {
        config['childrenWeight'] = this.getWeightFormGroup(data?.childrenWeight, {
          required: false,
          pmfm: BatchUtils.getWeightPmfm(data?.childrenWeight, weightPmfms),
          maxDecimals: false // Disable decimals validator
        });
      }
    }

    // Add measurement values
    if (opts?.withMeasurements && isNotEmptyArray(opts.pmfms)) {
      config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
        pmfms: opts.pmfms,
        forceOptional: opts.isOnFieldMode,
        withTypename: opts.withMeasurementTypename
      });
    }

    return config;
  }

  getChildrenFormArray(data?: Batch[], opts?: BatchValidatorOptions): AppFormArray<T, FormGroup> {
    const formArray = new AppFormArray<T, UntypedFormGroup>(
      (value) => this.getFormGroup(value, <O>{withWeight: true, withMeasurements: true, ...opts}),
      (v1, v2) => EntityUtils.equals(v1, v2, 'label'),
      (value) => isNil(value),
      {
        allowEmptyArray: true,
        allowReuseControls: false
      });
    if (data) {
      formArray.patchValue(data);
    }
    return formArray;
  }


  updateFormGroup(form: UntypedFormGroup, opts?: O) {

    opts = this.fillDefaultOptions(opts);

    const weightPmfms = opts.pmfms?.filter(PmfmUtils.isWeight);

    // Individual count
    {
      const individualCountControl = form.get('individualCount');
      if (opts.individualCountRequired === true) {
        individualCountControl.setValidators(Validators.compose([Validators.required, Validators.min(0), SharedValidators.integer]))
      }
      else {
        individualCountControl.setValidators(Validators.compose([Validators.min(0), SharedValidators.integer]));
      }
      individualCountControl.updateValueAndValidity();
    }

    // Weight
    {
      const weightForm = form.get('weight') as FormGroup;
      // Remove if exists, and not need anymore
      if (!opts.withWeight) {
        if (weightForm) {
          weightForm.disable();
          weightForm.setValidators(null);
          form.removeControl('weight');
        }
      }
      else {
        // Add if missing
        if (!weightForm) {
          form.addControl('weight', this.getWeightFormGroup(null, {
            required: opts.weightRequired
          }));
        }
        // Update if already exist
        else {
          this.updateWeightFormGroup(weightForm, {
            required: opts.weightRequired
          });
          if (weightForm.disabled) weightForm.enable();
        }
      }
    }

    // Children weight (=sum of children weight)
    {
      let childrenWeightForm = form.get('childrenWeight');
      if (opts.withChildrenWeight) {
        // Create if need
        if (!childrenWeightForm) {
          form.addControl('childrenWeight', this.getWeightFormGroup(null, {
            required: false,
            pmfm: BatchUtils.getWeightPmfm(null, weightPmfms),
            maxDecimals: false // Disable decimals validator
          }));
        }
      }
      else if (childrenWeightForm) {
        form.removeControl('childrenWeight');
      }
    }
  }

  enableSamplingRatioAndWeight(form: UntypedFormGroup, opts?: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    markForCheck?: () => void;
    debounceTime?: number;
  }): Subscription {

    const compute = BatchValidators.samplingRatioAndWeight(opts);

    return form.valueChanges
      .pipe(debounceTime(opts?.debounceTime || 0))
      .subscribe(value => {
        const errors = compute(form);
        if (errors) form.setErrors(errors);
        if (opts?.markForCheck) opts.markForCheck();
      });
  }

  enableRoundWeightConversion(form: UntypedFormGroup, opts?: {
    requiredWeight?: boolean;
    markForCheck?: () => void;
  }): Subscription {

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.roundWeightConversion(opts),
      {markForCheck: opts?.markForCheck}
    );
  }

  /* -- protected functions -- */

  protected getWeightFormGroup(data?: BatchWeight, opts?: {
    required?: boolean;
    maxDecimals?: number|false;
    pmfm?: IPmfm;
  }): UntypedFormGroup {
    const form = this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
    setFormOptions(form, opts);
    return form;
  }

  protected updateWeightFormGroup(form: UntypedFormGroup, opts?: {
    required?: boolean;
    maxDecimals?: number|false;
    pmfm?: IPmfm;
  }) {
    const previousOptions = getFormOptions(form);
    opts = { ...getFormOptions(form), ...opts}
    if (!equals(previousOptions, opts)) {
      const control = form.get('value');
      control.setValidators(BatchWeightValidator.getValueValidator(opts));
      control.updateValueAndValidity();
      setFormOptions(form, opts);
    }
  }

  protected getMeasurementValuesForm(data: undefined|MeasurementFormValues|MeasurementModelValues, opts: {pmfms: IPmfm[]; forceOptional?: boolean, withTypename?: boolean}) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
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
    maxDecimals?: number|false;
    pmfm?: IPmfm;
  }): {[key: string]: any} {
    const validator = this.getValueValidator(opts);
    return {
      methodId: [toNumber(data?.methodId, null), SharedValidators.integer],
      estimated: [toBoolean(data?.estimated, null)],
      computed: [toBoolean(data?.computed, null)],
      value: [toNumber(data?.value, null), validator]
    };
  }

  /**
   *
   * @param data
   * @param opts Use 'required' or 'maxDecimals'
   */
  static getValueValidator(opts?: {
    required?: boolean;
    maxDecimals?: number|false; // Set false to skip decimals validation
    pmfm?: IPmfm;
  }): ValidatorFn {
    const maxDecimals = toNumber(opts?.pmfm && opts.pmfm?.maximumNumberDecimals, opts?.maxDecimals || 3 /* grams by default */);
    const required = toBoolean(opts?.required, toBoolean(opts?.pmfm && opts.pmfm?.required, false));

    return opts?.maxDecimals === false && !required
      ? null
      : (required
        ? Validators.compose([Validators.required, SharedValidators.decimal({maxDecimals})])
        : SharedValidators.decimal({maxDecimals}));
  }
}

export class BatchValidators {

  /**
   * Computing weight, sampling weight and/or sampling ratio
   * @param opts
   */
  static samplingRatioAndWeight(opts?: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    qvPmfm?: IPmfm
  }): ValidatorFn {

    if (!opts?.qvPmfm) {
      return (control) => BatchValidators.computeSamplingRatioAndWeight(control as UntypedFormGroup, {...opts, emitEvent: false, onlySelf: false});
    }

    return Validators.compose((opts.qvPmfm.qualitativeValues || [])
      .map((qv, qvIndex) => {
        const qvFormPath = `children.${qvIndex}`;
        return (control) => {
          return BatchValidators.computeSamplingRatioAndWeight(control.get(qvFormPath) as UntypedFormGroup,
            {...opts, emitEvent: false, onlySelf: false});
        }
      }));

    return (control) => BatchValidators.computeSamplingRatioAndWeight(control as UntypedFormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  static roundWeightConversion(opts?: {
    // Weight
    requiredWeight?: boolean;
    weightPath?: string;
  }): ValidatorFn {
    return (control) => BatchValidators.computeRoundWeightConversion(control as UntypedFormGroup, {...opts, emitEvent: false, onlySelf: false})
  }

  static computeSamplingRatioAndWeight(form: UntypedFormGroup, opts?: {
    // Event propagation
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    // UI function
    //markForCheck?: () => void
  }): ValidationErrors | null {
    if (!opts.samplingRatioFormat) throw Error('[batch-validator] Missing sampling ratio format. Skip computation');

    const samplingFormPath = 'children.0';
    const samplingForm = form.get(samplingFormPath);
    if (!samplingForm) return; // No sample batch: skip

    const totalWeightControl = form.get('weight');
    if (!totalWeightControl) return; // No weight: skip
    const totalWeightValueControl = totalWeightControl.get('value');

    //const samplingWeightPath = opts?.samplingWeightPath || `${samplingFormPath}.weight`;
    const samplingWeightForm = samplingForm.get('weight');
    const samplingWeightValueControl = samplingWeightForm.get('value');

    //const samplingRatioPath = opts?.samplingRatioPath || `${samplingFormPath}.samplingRatio`;
    const samplingRatioControl = samplingForm.get('samplingRatio');

    const totalWeight = toFloat(totalWeightControl.value?.value);

    if (totalWeightControl.disabled) totalWeightControl.enable(opts);
    if (samplingRatioControl.disabled) samplingRatioControl.enable(opts);
    if (samplingWeightForm.disabled) samplingWeightForm.enable(opts);

    const batch = form.value;
    if (!batch.weight) {
      batch.weight = {
        value: totalWeight || 0,
        computed: false,
        estimated: false
      };
    }
    const isTotalWeightComputed = batch.weight.computed;
    const isTotalWeightValid = !isTotalWeightComputed && isNotNilOrNaN(totalWeight) && totalWeight >= 0;

    let samplingBatch = BatchUtils.getSamplingChild(batch);
    const samplingWeight: BatchWeight = samplingWeightForm?.value || samplingBatch.weight;
    const isSamplingWeightComputed = samplingWeight.computed == true && samplingWeight.methodId !== MethodIds.CALCULATED_WEIGHT_LENGTH_SUM;
    if (!samplingBatch) {
      samplingBatch = samplingForm.value;
      batch.children.push(samplingBatch);
    }
    if (!samplingBatch.weight) {
      samplingBatch.weight = {
        value: toNumber(samplingWeight?.value, 0),
        computed: false,
        estimated: false,
        methodId: toNumber(samplingWeight?.methodId, batch.weight.methodId)
      };
    }
    const isSamplingWeightValid = !isSamplingWeightComputed && isNotNilOrNaN(samplingWeight?.value) && samplingWeight.value >= 0;

    opts.samplingRatioFormat = opts.samplingRatioFormat || BatchUtils.getSamplingRatioFormat(samplingBatch.samplingRatioText);
    if (!opts.samplingRatioFormat) {
      console.warn('[batch-validator] Missing sampling ratio type. Skip computation');
      return;
    }
    const isSamplingRatioComputed = isNotNil(samplingBatch.samplingRatioComputed)
      ? samplingBatch.samplingRatioComputed
      : BatchUtils.isSamplingRatioComputed(samplingBatch.samplingRatioText, opts.samplingRatioFormat);
    const samplingRatio = samplingBatch.samplingRatio;
    const isSamplingRatioValid = !isSamplingRatioComputed && isNotNilOrNaN(samplingRatio) && samplingRatio >= 0 && samplingRatio <= 1;

    // DEBUG
    console.debug(`[batch-validator] Start computing: totalWeight=${totalWeight}, samplingRatio=${samplingRatio}${isSamplingRatioComputed ? ' (computed)' : ''}, samplingWeight=${samplingWeight?.value}`, );

    // ***********
    // samplingRatio = totalWeight/samplingWeight
    // ***********
    if (isTotalWeightValid && isSamplingWeightValid) {

      // If samplingWeight < totalWeight => Error
      if (toNumber(samplingWeight.value) > toNumber(totalWeight)) {
        if (samplingWeightValueControl.errors?.max?.max !== totalWeight) {
          samplingWeightValueControl.markAsPending({ onlySelf: true, emitEvent: true }); //{onlySelf: true, emitEvent: false});
          samplingWeightValueControl.markAsTouched({ onlySelf: true });
          samplingWeightValueControl.setErrors({ ...samplingWeightValueControl.errors, max: { max: totalWeight } }, opts);
        }
        return { max: { max: totalWeight } } as ValidationErrors;
      } else {
        SharedValidators.clearError(samplingWeightValueControl, 'max');
      }

      // Update sampling ratio
      const computedSamplingRatio = (totalWeight === 0 || samplingWeight.value === 0) ? 0 : samplingWeight.value / totalWeight;
      if (samplingRatioControl.value !== computedSamplingRatio || !isSamplingRatioComputed) {
        console.debug('[batch-validator] Applying computed sampling ratio = ' + samplingBatch.samplingRatio);
        samplingForm.patchValue({
          samplingRatio: computedSamplingRatio,
          samplingRatioText: `${samplingWeight.value}/${totalWeight}`,
          samplingRatioComputed: true
        }, opts);
      }
      return;
    }

    // ***********
    // samplingWeight = totalWeight * samplingRatio
    // ***********
    else if (isSamplingRatioValid && isTotalWeightValid) {

      if (isSamplingWeightComputed || isNil(samplingWeight?.value)) {
        const computedSamplingWeight = roundHalfUp(totalWeight * samplingRatio, opts.weightMaxDecimals || 3);
        if (samplingWeight?.value !== computedSamplingWeight) {
          samplingWeightForm.patchValue(<BatchWeight>{
              computed: true,
              estimated: false,
              value: computedSamplingWeight,
              methodId: MethodIds.CALCULATED
            }, opts);
        }
        return;
      }
    }

    // ***********
    // totalWeight = samplingWeight / samplingRatio
    // ***********
    else if (isSamplingRatioValid && isSamplingWeightValid && samplingRatio > 0) {
      if (isTotalWeightComputed || isNil(totalWeight)) {
        const computedTotalWeight = roundHalfUp(samplingWeight.value / samplingRatio, opts.weightMaxDecimals || 3)
        if (totalWeight !== computedTotalWeight) {
          totalWeightControl.patchValue({
            computed: true,
            estimated: false,
            value: computedTotalWeight,
            methodId: MethodIds.CALCULATED
          }, opts);
          samplingWeightForm.patchValue({computed: false}, opts);
          return;
        }
      }
    }
    // ***********
    // Nothing can be computed: enable all controls
    // ***********
    else {

      // Enable total weight (and remove computed value, if any)
      if (isTotalWeightComputed) {
        totalWeightControl.patchValue({
          value: null,
          computed: false,
          estimated: false
        }, opts);

        if (!isTotalWeightValid && !totalWeightValueControl.hasError('required')) {
          totalWeightValueControl.markAsPending({ onlySelf: true, emitEvent: true });
          totalWeightValueControl.markAsTouched({ onlySelf: true });
          totalWeightValueControl.setErrors({ ...totalWeightValueControl.errors, required: true }, opts);
        }
      }
      if (totalWeightControl.disabled) totalWeightControl.enable(opts);

      if (samplingForm.enabled) {
        // Clear computed sampling ratio
        if (isSamplingRatioComputed) {
          samplingForm.patchValue({
            samplingRatio: null,
            samplingRatioText: null
          }, opts);
        }
        // Enable sampling ratio
        if (samplingRatioControl.disabled) samplingRatioControl.enable({ ...opts, emitEvent: true/*force repaint*/ });

        // Enable sampling weight (and remove computed value, if any)
        if (isSamplingWeightComputed) {
          samplingWeightForm.patchValue({
            value: null,
            computed: false,
            estimated: false
          }, opts);
        }

        // If sampling weight is required
        if (!isSamplingWeightValid && opts?.requiredSampleWeight === true) {
          if (!samplingWeightValueControl.hasError('required')) {
            samplingWeightValueControl.setErrors({ ...samplingWeightValueControl.errors, required: true }, opts);
          }
        }
        else {
          SharedValidators.clearError(samplingWeightValueControl, 'required');
        }
        if (samplingWeightForm.disabled) samplingWeightForm.enable(opts);
      }

      // Disable sampling fields
      else {
        if (samplingRatioControl.enabled) samplingRatioControl.disable({ ...opts, emitEvent: true/*force repaint*/ });
        if (samplingWeightForm.enabled) samplingWeightForm.disable(opts);
      }
    }
  }


  /**
   * Converting length into a weight
   * @param form
   * @param opts
   */
  private static computeRoundWeightConversion(form: UntypedFormGroup, opts?: {
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
      weightControl = new UntypedFormControl(null, weightValidators);
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
