import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Referential, SharedValidators } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';

@Injectable({providedIn: 'root'})
export class TaxonGroupValidatorService extends ReferentialValidatorService {

  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: Referential, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      parent: [data && data.parentId || null, SharedValidators.entity],
    };
  }

}
