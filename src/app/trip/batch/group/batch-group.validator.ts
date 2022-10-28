import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BatchValidatorOptions, BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { BatchGroup } from './batch-group.model';
import { LocalSettingsService, SharedAsyncValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { environment } from '@environments/environment';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { debounceTime } from 'rxjs/operators';

export interface BatchGroupValidatorOptions extends BatchValidatorOptions {
}

@Injectable()
export class BatchGroupValidatorService extends BatchValidatorService<BatchGroup, BatchGroupValidatorOptions> {

  qvPmfm: IPmfm;

  constructor(
    formBuilder: UntypedFormBuilder,
    measurementsValidatorService: MeasurementsValidatorService,
    settings: LocalSettingsService
  ) {
    super(formBuilder, measurementsValidatorService, settings);
  }

  getRowValidator(): UntypedFormGroup {
    // The first level of children can be qvPmfm or samplingColumns
    return super.getFormGroup(null, {
      withWeight: true,
      pmfms: this.pmfms,
      // Children
      withChildren: !!this.qvPmfm || this.enableSamplingBatch,
      qvPmfm: this.qvPmfm,
      childrenPmfms: !!this.qvPmfm && this.childrenPmfms || null
    });
  }

  getFormGroup(data?: BatchGroup, opts?: BatchGroupValidatorOptions): UntypedFormGroup {
    return super.getFormGroup(data, {withWeight: true, withChildrenWeight: false, withChildren: true, qvPmfm: this.qvPmfm, ...opts});
  }

  getFormGroupConfig(data?: BatchGroup, opts?: BatchGroupValidatorOptions): { [key: string]: any } {
    const formConfig = super.getFormGroupConfig(data, opts);

    formConfig.observedIndividualCount = [data && data.observedIndividualCount, SharedValidators.integer];

    return formConfig;
  }

  enableSamplingRatioAndWeight(form: UntypedFormGroup, opts?: {
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

    // return SharedAsyncValidators.registerAsyncValidator(form,
    //   BatchGroupValidators.samplingRatioAndWeight({qvPmfm: this.qvPmfm, ...opts}),
    //   {
    //     markForCheck: opts?.markForCheck,
    //     debounceTime: opts?.debounceTime,
    //     debug: !environment.production
    //   });

    const compute = BatchValidators.samplingRatioAndWeight({qvPmfm: this.qvPmfm, ...opts});

    return form.valueChanges
      .pipe(debounceTime(opts?.debounceTime || 0))
      .subscribe(value =>{
        const errors = compute(form);
        if (errors) form.setErrors(errors);
        if (opts?.markForCheck) opts.markForCheck();
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
      return (control) => BatchValidators.computeSamplingRatioAndWeight(control as UntypedFormGroup, {...opts, emitEvent: false, onlySelf: false});
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
          const form = control as UntypedFormGroup;
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
