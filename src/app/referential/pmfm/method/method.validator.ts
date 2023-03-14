import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { toBoolean } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { Method } from '@app/referential/pmfm/method/method.model';

@Injectable({providedIn: 'root'})
export class MethodValidatorService extends ReferentialValidatorService {

  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: Method, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      isCalculated: [toBoolean(data?.isCalculated, null), Validators.required],
      isEstimated: [toBoolean(data?.isEstimated, null), Validators.required]
    };
  }

}
