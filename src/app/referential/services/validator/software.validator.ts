import {Injectable} from "@angular/core";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {Software}  from "@sumaris-net/ngx-components";
import {ValidatorService} from "@e-is/ngx-material-table";
import {EntityUtils}  from "@sumaris-net/ngx-components";

@Injectable({providedIn: 'root'})
export class SoftwareValidatorService<T extends Software<T> = Software<any>> implements ValidatorService{

  constructor(
    protected formBuilder: UntypedFormBuilder
  ) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: T): UntypedFormGroup {
    return this.formBuilder.group({
      id: [data && data.id || null],
      label: [data && data.label || null, Validators.compose([Validators.required, Validators.max(50)])],
      name: [data && data.name || null, Validators.compose([Validators.required, Validators.max(100)])],
      description: [data && data.description || null, Validators.maxLength(255)],
      comments: [data && data.comments || null, Validators.maxLength(2000)],
      updateDate: [data && data.updateDate || null],
      creationDate: [data && data.creationDate || null],
      statusId: [data && data.statusId || null, Validators.required],
      properties: this.getPropertiesArray(data && data.properties)
    });
  }

  getPropertiesArray(array?: any) {
    const properties = EntityUtils.getMapAsArray(array || {});
    return this.formBuilder.array(
      properties.map(item => this.getPropertyFormGroup(item))
    );
  }

  getPropertyFormGroup(data?: { key: string; value?: string; }): UntypedFormGroup {
    return this.formBuilder.group({
      key: [data && data.key || null, Validators.compose([Validators.required, Validators.max(50)])],
      value: [data && data.value || null, Validators.compose([Validators.required, Validators.max(100)])]
    });
  }
}
