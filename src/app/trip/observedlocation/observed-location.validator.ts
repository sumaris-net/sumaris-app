import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DateUtils, isNotNil, LocalSettingsService, SharedFormGroupValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { ObservedLocation } from './observed-location.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import moment from 'moment';
import { TranslateService } from '@ngx-translate/core';

export interface ObservedLocationValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  startDateDay?: number;
  timezone?: string;
}

@Injectable({providedIn: 'root'})
export class ObservedLocationValidatorService
  extends DataRootEntityValidatorService<ObservedLocation, ObservedLocationValidatorOptions>{

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ObservedLocation, opts?: ObservedLocationValidatorOptions): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    // Add measurement form
    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      // TODO: find strategy from date and location
      (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms || [])
        .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.OBSERVED_LOCATION)
        .forEach(p => {
          const key = p.id.toString();
          const value = data?.measurementValues?.[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: ObservedLocation, opts?: ObservedLocationValidatorOptions): { [key: string]: any } {
    return {
      ...super.getFormGroupConfig(data),
      __typename: [ObservedLocation.TYPENAME],
      location: [data && data.location || null, Validators.compose([Validators.required, SharedValidators.entity])],
      startDateTime: [data && data.startDateTime || null, this.createStartDateValidator(opts)],
      endDateTime: [data && data.endDateTime || null],
      measurementValues: this.formBuilder.group({}),
      observers: this.getObserversFormArray(data)
    };

  }

  updateFormGroup(formGroup: UntypedFormGroup, opts?: ObservedLocationValidatorOptions) {
    opts = this.fillDefaultOptions(opts);

    // Update the start date validator
    formGroup.get('startDateTime').setValidators(this.createStartDateValidator(opts));

    return formGroup;
  }


  getFormGroupOptions(data?: any): AbstractControlOptions {
    return {
      validators: [SharedFormGroupValidators.dateRange('startDateTime', 'endDateTime')]
    };
  }

  protected fillDefaultOptions(opts?: ObservedLocationValidatorOptions): ObservedLocationValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(opts.withObservers,
      toBoolean(opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
        ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === 'true'));

    opts.withMeasurements = toBoolean(opts.withMeasurements, !!opts.program);

    return opts;
  }

  protected createStartDateValidator(opts?: ObservedLocationValidatorOptions): ValidatorFn {
    const validators: ValidatorFn[] = [Validators.required];

    // Check if a date is at the given day of week
    if (isNotNil(opts.startDateDay)) {
      const weekday = opts.startDateDay;
      const timezone = opts.timezone;
      validators.push((control: UntypedFormControl): ValidationErrors | null => {
        if (!DateUtils.isAtDay(control.value, weekday, timezone)) {
          control.markAsTouched();
          return {msg: {
              key: 'OBSERVED_LOCATION.ERROR.START_DATE_INVALID',
              params: {
                day: moment().day(weekday).format('dddd')
              }}};
        }
        return null;
      })
    }

    return validators.length === 1 ? validators[0] : Validators.compose(validators);
  }
}
