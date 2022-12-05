import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BatchValidatorOptions, BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { BatchGroup } from './batch-group.model';
import { AppFormUtils, isNotEmptyArray, isNotNil, LocalSettingsService, SharedAsyncValidators, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { environment } from '@environments/environment';
import { SamplingRatioFormat } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
import { debounceTime } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

export interface BatchGroupValidatorOptions extends BatchValidatorOptions<BatchGroupValidatorOptions> {
  root?: boolean;
  qvPmfm?: IPmfm;
  childrenPmfms?: IPmfm[];
  enableSamplingBatch?: boolean;
}

@Injectable({providedIn: 'root'})
export class BatchGroupValidatorService extends
  BatchValidatorService<BatchGroup, BatchGroupValidatorOptions> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings, measurementsValidatorService);
  }

  getFormGroupConfig(data?: BatchGroup, opts?: BatchGroupValidatorOptions): { [key: string]: any } {
    const config = super.getFormGroupConfig(data, opts);

    if (opts?.root) {
      config['observedIndividualCount'] = [data && data.observedIndividualCount, SharedValidators.integer];
    }

    return config;
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

    const compute = BatchValidators.samplingRatioAndWeight(opts);

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
    opts = opts || <BatchGroupValidatorOptions>{};

    opts.root = toBoolean(opts.root, true);
    if (opts.root) {

      opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : (this.settings?.isOnFieldMode() || false);

      if (opts.qvPmfm) {
        opts.withChildren = true;
        opts.childrenCount = opts.qvPmfm.qualitativeValues?.length || 1;
        opts.childrenOptions = {
          root: false,
          withWeight: true,
          pmfms: opts.childrenPmfms,
          withMeasurements: isNotEmptyArray(opts.childrenPmfms)
        };
        opts.childrenOptions.withChildren = opts.enableSamplingBatch;
        if (opts.childrenOptions.withChildren) {
          opts.childrenOptions.childrenCount = 1;
          opts.childrenOptions.childrenOptions = {
            root: false,
            withWeight: true,
            withMeasurements: false
          };
        }
      }
      else {
        opts.withWeight = true;
        opts.withChildren = opts.enableSamplingBatch;
        if (opts.withChildren) {
          opts.childrenOptions.childrenCount = 1;
          opts.childrenOptions = {
            root: false,
            withWeight: true,
            pmfms: null,
            withMeasurements: false
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
