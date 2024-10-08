import { Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';

import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from './root-data-entity.validator';
import { DataRootVesselEntity } from '../model/root-vessel-entity.model';

export abstract class DataRootVesselEntityValidatorService<
  T extends DataRootVesselEntity<T>,
  O extends DataRootEntityValidatorOptions = DataRootEntityValidatorOptions,
> extends DataRootEntityValidatorService<T, O> {
  protected constructor() {
    super();
  }

  getFormGroupConfig(
    data?: T,
    opts?: O
  ): {
    [key: string]: any;
  } {
    return Object.assign(super.getFormGroupConfig(data), {
      vesselSnapshot: [(data && data.vesselSnapshot) || null, Validators.compose([Validators.required, SharedValidators.entity])],
    });
  }
}
