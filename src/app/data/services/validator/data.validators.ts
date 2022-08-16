// @dynamic
import { ValidatorFn } from '@angular/forms';
import { isNotNil } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';

export class DataValidators {

  static excludeQualityFlag(qualityFlagIds: number|number[], msg?: any): ValidatorFn {
    const excludedIds = Array.isArray(qualityFlagIds) ? qualityFlagIds : [qualityFlagIds];
    return (control) => {
      const qualityFlagId = (control.value as DataEntity<any>)?.qualityFlagId;
      if (isNotNil(qualityFlagId) && excludedIds.includes(qualityFlagId)) {
        if (msg) return {msg: msg};
        return {excludeQualityFlag: true}
      }
      return null;
    };
  }
}
