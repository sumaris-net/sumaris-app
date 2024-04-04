import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { Method } from '@app/referential/pmfm/method/method.model';
import { Metier } from '@app/referential/metier/metier.model';

@Injectable({ providedIn: 'root' })
export class MetierValidatorService extends ReferentialValidatorService {
  constructor(protected formBuilder: UntypedFormBuilder) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: Metier, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      gear: [data?.gear, Validators.compose([Validators.required, SharedValidators.entity])],
      taxonGroup: [data?.taxonGroup, SharedValidators.entity],
    };
  }
}
