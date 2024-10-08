import { Injectable } from '@angular/core';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { Metier } from '@app/referential/metier/metier.model';

@Injectable({ providedIn: 'root' })
export class MetierValidatorService extends ReferentialValidatorService {
  constructor() {
    super();
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
