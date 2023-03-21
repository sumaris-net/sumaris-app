import {Subject} from 'rxjs';
import {RootDataEntity} from '@app/data/services/model/root-data-entity.model';

export interface EmitOnSave <E extends RootDataEntity<any>> {
  readonly onSave:Subject<E[]>;
}
