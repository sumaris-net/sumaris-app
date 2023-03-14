import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AppValidatorService, BaseReferential, Referential, toNumber } from '@sumaris-net/ngx-components';

@Injectable({providedIn: 'root'})
export class ReferentialValidatorService<T extends BaseReferential<T> = BaseReferential<any>>
  extends AppValidatorService<T> {

  constructor(protected formBuilder: UntypedFormBuilder) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: T, opts?: {
    withDescription?: boolean;
    withComments?: boolean;
  }): UntypedFormGroup {
    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
  }

  getFormGroupConfig(data?: T, opts?: {
    withDescription?: boolean;
    withComments?: boolean;
  }): {[key: string]: any} {
    opts = opts || {};
    const controlsConfig: {[key: string]: any} = {
      id: [data && data.id || null],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      statusId: [toNumber(data?.statusId, null), Validators.required],
      levelId: [toNumber(data?.levelId, null)],
      parentId: [toNumber(data?.parentId, null)],
      label: [data && data.label || null, Validators.required],
      name: [data && data.name || null, Validators.required],
      entityName: [data && data.entityName || null, Validators.required],
      properties: [data && data['properties'] || null]
    };

    if (opts.withDescription !== false) {
      controlsConfig.description = [data && data.description || null, Validators.maxLength(255)];
    }
    if (opts.withComments !== false) {
      controlsConfig.comments = [data && data.comments || null, Validators.maxLength(2000)];
    }
    return controlsConfig;
  }

  getFormGroupOptions(data?: T, opts?: any): AbstractControlOptions | null {
    return null;
  }
}
