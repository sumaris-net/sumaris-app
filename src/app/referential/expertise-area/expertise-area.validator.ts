import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { ExpertiseArea } from '@app/referential/expertise-area/expertise-area.model';

@Injectable({ providedIn: 'root' })
export class ExpertiseAreaValidatorService extends ReferentialValidatorService {
  constructor(protected formBuilder: UntypedFormBuilder) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: ExpertiseArea, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      locations: [data?.locations || null, Validators.required],
      locationLevels: [data?.locationLevels || null, Validators.required],
    };
  }
}
