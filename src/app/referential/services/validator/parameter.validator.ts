import {Injectable} from "@angular/core";
import {UntypedFormBuilder, UntypedFormGroup, Validators} from "@angular/forms";
import {ReferentialValidatorService} from "./referential.validator";
import {Parameter} from "../model/parameter.model";
import {Referential}  from "@sumaris-net/ngx-components";

@Injectable({providedIn: 'root'})
export class ParameterValidatorService extends ReferentialValidatorService<Parameter> {

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected referentialValidatorService: ReferentialValidatorService<Referential>
  ) {
    super(formBuilder);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroupConfig(data?: Parameter, opts?: { withDescription?: boolean; withComments?: boolean }): { [p: string]: any } {
    const config = super.getFormGroupConfig(data, opts);
    return {
      ...config,
      type : [data && data.type || null, Validators.required],
      qualitativeValues: this.formBuilder.array(
        (data && data.qualitativeValues || []).map(item => this.getQualitativeValuesFormGroup(item))
      )
    } ;
  }

  getQualitativeValuesFormGroup(data?: Referential): UntypedFormGroup {
    return this.formBuilder.group(this.referentialValidatorService.getFormGroupConfig(data));
  }
}
