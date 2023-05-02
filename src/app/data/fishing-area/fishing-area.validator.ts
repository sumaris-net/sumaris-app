import {Injectable} from '@angular/core';
import {DataEntityValidatorOptions, DataEntityValidatorService} from '../services/validator/data-entity.validator';
import {FishingArea} from './fishing-area.model';
import {AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';
import {LocalSettingsService, SharedFormGroupValidators, SharedValidators, toBoolean} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';

export interface FishingAreaValidatorOptions extends DataEntityValidatorOptions {
  required?: boolean;
}

@Injectable({providedIn: 'root'})
export class FishingAreaValidatorService<O extends FishingAreaValidatorOptions = FishingAreaValidatorOptions>
  extends DataEntityValidatorService<FishingArea, FishingAreaValidatorOptions> {

  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    protected settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: FishingArea, opts?: FishingAreaValidatorOptions): { [p: string]: any } {
    return Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [FishingArea.TYPENAME],
      location: [data && data.location || null, this.getLocationValidators(opts)],
      distanceToCoastGradient: [data && data.distanceToCoastGradient || null, SharedValidators.entity],
      depthGradient: [data && data.depthGradient || null, SharedValidators.entity],
      nearbySpecificArea: [data && data.nearbySpecificArea || null, SharedValidators.entity]
    });
  }

  getFormGroupOptions(data?: FishingArea, opts?: FishingAreaValidatorOptions): AbstractControlOptions | null{
    // Location if required only if the fishing area is NOT already required
    if (!opts || opts.required !== true) {
      return <AbstractControlOptions>{
        validator: [
          SharedFormGroupValidators.requiredIf('location', 'distanceToCoastGradient'),
          SharedFormGroupValidators.requiredIf('location', 'depthGradient'),
          SharedFormGroupValidators.requiredIf('location', 'nearbySpecificArea')
        ]
      };
    }
    else {
      // Location control is already required (see getLocationValidators() )
      return null;
    }
  }

  updateFormGroup(formGroup: UntypedFormGroup, opts?: FishingAreaValidatorOptions) {
    opts = this.fillDefaultOptions(opts);

    const locationValidators = this.getLocationValidators(opts);
    formGroup.get('location').setValidators(locationValidators);

    // Set form group validators
    formGroup.setValidators(this.getFormGroupOptions(null, opts)?.validators);

    formGroup.updateValueAndValidity({emitEvent: false});
  }

  getLocationValidators(opts?: FishingAreaValidatorOptions): ValidatorFn {
    return (opts && opts.required) ? Validators.compose([Validators.required, FishingAreaValidatorService.entity]) : SharedValidators.entity;
  }

  protected fillDefaultOptions(opts?: FishingAreaValidatorOptions): FishingAreaValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    opts.required = toBoolean(opts.required, true);

    return opts;
  }

  static entity(control: UntypedFormControl): ValidationErrors | null {
    const value = control.value;
    if (value && (typeof value !== 'object' || value.id === undefined || value.id === null)) {
      return {entity: true};
    }
    return null;
  }

}
