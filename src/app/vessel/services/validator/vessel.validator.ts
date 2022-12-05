import {Injectable} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {Vessel} from '../model/vessel.model';
import {SharedValidators, toBoolean, toNumber} from '@sumaris-net/ngx-components';
import {VesselFeaturesValidatorService} from './vessel-features.validator';
import {VesselRegistrationValidatorService} from './vessel-registration.validator';
import {DataEntityValidatorOptions} from '@app/data/services/validator/data-entity.validator';
import {Moment} from 'moment';

export interface VesselValidatorOptions extends DataEntityValidatorOptions {
  withNameRequired?: boolean;
  maxDate?: Moment;
}

@Injectable({providedIn: 'root'})
export class VesselValidatorService<O extends VesselValidatorOptions = VesselValidatorOptions> implements ValidatorService {

  constructor(
    private formBuilder: UntypedFormBuilder,
    private vesselFeaturesValidator: VesselFeaturesValidatorService,
    private vesselRegistrationPeriodValidator: VesselRegistrationValidatorService) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: Vessel, opts?: O): UntypedFormGroup {
    return this.formBuilder.group({
      __typename: [Vessel.TYPENAME],
      id: [toNumber(data?.id, null)],
      updateDate: [data?.updateDate || null],
      creationDate: [data?.creationDate || null],
      vesselFeatures: this.vesselFeaturesValidator.getFormGroup(data?.vesselFeatures, opts),
      vesselRegistrationPeriod: this.vesselRegistrationPeriodValidator.getFormGroup(data?.vesselRegistrationPeriod, {required: true}),
      statusId: [toNumber(data?.statusId, null), Validators.required],
      vesselType: [data?.vesselType || null, Validators.compose([Validators.required, SharedValidators.entity])],
    });
  }

  /**
   * Update form group, with new options
   * @param form
   * @param opts
   */
  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    console.debug('[vessel-validator] Update form group with options', opts);
    opts = this.fillDefaultOptions(opts);
    this.vesselFeaturesValidator.updateFormGroup(form.get('vesselFeatures') as UntypedFormGroup, opts);
    this.vesselRegistrationPeriodValidator.updateFormGroup(form.get('vesselRegistrationPeriod') as UntypedFormGroup, {required: true, ...opts});
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || {} as O;

    opts.withNameRequired = toBoolean(opts.withNameRequired, true);

    return opts;
  }
}
