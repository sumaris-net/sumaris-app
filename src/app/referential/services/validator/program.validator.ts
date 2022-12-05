import {Injectable} from "@angular/core";
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from "@angular/forms";
import {Program} from "../model/program.model";

import {ValidatorService} from "@e-is/ngx-material-table";
import {SharedFormArrayValidators, SharedValidators} from "@sumaris-net/ngx-components";
import {EntityUtils}  from "@sumaris-net/ngx-components";

@Injectable({providedIn: 'root'})
export class ProgramValidatorService implements ValidatorService {

  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: Program): UntypedFormGroup {
    return this.formBuilder.group({
      id: [data && data.id || null],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      statusId: [data && data.statusId || null, Validators.required],
      label: [data && data.label || null, Validators.required],
      name: [data && data.name || null, Validators.required],
      description: [data && data.description || null, Validators.maxLength(255)],
      comments: [data && data.comments || null, Validators.maxLength(2000)],
      taxonGroupType: [data && data.taxonGroupType || null, Validators.compose([Validators.required, SharedValidators.entity])],
      gearClassification: [data && data.gearClassification || null, Validators.compose([Validators.required, SharedValidators.entity])],
      locationClassifications: this.getLocationClassificationArray(data && data.locationClassifications),
      locations: this.formBuilder.array([]),
      properties: this.getPropertiesArray(data && data.properties)
    });
  }

  getPropertiesArray(array?: any) {
    const properties = EntityUtils.getMapAsArray(array || {});
    return this.formBuilder.array(
      properties.map(item => this.getPropertyFormGroup(item))
    );
  }

  getPropertyFormGroup(data?: {key: string; value?: string;}): UntypedFormGroup {
    return this.formBuilder.group({
      key: [data && data.key || null, Validators.compose([Validators.required, Validators.max(50)])],
      value: [data && data.value || null, Validators.compose([Validators.required, Validators.max(100)])]
    });
  }

  getLocationClassificationArray(array?: any[]) {
    return this.formBuilder.array(
      (array || []).map(item => this.getLocationClassificationControl(item)),
      SharedFormArrayValidators.requiredArrayMinLength(1)
    );
  }

  getLocationClassificationControl(locationClassification?: any): UntypedFormControl {
    return this.formBuilder.control(locationClassification || null, [Validators.required, SharedValidators.entity]);
  }
}
