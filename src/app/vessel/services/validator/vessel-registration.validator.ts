import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { VesselRegistrationPeriod } from '../model/vessel.model';
import { fromDateISOString, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { VesselValidatorOptions } from '@app/vessel/services/validator/vessel.validator';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';

export interface VesselRegistrationValidatorOptions extends VesselValidatorOptions {
  required?: boolean;
}


@Injectable({providedIn: 'root'})
export class VesselRegistrationValidatorService<O extends VesselRegistrationValidatorOptions = VesselRegistrationValidatorOptions> implements ValidatorService {

  constructor(private formBuilder: UntypedFormBuilder,
              protected dateAdapter: DateAdapter<Moment>,
              protected translate: TranslateService) {
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: VesselRegistrationPeriod, opts?: O): UntypedFormGroup {
    return this.formBuilder.group({
      __typename: [VesselRegistrationPeriod.TYPENAME],
      id: [toNumber(data && data.id, null)],
      startDate: [data?.startDate || null, opts && opts.required ? Validators.required : null],
      endDate: [data?.endDate || null],
      registrationCode: [data?.registrationCode || null, opts && opts.required ? Validators.required : null],
      intRegistrationCode: [data?.intRegistrationCode || null],
      registrationLocation: [data?.registrationLocation || null, opts && opts.required ? Validators.compose([Validators.required, SharedValidators.entity]) : SharedValidators.entity]
    });
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    const startDateControl = form.get('startDate');

    if (opts && opts.maxDate) {
      const maxDate = fromDateISOString(opts.maxDate);
      const maxDateStr = this.dateAdapter.format(maxDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));

      startDateControl.setValidators(opts.required
        ? Validators.compose([
          SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day'),
          Validators.required
        ])
        : SharedValidators.dateIsBefore(opts.maxDate, maxDateStr, 'day')
      );
    } else if (opts && opts.required) {

      startDateControl.setValidators(Validators.required);
    } else {
      startDateControl.clearValidators();
    }
  }
}
