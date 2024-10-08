import { Injectable } from '@angular/core';
import { FormArray, FormGroup, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BatchValidatorOptions, BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { BatchGroup } from './batch-group.model';
import { isNotEmptyArray, isNotNil, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { debounceTime } from 'rxjs/operators';

export interface BatchGroupValidatorOptions extends BatchValidatorOptions<BatchGroupValidatorOptions> {
  root?: boolean;
  qvPmfm?: IPmfm;
  childrenPmfms?: IPmfm[];
  enableSamplingBatch?: boolean;
}

@Injectable({ providedIn: 'root' })
export class BatchGroupValidatorService extends BatchValidatorService<BatchGroup, BatchGroupValidatorOptions> {
  constructor() {
    super();
  }

  getFormGroupConfig(data?: BatchGroup, opts?: BatchGroupValidatorOptions): { [key: string]: any } {
    const config = super.getFormGroupConfig(data, opts);

    if (opts?.root) {
      config['observedIndividualCount'] = [toNumber(data?.observedIndividualCount, null), SharedValidators.integer];
    }

    return config;
  }

  enableSamplingRatioAndWeight(
    form: UntypedFormGroup,
    opts?: {
      samplingRatioFormat: SamplingRatioFormat;
      requiredSampleWeight: boolean;
      weightMaxDecimals: number;
      qvPmfm?: IPmfm;
      markForCheck?: () => void;
      debounceTime?: number;
    }
  ): Subscription {
    if (!form) {
      console.warn("Argument 'form' required");
      return null;
    }

    const computeFn = BatchValidators.samplingRatioAndWeight(opts);

    return form.valueChanges.pipe(debounceTime(opts?.debounceTime || 0)).subscribe((value) => {
      const errors = computeFn(form);
      if (errors) form.setErrors(errors);
      if (opts?.markForCheck) opts.markForCheck();
    });
  }

  updateFormGroup(form: UntypedFormGroup, opts?: BatchGroupValidatorOptions) {
    opts = this.fillDefaultOptions(opts);

    if (opts.qvPmfm) {
      const childrenArray = form.get('children') as FormArray;
      childrenArray.controls.forEach((child) => this.updateFormGroup(child as FormGroup, opts.childrenOptions));
    } else {
      super.updateFormGroup(form, opts);
    }
  }

  /* -- protected method -- */

  protected fillDefaultOptions(opts?: BatchGroupValidatorOptions): BatchGroupValidatorOptions {
    opts = opts || <BatchGroupValidatorOptions>{};

    opts.root = toBoolean(opts.root, true);
    if (opts.root) {
      opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : this.settings?.isOnFieldMode() || false;

      const weightRequired = opts.isOnFieldMode === false && opts.weightRequired !== false;
      const individualCountRequired = opts.isOnFieldMode === false && opts.individualCountRequired === true;
      const withChildrenWeight = opts.withChildrenWeight !== false;
      if (opts.qvPmfm) {
        // Disabled weight/individual required validator, on the root level
        opts.individualCountRequired = false;
        opts.weightRequired = false;

        // Disable children (sum) weight here: should be visible in the sample batch, is any
        opts.withChildrenWeight = false;

        // Configure children (on child by QV)
        opts.withChildren = true;
        opts.childrenCount = opts.qvPmfm.qualitativeValues?.length || 1;
        opts.childrenOptions = {
          root: false,
          withWeight: true,
          weightRequired,
          individualCountRequired,
          pmfms: [opts.qvPmfm, ...(opts.childrenPmfms || [])],
          withMeasurements: true,
        };
        opts.childrenOptions.withChildren = opts.enableSamplingBatch;
        if (opts.childrenOptions.withChildren) {
          opts.childrenOptions.childrenCount = 1; // One sampling batch
          opts.childrenOptions.childrenOptions = {
            root: false,
            withWeight: true,
            withMeasurements: false,
            pmfms: null,
            withChildrenWeight,
            // Need for v1 compatibility - sampling batch may not be created
            labelRequired: false,
            rankOrderRequired: false,
          };
        }
      } else {
        opts.withWeight = true;
        opts.withChildren = opts.enableSamplingBatch;
        opts.weightRequired = weightRequired;
        opts.individualCountRequired = individualCountRequired;
        if (opts.withChildren) {
          opts.childrenCount = 1; // One sampling batch
          opts.childrenOptions = {
            root: false,
            withWeight: true,
            withMeasurements: false,
            pmfms: null,
            withChildrenWeight,
            // Need for v1 compatibility - sampling batch may not be created
            labelRequired: false,
            rankOrderRequired: false,
          };
        }
      }

      opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms));
      opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);
    }

    return opts;
  }

  /*
  protected fillDefaultOptions(opts?: BatchGroupValidatorOptions): BatchGroupValidatorOptions {
    return super.fillDefaultOptions(opts);
    //return opts || {}; // Do not apply any defaults here
  }*/
}

export class BatchGroupValidators {
  /**
   * Same as BatchValidators.computeSamplingWeight() but for a batch group form
   *
   * @param opts
   */
  static samplingRatioAndWeight(opts: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    qvPmfm?: IPmfm;
  }): ValidatorFn {
    if (!opts?.qvPmfm) {
      return (control) => BatchValidators.computeSamplingRatioAndWeight(control as UntypedFormGroup, { ...opts, emitEvent: false, onlySelf: false });
    }

    return Validators.compose(
      (opts.qvPmfm.qualitativeValues || []).map((qv, qvIndex) => {
        const qvFormPath = `children.${qvIndex}`;
        return (control) => {
          const form = control as UntypedFormGroup;
          const individualCount = form.get(qvFormPath + '.individualCount');
          const samplingIndividualCount = form.get(qvFormPath + '.children.0.individualCount');

          if (!samplingIndividualCount) return; // Nothing to compute (no sampling batch)

          // Enable controls
          if (individualCount.disabled) individualCount.enable();
          if (samplingIndividualCount.disabled) samplingIndividualCount.enable();

          // Start computation
          return BatchValidators.computeSamplingRatioAndWeight(control.get(qvFormPath), { ...opts, emitEvent: false, onlySelf: false });
        };
      })
    );
  }
}
