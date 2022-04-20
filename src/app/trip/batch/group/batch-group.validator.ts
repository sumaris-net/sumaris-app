import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BatchValidatorOptions, BatchValidators, BatchValidatorService } from '../common/batch.validator';
import { BatchGroup } from './batch-group.model';
import { LocalSettingsService, SharedAsyncValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { environment } from '@environments/environment';

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
    return super.getFormGroup(null, {withWeight: true, withChildren: !!this.qvPmfm || this.showSamplingBatchColumns, qvPmfm: this.qvPmfm, pmfms:this.pmfms});
  }

  getFormGroup(data?: BatchGroup, opts?: BatchGroupValidatorOptions): FormGroup {
    return super.getFormGroup(data, {withWeight: true, withChildren: true, qvPmfm: this.qvPmfm, ...opts});
  }

  getFormGroupConfig(data?: BatchGroup, opts?: BatchGroupValidatorOptions): { [key: string]: any } {
    const config = super.getFormGroupConfig(data, opts);

    config.observedIndividualCount = [data && data.observedIndividualCount, SharedValidators.integer];

    return config;
  }

  addSamplingFormRowValidator(form: FormGroup, opts?: {
    requiredSampleWeight?: boolean;
    qvPmfm?: IPmfm,
    markForCheck?: () => void;
  }): Subscription {

    if (!form) {
      console.warn('Argument \'form\' required');
      return null;
    }

    return SharedAsyncValidators.registerAsyncValidator(form,
      BatchValidators.samplingWeightRowComputation({qvPmfm: this.qvPmfm, ...opts}),
      {
        markForCheck: opts?.markForCheck,
        debug: !environment.production
      });
  }

  /* -- protected method -- */


  protected fillDefaultOptions(opts?: BatchGroupValidatorOptions): BatchGroupValidatorOptions {
    opts = super.fillDefaultOptions(opts);
    return {withWeight: true, withChildren: true, qvPmfm: this.qvPmfm, ...opts};
  }
}
