import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControlOptions, UntypedFormArray, UntypedFormBuilder, FormGroup, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { TranslateService } from '@ngx-translate/core';


export interface PhysicalGearValidatorOptions extends DataRootEntityValidatorOptions {
  withChildren?: boolean;
}

@Injectable({providedIn: 'root'})
export class PhysicalGearValidatorService
  extends DataRootEntityValidatorService<PhysicalGear, PhysicalGearValidatorOptions>
  implements ValidatorService {

  constructor(formBuilder: UntypedFormBuilder,
              translate: TranslateService,
              settings?: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: PhysicalGear, opts?: PhysicalGearValidatorOptions): { [key: string]: any } {
    const config = {
      ...super.getFormGroupConfig(data, opts),
      __typename: [PhysicalGear.TYPENAME],
      rankOrder: [toNumber(data?.rankOrder, null), Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])],
      gear: [data?.gear || null, Validators.compose([Validators.required, SharedValidators.entity])],
      measurementValues: this.formBuilder.group({}),
    };

    // Change program is optional
    config['program'] = [data?.program || null];

    if (!opts || opts.withChildren !== false) {
      config['children'] = this.getChildrenArray(data?.children, opts);
    }

    return config;
  }

  getFormGroupOptions(data?: PhysicalGear, opts?: PhysicalGearValidatorOptions): AbstractControlOptions | null {
    return null;
  }

  getChildrenArray(data?: PhysicalGear[], opts?: PhysicalGearValidatorOptions): UntypedFormArray {
    return this.formBuilder.array(
      (data || []).map(child => this.getFormGroup(child, {...opts, withChildren: false /*Allow only one level*/}))
    );
  }
}
