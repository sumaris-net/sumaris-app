import {Injectable} from "@angular/core";
import {AbstractControlOptions, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {PmfmStrategy} from "../model/pmfm-strategy.model";

import {ValidatorService} from "@e-is/ngx-material-table";
import {SharedValidators} from "../../../shared/validator/validators";
import {isNotNil} from "../../../shared/functions";

@Injectable({providedIn: 'root'})
export class PmfmStrategyValidatorService implements ValidatorService {

  private _isSimpleStrategy: boolean;
  public get isSimpleStrategy(): boolean {
    return this._isSimpleStrategy;
  }
  public set isSimpleStrategy(value: boolean) {
    this._isSimpleStrategy = value;
  }




  constructor(
    protected formBuilder: FormBuilder
  ) {
    this._isSimpleStrategy = false;
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  //getFormGroup(data?: PmfmStrategy): FormGroup {
  //  return this.formBuilder.group(this.getFormGroupConfig(data));
  //}

  getFormGroup(data?: PmfmStrategy): FormGroup {
    return this.formBuilder.group(
      this.getFormGroupConfig(data),
      this.getFormGroupOptions(data)
    );
  }

  getFormGroupConfig(data?: PmfmStrategy): {[key: string]: any} {
    const controlsConfig: {[key: string]: any} = {
      id: [data && data.id || null]
    };
    if (this.isSimpleStrategy) {
      // FIXME CLT  check validators
      controlsConfig.pmfm = [data && data.pmfm || null, Validators.compose([Validators.required, SharedValidators.entity])];
      controlsConfig.parameter = [data && data.pmfm.parameter || null];
      controlsConfig.matrix = [data && data.pmfm.matrix || null];
      controlsConfig.fraction = [data && data.pmfm.fraction || null];
      controlsConfig.method = [data && data.pmfm.method || null];

      // controlsConfig.pmfm = [data && data.pmfm || null, SharedValidators.entity];
      // controlsConfig.parameterId = [data && data.parameterId || null, SharedValidators.integer];
      // controlsConfig.matrixId = [data && data.matrixId || null, SharedValidators.integer];
      // controlsConfig.fractionId = [data && data.fractionId || null, SharedValidators.integer];
      // controlsConfig.methodId = [data && data.methodId || null, SharedValidators.integer];
    }
    if (!this.isSimpleStrategy) {
      controlsConfig.acquisitionLevel = [data && data.acquisitionLevel || null, Validators.required];
      controlsConfig.rankOrder = [data && data.rankOrder || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])];
      controlsConfig.pmfm = [data && data.pmfm || null, Validators.compose([Validators.required, SharedValidators.entity])];
      controlsConfig.parameterId = [data && data.parameterId || null, SharedValidators.integer];
      controlsConfig.matrixId = [data && data.matrixId || null, SharedValidators.integer];
      controlsConfig.fractionId = [data && data.fractionId || null, SharedValidators.integer];
      controlsConfig.methodId = [data && data.methodId || null, SharedValidators.integer];
      controlsConfig.isMandatory = [data && data.isMandatory || false, Validators.required];
      controlsConfig.acquisitionNumber = [data && data.acquisitionNumber || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])];
      controlsConfig.minValue = [data && data.minValue || null, SharedValidators.double()];
      controlsConfig.maxValue = [data && data.maxValue || null, SharedValidators.double()];
      controlsConfig.defaultValue = [isNotNil(data && data.defaultValue) ? data.defaultValue : null];
      controlsConfig.gearIds = [data && data.gearIds || null];
      controlsConfig.taxonGroupIds = [data && data.taxonGroupIds || null];
      controlsConfig.referenceTaxonIds = [data && data.referenceTaxonIds || null];
    }


    return controlsConfig;
  }

  getFormGroupOptions(data?: PmfmStrategy, opts?: any): AbstractControlOptions | any {
    return {};
  }
}
