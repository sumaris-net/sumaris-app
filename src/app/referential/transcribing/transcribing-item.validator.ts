import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Referential, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { TranscribingItem } from '@app/referential/transcribing/transcribing.model';

@Injectable({providedIn: 'root'})
export class TranscribingItemValidatorService extends ReferentialValidatorService<TranscribingItem> {

  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: TranscribingItem, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      objectId: [toNumber(data?.objectId, null), Validators.compose([SharedValidators.integer, Validators.min(0)])],
      object: [data?.object || null, SharedValidators.entity],
      type: [data?.type || null, SharedValidators.entity],
    };
  }

}
