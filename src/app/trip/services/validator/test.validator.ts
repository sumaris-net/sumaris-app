import {Injectable} from "@angular/core";
import {
  DataEntityValidatorOptions,
  DataEntityValidatorService
} from "../../../data/services/validator/data-entity.validator";

import {SharedFormArrayValidators} from "../../../shared/validator/validators";


import {FormBuilder, FormGroup, ValidatorFn, Validators} from "@angular/forms";
import {toBoolean} from "../../../shared/functions";
import {SharedFormGroupValidators, SharedValidators} from "../../../shared/validator/validators";
import {LocalSettingsService} from "../../../core/services/local-settings.service";
import { Test } from '../model/test.model';

export interface TestValidatorOptions extends DataEntityValidatorOptions {
  required?: boolean
}

@Injectable()
export class TestValidatorService<O extends TestValidatorOptions = TestValidatorOptions>
  extends DataEntityValidatorService<Test, TestValidatorOptions> {

  constructor(
    protected formBuilder: FormBuilder,
    protected settings: LocalSettingsService) {
    super(formBuilder, settings);
  }

  getFormGroupConfig(data?: Test, opts?: TestValidatorOptions): { [p: string]: any } {
    // TODO : implémenter le contrôle ici
    const formConfig = Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [Test.TYPENAME],
        comment: [data && data.comment || null,Validators.required],
        startDate: [data && data.startDate || null, Validators.required],
        endDate: [data && data.endDate || null, Validators.required],
        metier: [data && data.metier || null, Validators.compose([Validators.required, SharedValidators.entity])],
      });


    return formConfig;

  }

 
  getFormGroupOptions(data?: Test, opts?: O): { [key: string]: any } {
    /*return {
      validator: Validators.compose([
        SharedFormGroupValidators.dateMinDuration('startDate', 'startDate', 1, 'hours'),
        SharedFormGroupValidators.dateMaxDuration('endDate', 'endDate', 100, 'days'),
        SharedFormGroupValidators.dateMaxDuration('comment', 'endDate', 100, 'days')

      ])
    };*/
    return null;
  }

  updateFormGroup(formGroup: FormGroup, opts?: TestValidatorOptions) {
    opts = this.fillDefaultOptions(opts);

    formGroup.get('comment').setValidators(opts.isOnFieldMode ? null : Validators.required);
    formGroup.get('startDate').setValidators(opts.isOnFieldMode ? null : Validators.required);
    formGroup.get('endDate').setValidators(opts.isOnFieldMode ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity]));
    return formGroup;
  }




}
