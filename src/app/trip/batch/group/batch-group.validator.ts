import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BatchValidatorOptions, BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { BatchGroup } from './batch-group.model';
import { LocalSettingsService, SharedAsyncValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { environment } from '@environments/environment';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';

export interface BatchGroupValidatorOptions extends BatchValidatorOptions {
}

@Injectable()
export class BatchGroupValidatorService extends BatchValidatorService<BatchGroup, BatchGroupValidatorOptions> {

  qvPmfm: IPmfm;

  constructor(
    formBuilder: FormBuilder,
    measurementsValidatorService: MeasurementsValidatorService,
    settings: LocalSettingsService
  ) {
    super(formBuilder, measurementsValidatorService, settings);
  }

  getRowValidator(): FormGroup {
    // The first level of children can be qvPmfm or samplingColumns
    return super.getFormGroup(null, {
      withWeight: true,
      pmfms: this.pmfms,
      // Children
      withChildren: !!this.qvPmfm || this.enableSamplingBatch,
      qvPmfm: this.qvPmfm,
      childrenPmfms: !!this.qvPmfm && this.childrenPmfms
    });
  }

  getFormGroup(data?: BatchGroup, opts?: BatchGroupValidatorOptions): FormGroup {
    return super.getFormGroup(data, {withWeight: true, withChildrenWeight: false, withChildren: true, qvPmfm: this.qvPmfm, ...opts});
  }

  getFormGroupConfig(data?: BatchGroup, opts?: BatchGroupValidatorOptions): { [key: string]: any } {
    const formConfig = super.getFormGroupConfig(data, opts);

    formConfig.observedIndividualCount = [data && data.observedIndividualCount, SharedValidators.integer];

    return formConfig;
  }

  enableSamplingRatioAndWeight(form: FormGroup, opts?: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    qvPmfm?: IPmfm,
    markForCheck?: () => void;
    debounceTime?: number;
  }): Subscription {

    if (!form) {
      console.warn('Argument \'form\' required');
      return null;
    }

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchGroupValidators.samplingRatioAndWeight({qvPmfm: this.qvPmfm, ...opts}),
      {
        markForCheck: opts?.markForCheck,
        debounceTime: opts?.debounceTime,
        debug: !environment.production
      });
  }

  /* -- protected method -- */

  protected fillDefaultOptions(opts?: BatchGroupValidatorOptions): BatchGroupValidatorOptions {
    opts = super.fillDefaultOptions(opts);
    return {withWeight: true, withChildrenWeight: false, withChildren: true, qvPmfm: this.qvPmfm, ...opts};
  }
}


export class BatchGroupValidators {
  /**
   * Same as BatchValidators.computeSamplingWeight() but for a batch group form
   * @param opts
   */
  static samplingRatioAndWeight(opts: {
    samplingRatioFormat: SamplingRatioFormat;
    requiredSampleWeight: boolean;
    weightMaxDecimals: number;
    qvPmfm?: IPmfm;
  }): ValidatorFn {
    if (!opts?.qvPmfm) {
      return (control) => BatchValidators.computeSamplingRatioAndWeight(control as FormGroup, {...opts, emitEvent: false, onlySelf: false});
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
          const individualCount = form.get(qvSuffix + 'individualCount');
          const samplingIndividualCount = form.get(qvSuffix + 'children.0.individualCount');

          if (!samplingIndividualCount) return; // Nothing to compute

          // Enable controls
          if (individualCount.disabled) individualCount.enable();
          if (samplingIndividualCount?.disabled) samplingIndividualCount.enable();

          // Start computation
          return BatchValidators.computeSamplingRatioAndWeight(form, {...qvOpts, emitEvent: false, onlySelf: false});
        }
      }));
  }
}
