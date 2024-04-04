import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { ValidatorService } from '@e-is/ngx-material-table';
import { SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { ProgramPerson } from '@app/referential/services/model/program.model';

@Injectable({ providedIn: 'root' })
export class ProgramPersonValidatorService implements ValidatorService {
  constructor(protected formBuilder: UntypedFormBuilder) {}

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: ProgramPerson): UntypedFormGroup {
    return this.formBuilder.group({
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      programId: [toNumber(data?.programId, null)],
      person: [data?.person || null, Validators.compose([Validators.required, SharedValidators.entity])],
      privilege: [data?.privilege || null, Validators.compose([Validators.required, SharedValidators.entity])],
      location: [data?.location || null, SharedValidators.entity],
      referencePerson: [data?.referencePerson || null, SharedValidators.entity],
    });
  }
}
