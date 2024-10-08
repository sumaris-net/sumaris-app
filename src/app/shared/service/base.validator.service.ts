import { AppValidatorService, Entity } from '@sumaris-net/ngx-components';
import { AbstractControlOptions, FormGroup, UntypedFormGroup } from '@angular/forms';

export const FORM_VALIDATOR_OPTIONS_PROPERTY = '__validatorOpts';

export class BaseValidatorService<E extends Entity<E, ID>, ID = number, O = any> extends AppValidatorService<E> {
  static create<E extends Entity<E, ID>, ID = number, O = any>(factory: (data?: E, opts?: O) => UntypedFormGroup): BaseValidatorService<E, ID, O> {
    const target = new BaseValidatorService<E, ID, O>();
    target.getFormGroup = factory;
    return target;
  }

  protected constructor() {
    super();
  }

  getRowValidator(data?: E, opts?: O): UntypedFormGroup {
    return this.getFormGroup(data, opts);
  }

  getFormGroup(data?: E, opts?: O): UntypedFormGroup {
    return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
  }

  getFormGroupConfig(data?: E, opts?: O): { [p: string]: any } {
    return {};
  }

  getFormGroupOptions(data?: E, opts?: O): AbstractControlOptions {
    return {};
  }

  updateFormGroup(form: FormGroup, opts?: O) {}
}

export class ValidatorService<E extends Entity<E, ID>, ID = number, O = any> extends BaseValidatorService<E, ID, O> {
  constructor(createValidatorFn: (data?: E, opts?: O) => UntypedFormGroup) {
    super();
    this.getFormGroup = createValidatorFn;
  }
}
