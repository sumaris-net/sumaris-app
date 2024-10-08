import { Injectable } from '@angular/core';
import { UntypedFormGroup, Validators } from '@angular/forms';
import { SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { ReferentialValidatorService } from '@app/referential/services/validator/referential.validator';
import { TranscribingItem, TranscribingItemType } from '@app/referential/transcribing/transcribing.model';

@Injectable({ providedIn: 'root' })
export class TranscribingItemValidatorService extends ReferentialValidatorService<TranscribingItem> {
  constructor() {
    super();
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
      // Override name as not required
      name: [data?.name || null],
      entityName: [TranscribingItemType.ENTITY_NAME],
    };
  }
}
