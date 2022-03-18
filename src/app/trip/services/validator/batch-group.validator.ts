import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BatchValidators, BatchValidatorService } from './batch.validator';
import { BatchGroup } from '../model/batch-group.model';
import { SharedAsyncValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Subscription } from 'rxjs';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';
import { environment } from '@environments/environment';

@Injectable({providedIn: 'root'})
export class BatchGroupValidatorService extends BatchValidatorService<BatchGroup> {

  qvPmfm: IPmfm;

  constructor(
    protected measurementsValidatorService: MeasurementsValidatorService,
    formBuilder: FormBuilder) {
    super(measurementsValidatorService, formBuilder);
  }

  getRowValidator(): FormGroup {
    // The first level of children can be qvPmfm or samplingColumns
    return super.getFormGroup(null, {withWeight: true, withChildren: !!this.qvPmfm || this.showSamplingBatchColumns, qvPmfm: this.qvPmfm, pmfms:this.pmfms});
  }

  getFormGroup(data?: BatchGroup, opts?: {
    withWeight?: boolean;
    rankOrderRequired?: boolean;
    labelRequired?: boolean;
  }): FormGroup {
    return super.getFormGroup(data, {withWeight: true, withChildren: true, qvPmfm: this.qvPmfm, ...opts});
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

  protected getFormGroupConfig(data?: BatchGroup, opts?: {
    withWeight?: boolean;
    rankOrderRequired?: boolean;
    labelRequired?: boolean;
  }): { [key: string]: any } {
    const config = super.getFormGroupConfig(data, opts);

    config.observedIndividualCount = [data && data.observedIndividualCount, SharedValidators.integer];

    return config;
  }
}
