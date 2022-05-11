import {Injectable} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {ValidatorService} from "@e-is/ngx-material-table";
import {ExtractionFilterCriterion, ExtractionType} from "../type/extraction-type.model";

@Injectable()
export class ExtractionCriteriaValidatorService implements ValidatorService {

  constructor(
    protected formBuilder: FormBuilder) {
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: ExtractionType): FormGroup {
    return this.formBuilder.group({ });
  }

  getCriterionFormGroup(criterion?: ExtractionFilterCriterion, sheetName?: string) {
    return this.formBuilder.group({
      name: [criterion && criterion.name || null],
      operator: [criterion && criterion.operator || '=', Validators.required],
      value: [criterion && criterion.value || null],
      endValue: [criterion && criterion.endValue || null],
      sheetName: [criterion && criterion.sheetName || sheetName]
    });
  }
}
