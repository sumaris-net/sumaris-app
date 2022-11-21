import { AppValidatorService, EntitiesTableDataSource, Entity } from '@sumaris-net/ngx-components';
import { AbstractControlOptions, UntypedFormGroup } from '@angular/forms';

export abstract class BaseValidatorService<E extends Entity<E, ID>, ID = number, O = any>
  extends AppValidatorService<E> {

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
}
