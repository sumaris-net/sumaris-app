import {Injectable} from "@angular/core";
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import {ValidatorService} from "@e-is/ngx-material-table";
import {ExtractionFilterCriterion, ExtractionType} from "../type/extraction-type.model";
import { AppFormArray, arrayDistinct, isNilOrBlank, isNotEmptyArray, isNotNil, toBoolean } from '@sumaris-net/ngx-components';
import { DEFAULT_CRITERION_OPERATOR } from '@app/extraction/common/extraction.utils';

@Injectable()
export class ExtractionCriteriaValidatorService implements ValidatorService {

  constructor(
    protected formBuilder: UntypedFormBuilder) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: ExtractionFilterCriterion[]): UntypedFormGroup {
    const config = {};

    const sheetNames = data && arrayDistinct(data
      .map(criterion => criterion.sheetName)
      .filter(isNotNil));
    if (isNotEmptyArray(sheetNames)) {
      sheetNames.forEach(sheetName => {
        const criteria = data.filter(criterion => criterion.sheetName === sheetName);
        config[sheetName] = this.getCriterionFormArray(criteria, sheetName);
      });
    }

    return this.formBuilder.group(config);
  }

  getCriterionFormArray(data?: ExtractionFilterCriterion[], sheetName?: string) {
    const formArray = new AppFormArray(
      criterion => this.getCriterionFormGroup(criterion, sheetName),
      ExtractionFilterCriterion.equals,
      ExtractionFilterCriterion.isEmpty
    )
    if (isNotEmptyArray(data)) {
      formArray.patchValue(data);
    }
    return formArray;
  }

  getCriterionFormGroup(data?: ExtractionFilterCriterion, sheetName?: string) {
    let value = data?.value || null;
    // Is many values, concat values to fill the value control
    if (isNilOrBlank(value) && isNotEmptyArray(data?.values)) {
      value = data.values.join(',');
    }
    return this.formBuilder.group({
      name: [data && data.name || null],
      operator: [data && data.operator || DEFAULT_CRITERION_OPERATOR, Validators.required],
      value: [value],
      endValue: [data && data.endValue || null],
      sheetName: [data && data.sheetName || sheetName],
      hidden: [toBoolean(data?.hidden, false)]
    });
  }

  setCriterionValue(control: AbstractControl, data?: ExtractionFilterCriterion, sheetName?: string) {
    let value = data?.value || null;
    // Is many values, concat values to fill the value control
    if (isNilOrBlank(value) && isNotEmptyArray(data?.values)) {
      value = data.values.join(',');
    }
    control.setValue({
      name: data && data.name || null,
      operator: data && data.operator || DEFAULT_CRITERION_OPERATOR,
      value: value,
      endValue: data && data.endValue || null,
      sheetName: data && data.sheetName || sheetName || null,
      hidden: toBoolean(data?.hidden, false)
    });
  }
}
