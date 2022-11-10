import { Injectable } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  EntityUtils,
  FormArrayHelper,
  isNil, isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
  LocalSettingsService,
  SharedAsyncValidators,
  SharedValidators,
  toBoolean,
  toFloat,
  toNumber
} from '@sumaris-net/ngx-components';
import { Batch, BatchWeight } from './batch.model';
import { MethodIds } from '@app/referential/services/model/model.enum';
import { Subscription } from 'rxjs';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { roundHalfUp } from '@app/shared/functions';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import {MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils} from '@app/trip/services/model/measurement.model';
import { debounceTime } from 'rxjs/operators';

export interface BatchValidatorOptions extends DataEntityValidatorOptions {
  withWeight?: boolean;
  withChildrenWeight?: boolean;
  weightRequired?: boolean;
  rankOrderRequired?: boolean;
  labelRequired?: boolean;
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  pmfms?: IPmfm[];

  // Children
  withChildren?: boolean;
  childrenPmfms?: IPmfm[];
  qvPmfm?: IPmfm;
}

@Injectable()
export class BatchValidatorService<
  T extends Batch<T> = Batch,
  O extends BatchValidatorOptions = BatchValidatorOptions
  > extends DataEntityValidatorService<T, O> {


  pmfms: IPmfm[];
  childrenPmfms: IPmfm[];
  enableSamplingBatch: boolean = true;

  constructor(
    formBuilder: UntypedFormBuilder,
    protected measurementsValidatorService: MeasurementsValidatorService,
    settings?: LocalSettingsService
  ) {
    super(formBuilder, settings);
  }

  getFormGroupConfig(data?: T, opts?: O): { [key: string]: any } {
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
      samplingRatioComputed: [isNotNil(data?.samplingRatioComputed) ? data.samplingRatioComputed : BatchUtils.isSamplingRatioComputed(data?.samplingRatioText)],
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
      qualityFlagId: [toNumber(data && data.qualityFlagId, 0)],
      // TODO: add operationId, saleId, parentId
    };
  }

  getFormGroup(data?: T, opts?: O): UntypedFormGroup {
    const form = super.getFormGroup(data, opts);

    // there is a second level of children only if there is qvPmfm and sampling batch columns
    if (opts?.withChildren) {
      if (isNotEmptyArray(data?.children)) {
        console.warn('[batch-validator] Creating validator for children batches - TODO: code review');
        const formChildrenHelper = this.getChildrenFormHelper(form, {
          withChildren: opts.withChildren,
          withChildrenWeight: opts.withChildrenWeight,
          childrenPmfms: opts.childrenPmfms
        });
        formChildrenHelper.patchValue(data.children.filter(BatchUtils.isSortingBatch) as T[]);
      }
      else {
        const formChildrenHelper = this.getChildrenFormHelper(form, {
          withChildren: !!opts.qvPmfm && this.enableSamplingBatch,
          withChildrenWeight: true,
          childrenPmfms: !!opts.qvPmfm && opts.childrenPmfms || null
        });
        formChildrenHelper.resize(opts.qvPmfm?.qualitativeValues?.length || 1);
      }
    }

    if (opts?.withWeight || opts?.withChildrenWeight) {
      const weightPmfms = opts.childrenPmfms?.filter(PmfmUtils.isWeight);

      // Add weight sub form
      if (opts?.withWeight) {
        form.addControl('weight', this.getWeightFormGroup(data?.weight, {
            required: opts?.weightRequired,
            pmfm: BatchUtils.getWeightPmfm(data?.weight, weightPmfms)
          })
        );
      }

      // Add weight sub form
      if (opts?.withChildrenWeight) {
        form.addControl('childrenWeight', this.getWeightFormGroup(data?.childrenWeight, {
          required: false,
          pmfm: BatchUtils.getWeightPmfm(data?.childrenWeight, weightPmfms),
          noValidator: true
        }));
      }
    }

    // Add measurement values
    if (opts?.withMeasurements && isNotEmptyArray(opts.childrenPmfms)) {
      const measControl = this.getMeasurementValuesForm(data?.measurementValues, {
        pmfms: opts.childrenPmfms,
        forceOptional: opts.isOnFieldMode,
        withTypename: opts.withMeasurementTypename
      });
      if (form.contains('measurementValues')) form.setControl('measurementValues', measControl)
      else form.addControl('measurementValues', measControl);
    }

    return form;
  }

  protected getWeightFormGroup(data?: BatchWeight, opts?: {
    required?: boolean;
    maxDecimals?: number;
    pmfm?: IPmfm;
    noValidator?: boolean;
  }): UntypedFormGroup {
    return this.formBuilder.group(BatchWeightValidator.getFormGroupConfig(data, opts));
  }

  protected getMeasurementValuesForm(data: undefined|MeasurementFormValues|MeasurementModelValues, opts: {pmfms: IPmfm[]; forceOptional?: boolean, withTypename?: boolean}) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
  }

  protected getChildrenFormHelper(form: UntypedFormGroup, opts?: {
    withChildren: boolean;
    withChildrenWeight: boolean;
    childrenPmfms?: IPmfm[]
  }): FormArrayHelper<T> {
    let arrayControl = form.get('children') as UntypedFormArray;
    if (!arrayControl) {
      arrayControl = this.formBuilder.array([]);
      form.addControl('children', arrayControl);
    }
    return new FormArrayHelper<T>(
      arrayControl,
      (value) => this.getFormGroup(value, <O>{withWeight: true, qvPmfm: undefined, withMeasurements: true, childrenPmfms: this.childrenPmfms, ...opts}),
      (v1, v2) => EntityUtils.equals(v1, v2, 'label'),
      (value) => isNil(value),
      {allowEmptyArray: true, helperProperty: true}
    );
  }

  enableSamplingRatioAndWeight(form: UntypedFormGroup, opts?: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    markForCheck?: () => void;
    debounceTime?: number;
  }): Subscription {
    // return SharedAsyncValidators.registerAsyncValidator(form,
    //   BatchValidators.samplingRatioAndWeight(opts),
    //   {markForCheck: opts?.markForCheck, debounceTime: opts?.debounceTime}
    // );

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
    noValidator?: boolean;
  }): {[key: string]: any} {
    const maxDecimals = toNumber(opts?.pmfm && opts.pmfm?.maximumNumberDecimals, opts?.maxDecimals || 3);
    const required = toBoolean(opts?.required, toBoolean(opts?.pmfm && opts.pmfm?.required, false));

    const validator = opts?.noValidator === true ? null : (required
      ? Validators.compose([Validators.required, SharedValidators.decimal({maxDecimals})])
      : SharedValidators.decimal({maxDecimals}));
    return {
      methodId: [toNumber(data?.methodId, null), SharedValidators.integer],
      estimated: [toBoolean(data?.estimated, null)],
      computed: [toBoolean(data?.computed, null)],
      value: [toNumber(data?.value, null), validator]
    };
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

  static computeSamplingRatioAndWeight(rootForm: UntypedFormGroup, opts?: {
    // Event propagation
    emitEvent?: boolean;
    onlySelf?: boolean;
    // Weight
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    qvIndex?: number;
    // UI function
    //markForCheck?: () => void
  }): ValidationErrors | null {
    if (!opts.samplingRatioFormat) throw Error('[batch-validator] Missing sampling ratio format. Skip computation');

    const basePath = opts && isNotNilOrNaN(opts.qvIndex) ? 'children.' + opts.qvIndex.toString() : '';
    const basePrefix = isNotNilOrBlank(basePath) ? `${basePath}.` : '';
    const form = isNotNilOrBlank(basePath) ? rootForm.get(basePath) : rootForm;

    const samplingFormPath = 'children.0';
    const samplingForm = form.get(samplingFormPath);
    if (!samplingForm) return; // No sample batch: skip


    const totalWeightControl = form.get('weight');
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

    const batch = isNotNilOrBlank(basePath) ? form.get(basePath).value : form.value;
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
