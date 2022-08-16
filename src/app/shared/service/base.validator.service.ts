import { AppValidatorService, EntitiesTableDataSource, Entity } from '@sumaris-net/ngx-components';
import { AbstractControlOptions, FormGroup } from '@angular/forms';

export abstract class BaseValidatorService<E extends Entity<E, ID>, ID = number, O = any> extends AppValidatorService<E> {
  dataSource: EntitiesTableDataSource<any>;

  getRowValidator(data?: E, opts?: O): FormGroup {
    return this.getFormGroup(data, opts);
  }

  getFormGroup(data?: E, opts?: O): FormGroup {
    return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
  }

  getFormGroupConfig(data?: E, opts?: O): { [p: string]: any } {
    return {};
  }

  getFormGroupOptions(data?: E, opts?: O): AbstractControlOptions {
    return {};
  }
}
