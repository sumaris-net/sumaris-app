import {Injectable} from "@angular/core";
import {AbstractControlOptions, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {PmfmStrategy} from "../model/pmfm-strategy.model";

import {ValidatorService} from "@e-is/ngx-material-table";
import {SharedValidators} from "@sumaris-net/ngx-components";
import {isNotNil} from "@sumaris-net/ngx-components";

@Injectable({providedIn: 'root'})
export class PmfmStrategyValidatorService implements ValidatorService {

  private _withDetails = true;

  public get withDetails(): boolean {
    return this._withDetails;
  }

  public set withDetails(value: boolean) {
    this._withDetails = value;
  }

  constructor(
    protected formBuilder: FormBuilder
  ) {
    this._withDetails = true;
  }

  getRowValidator(): FormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: PmfmStrategy, opts?: {
    withDetails?: boolean;
    required?: boolean;
  }): FormGroup {
    opts = {
      withDetails: this._withDetails,
      ...opts
    };
    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
  }

  getFormGroupConfig(data?: PmfmStrategy, opts?: {
    withDetails?: boolean;
    required?: boolean;
  }): {[key: string]: any} {
    const config: {[key: string]: any} = {
      id: [data && data.id || null],
      pmfm: [data && data.pmfm || null, SharedValidators.entity],
      parameter: [data && data.parameter || null, SharedValidators.entity],
      matrix: [data && data.matrix || null, SharedValidators.entity],
      fraction: [data && data.fraction || null, SharedValidators.entity],
      method: [data && data.method || null, SharedValidators.entity]
    };
    if (opts.withDetails) {
      config.acquisitionLevel = [data && data.acquisitionLevel || null, Validators.required];
      config.rankOrder = [data && data.rankOrder || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])];
      config.isMandatory = [data && data.isMandatory || false, Validators.required];
      config.acquisitionNumber = [data && data.acquisitionNumber || 1, Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])];
      config.minValue = [data && data.minValue || null, SharedValidators.decimal()];
      config.maxValue = [data && data.maxValue || null, SharedValidators.decimal()];
      config.defaultValue = [isNotNil(data && data.defaultValue) ? data.defaultValue : null];
      config.gearIds = [data && data.gearIds || null];
      config.taxonGroupIds = [data && data.taxonGroupIds || null];
      config.referenceTaxonIds = [data && data.referenceTaxonIds || null];
    }

    return config;
  }

  getFormGroupOptions(data?: PmfmStrategy, opts?: {
    withDetails?: boolean;
    required?: boolean;
  }): AbstractControlOptions | any {
    if (!opts || opts.required !== false) {
      return {
        validator: (form: FormGroup) => {
          const pmfm = form.get('pmfm').value;
          const parameter = form.get('parameter').value;
          const fraction = form.get('fraction').value;
          if (!pmfm && !parameter && !fraction) {
            return {required: true};
          }
          return null;
        }
      };
    }
    return { };
  }
}
