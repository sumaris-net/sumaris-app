import { Injectable } from '@angular/core';
import { AbstractControlOptions, Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { Sample } from './sample.model';
import { SampleValidatorOptions, SampleValidatorService } from '@app/trip/sample/sample.validator';

export interface SubSampleValidatorOptions extends SampleValidatorOptions {
  withParent?: boolean;
  requiredParent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SubSampleValidatorService extends SampleValidatorService<SubSampleValidatorOptions> {
  constructor() {
    super();
  }

  getFormGroupConfig(data?: any, opts?: SubSampleValidatorOptions): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, {
      withChildren: false, // Tree depth = 1 (by default)
      ...opts,
    });

    // Change label and samples to optional
    config['label'] = [(data && data.label) || null];
    config['sampleDate'] = [(data && data.sampleDate) || null];

    // Add parent control (required by default)
    if (!opts || opts.withParent !== false) {
      const parentValidators =
        !opts || opts.requiredParent !== false ? Validators.compose([SharedValidators.object, Validators.required]) : SharedValidators.object;
      config['parent'] = [(data && data.parent) || null, parentValidators];
    }

    return config;
  }

  getFormGroupOptions(data?: Sample, opts?: SubSampleValidatorOptions): AbstractControlOptions | null {
    return {
      validators: [], // remove required validator on taxonGroup/taxonName
    };
  }
}
