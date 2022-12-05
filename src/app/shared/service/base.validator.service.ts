import { AppValidatorService, EntitiesTableDataSource, Entity } from '@sumaris-net/ngx-components';
import { AbstractControlOptions, FormBuilder, FormGroup, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Injector } from '@angular/core';

export class BaseValidatorService<E extends Entity<E, ID>, ID = number, O = any>
  extends AppValidatorService<E> {

  static create<E extends Entity<E, ID>, ID = number, O = any>(
    injector: Injector,
    factory: (data?: E, opts?: O) => UntypedFormGroup): BaseValidatorService<E, ID, O> {
    const target = new BaseValidatorService<E, ID, O>(injector.get(FormBuilder), injector.get(TranslateService))
    target.getFormGroup = factory;
    return target;
  }

  protected constructor(formBuilder: UntypedFormBuilder,
                        translate: TranslateService) {
    super(formBuilder, translate);
  }

  getRowValidator(data?: E, opts?: O): UntypedFormGroup {
    return this.getFormGroup(data, opts);
  }

  getFormGroup(data?: E, opts?: O): UntypedFormGroup {
    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts));
  }

  getFormGroupConfig(data?: E, opts?: O): { [p: string]: any } {
    return {};
  }

  getFormGroupOptions(data?: E, opts?: O): AbstractControlOptions {
    return {};
  }

  updateFormGroup(form: FormGroup, opts?: O) {

  }
}

export class ValidatorService<E extends Entity<E, ID>, ID = number, O = any>
  extends BaseValidatorService<E, ID, O> {

  constructor(formBuilder: UntypedFormBuilder,
              translate: TranslateService,
              createValidatorFn: (data?: E, opts?: O) => UntypedFormGroup) {
    super(formBuilder, translate);
    this.getFormGroup = createValidatorFn;
  }
}
