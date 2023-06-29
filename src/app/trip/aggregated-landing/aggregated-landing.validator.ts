import {Injectable} from "@angular/core";
import {AbstractControlOptions, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {toBoolean} from "@sumaris-net/ngx-components";
import {SharedValidators} from "@sumaris-net/ngx-components";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {AggregatedLanding} from "./aggregated-landing.model";
import {ValidatorService} from "@e-is/ngx-material-table";
import {DataEntityValidatorOptions} from "../../data/services/validator/data-entity.validator";

export interface AggregatedLandingValidatorOptions extends DataEntityValidatorOptions {
  // required?: boolean;
}

@Injectable({providedIn: 'root'})
export class AggregatedLandingValidatorService<T extends AggregatedLanding = AggregatedLanding, O extends AggregatedLandingValidatorOptions = AggregatedLandingValidatorOptions>
  implements ValidatorService {

  constructor(
    protected formBuilder: FormBuilder,
    protected settings: LocalSettingsService) {
  }

  getRowValidator(opts?: O) {
    return this.getFormGroup();
  }

  getFormGroup(data?: T, opts?: O): FormGroup {
    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
  }

  getFormGroupConfig(data?: T, opts?: O): { [p: string]: any } {
    opts = this.fillDefaultOptions(opts);

    return {
      vesselSnapshot: [data && data.vesselSnapshot, Validators.compose([Validators.required, SharedValidators.entity])],
      vesselActivities: [data && data.vesselActivities || []]
    };
  }

  getFormGroupOptions(data?: T, opts?: O): AbstractControlOptions | null {
    return null;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    // opts.required = toBoolean(opts.required, false);

    return opts;
  }
}
