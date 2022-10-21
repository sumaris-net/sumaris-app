// @dynamic
import { FormGroup, ValidatorFn } from '@angular/forms';
import { AppFormUtils, isNotNil } from '@sumaris-net/ngx-components';
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

  static resetCalculatedFlag(fieldName: string, fieldNamesToReset: string[]): ValidatorFn {
    return (group: FormGroup): null => {
      const control = group.get(fieldName);
      const calculatedFieldName = fieldName + AppFormUtils.calculatedSuffix;
      const calculatedControl = group.get(calculatedFieldName);
      if (!control || !calculatedControl) throw new Error(`Unable to find field '${fieldName}' or '${calculatedFieldName}' to check!`);

      if (control.dirty) {
        // Reset calculated flag=false on control
        calculatedControl.setValue(false, {onlySelf: true});
        control.markAsPristine();

        // Get other controls
        const controls = fieldNamesToReset.map((fieldName) => group.get(fieldName));
        const calculatedFieldNamesToReset = fieldNamesToReset.map((fieldName) => fieldName + AppFormUtils.calculatedSuffix);
        const calculatedControls = calculatedFieldNamesToReset.map((fieldName) => group.get(fieldName));
        if (controls.some((control) => control === undefined) || calculatedControls.some((control) => control === undefined)) {
          throw new Error(`Unable to find some fields '${fieldNamesToReset}' or '${calculatedFieldNamesToReset}' to reset!`);
        }
        // Reset calculated flag=true on controls
        calculatedControls.forEach(calculatedControl => calculatedControl.setValue(true, {onlySelf: true}));
        controls.forEach((controlToReset) => controlToReset.markAsPristine());
      }
      return null;
    };
  }

}
