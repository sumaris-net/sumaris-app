import { Injectable } from '@angular/core';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { AppValidatorService, SharedValidators } from '@sumaris-net/ngx-components';
import { WeightLengthConversion } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.model';

@Injectable({ providedIn: 'root' })
export class WeightLengthConversionValidatorService extends AppValidatorService<WeightLengthConversion> {
  constructor() {
    super();
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: WeightLengthConversion, opts?: {}): { [p: string]: any } {
    return {
      id: [(data && data.id) || null],
      year: [data?.year || null, Validators.compose([Validators.required, Validators.min(1970)])],
      startMonth: [data?.startMonth || null, Validators.compose([Validators.required, Validators.min(1), Validators.max(12)])],
      endMonth: [data?.endMonth || null, Validators.compose([Validators.required, Validators.min(1), Validators.max(12)])],
      conversionCoefficientA: [data?.conversionCoefficientA || null, Validators.compose([Validators.required, Validators.min(0)])],
      conversionCoefficientB: [data?.conversionCoefficientB || null, Validators.compose([Validators.required, Validators.min(0)])],
      referenceTaxonId: [data?.referenceTaxonId || null],
      location: [data?.location || null, Validators.compose([Validators.required, SharedValidators.entity])],
      sex: [data?.sex || null, Validators.compose([Validators.required, SharedValidators.entity])],
      lengthParameter: [data?.lengthParameter || null, Validators.compose([Validators.required, SharedValidators.entity])],
      lengthUnit: [data?.lengthUnit || null, Validators.compose([Validators.required, SharedValidators.entity])],
      description: [data?.description || null],
      comments: [data?.comments || null],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      statusId: [data?.statusId || null, Validators.required],
    };
  }
}
