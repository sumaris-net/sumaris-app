import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppValidatorService, SharedValidators } from '@sumaris-net/ngx-components';
import { RoundWeightConversion } from '@app/referential/round-weight-conversion/round-weight-conversion.model';

@Injectable({providedIn: 'root'})
export class RoundWeightConversionValidatorService extends AppValidatorService<RoundWeightConversion> {

  constructor(
    protected formBuilder: FormBuilder
  ) {
    super(formBuilder);
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: RoundWeightConversion, opts?: {}): { [p: string]: any } {
    return {
      id: [data && data.id || null],
      startDate: [data?.startDate || null, Validators.compose([Validators.required, SharedValidators.validDate])],
      endDate: [data?.endDate || null, SharedValidators.validDate],
      conversionCoefficient: [data?.conversionCoefficient || null, Validators.compose([Validators.required, Validators.min(0)])],
      taxonGroupId: [data?.taxonGroupId || null],
      location: [data?.location || null, Validators.compose([Validators.required, SharedValidators.entity])],
      dressing: [data?.dressing || null, Validators.compose([Validators.required, SharedValidators.entity])],
      preserving: [data?.preserving || null, Validators.compose([Validators.required, SharedValidators.entity])],
      description: [data?.description || null],
      comments: [data?.comments || null],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      statusId: [data?.statusId || null, Validators.required]
    };
  }

}
