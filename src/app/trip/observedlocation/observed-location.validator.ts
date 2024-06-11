import { Injectable } from '@angular/core';
import {
  AbstractControlOptions,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { DateUtils, isNotNil, LocalSettingsService, SharedFormGroupValidators, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { ObservedLocation } from './observed-location.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import moment from 'moment';
import { TranslateService } from '@ngx-translate/core';

export interface ObservedLocationValidatorOptions extends DataRootEntityValidatorOptions {
  withSamplingStrata?: boolean;
  withMeasurements?: boolean;
  startDateDay?: number;
  withEndDateRequired?: boolean;
  timezone?: string;
}

@Injectable({ providedIn: 'root' })
export class ObservedLocationValidatorService extends DataRootEntityValidatorService<ObservedLocation, ObservedLocationValidatorOptions> {
  constructor(formBuilder: UntypedFormBuilder, translate: TranslateService, settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ObservedLocation, opts?: ObservedLocationValidatorOptions): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    // Add measurement form
    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms =
        (opts.strategy && opts.strategy.denormalizedPmfms) ||
        (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms) ||
        [];

      pmfms
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.OBSERVED_LOCATION)
        .forEach((p) => {
          // Override SALE_TYPE type to 'qualitative_value'
          if (p.id === PmfmIds.SALE_TYPE) {
            p.type = 'qualitative_value';
          }

          const key = p.id.toString();
          const value = data?.measurementValues?.[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: ObservedLocation, opts?: ObservedLocationValidatorOptions): { [key: string]: any } {
    const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [ObservedLocation.TYPENAME],
      location: [data?.location || null, Validators.compose([Validators.required, SharedValidators.entity])],
      startDateTime: [data?.startDateTime || null, this.createStartDateValidator(opts)],
      endDateTime: [data?.endDateTime || null, opts.withEndDateRequired ? Validators.required : Validators.nullValidator],
      measurementValues: this.formBuilder.group({}),
    });

    // Add sampling strata
    if (opts.withSamplingStrata) {
      formConfig.samplingStrata = [data?.samplingStrata || null, Validators.compose([Validators.required, SharedValidators.entity])];
    }

    // Add observers
    if (opts.withObservers) {
      formConfig.observers = this.getObserversFormArray(data?.observers);
    }

    return formConfig;
  }

  updateFormGroup(form: UntypedFormGroup, opts?: ObservedLocationValidatorOptions) {
    opts = this.fillDefaultOptions(opts);
    const enabled = form.enabled;

    // Update the start date validator
    form.get('startDateTime').setValidators(this.createStartDateValidator(opts));

    // Sampling strata
    if (opts.withSamplingStrata) {
      if (!form.controls.samplingStrata) {
        form.addControl('samplingStrata', this.formBuilder.control(null, [Validators.required, SharedValidators.entity]));
      }
      if (enabled) form.controls.samplingStrata.enable();
      else form.controls.samplingStrata.disable();
    } else {
      if (form.controls.samplingStrata) form.removeControl('samplingStrata');
    }

    // Observers
    if (opts?.withObservers) {
      if (!form.controls.observers) form.addControl('observers', this.getObserversFormArray([null], { required: true }));
      if (enabled) form.controls.observers.enable();
      else form.controls.observers.disable();
    } else {
      if (form.controls.observers) form.removeControl('observers');
    }

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }

  getFormGroupOptions(data?: any, opts?: ObservedLocationValidatorOptions): AbstractControlOptions {
    return {
      validators: [SharedFormGroupValidators.dateRange('startDateTime', 'endDateTime')],
    };
  }

  protected fillDefaultOptions(opts?: ObservedLocationValidatorOptions): ObservedLocationValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(
      opts.withObservers,
      toBoolean(
        opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
        ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === 'true'
      )
    );

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
          return {
            msg: {
              key: 'OBSERVED_LOCATION.ERROR.START_DATE_INVALID',
              params: {
                day: moment().day(weekday).format('dddd'),
              },
            },
          };
        }
        return null;
      });
    }

    return validators.length === 1 ? validators[0] : Validators.compose(validators);
  }
}
