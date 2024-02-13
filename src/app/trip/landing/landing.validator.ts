import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Landing } from './landing.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { TranslateService } from '@ngx-translate/core';

export interface LandingValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withStrategy?: boolean;
  withObservedLocation?: boolean;
  strategy?: Strategy;
}

@Injectable({ providedIn: 'root' })
export class LandingValidatorService<O extends LandingValidatorOptions = LandingValidatorOptions> extends DataRootVesselEntityValidatorService<
  Landing,
  O
> {
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: Landing, opts?: O): UntypedFormGroup {
    const form = super.getFormGroup(data, opts);

    // Add measurement form
    if (opts && opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms =
        (opts.strategy && opts.strategy.denormalizedPmfms) ||
        (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms) ||
        [];
      pmfms
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.LANDING)
        .forEach((p) => {
          const key = p.pmfmId.toString();
          const value = data && data.measurementValues && data.measurementValues[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: Landing, opts?: O): { [p: string]: any } {
    const formConfig = Object.assign(super.getFormGroupConfig(data), {
      __typename: [Landing.TYPENAME],
      location: [data?.location || null, SharedValidators.entity],
      dateTime: [data?.dateTime || null],
      rankOrder: [toNumber(data?.rankOrder, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
      rankOrderOnVessel: [toNumber(data?.rankOrderOnVessel, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
      measurementValues: this.formBuilder.group({}),

      // Parent id
      observedLocationId: [toNumber(data?.observedLocationId, null)],
      tripId: [toNumber(data?.tripId, null)],

      // Computed values (e.g. for SIH-OBSBIO program)
      samplesCount: [toNumber(data?.samplesCount, null), null],
    });

    // Add observed location
    if (opts.withObservedLocation) {
      formConfig.observedLocation = [data && data.observedLocation, SharedValidators.entity];
    }

    // Add observers
    if (opts.withObservers) {
      formConfig.observers = this.getObserversFormArray(data?.observers);
    }

    return formConfig;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(
      opts.withObservers,
      (opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE)) || false
    );

    opts.withStrategy = toBoolean(
      opts.withStrategy,
      (opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE)) || false
    );

    opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));

    // TODO add more options, for all form parts:
    // opts.withFishingArea = ...
    // opts.withMetier = ...

    return opts;
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    opts = this.fillDefaultOptions(opts);
    const enabled = form.enabled;

    // Observers
    if (opts?.withObservers) {
      if (!form.controls.observers) form.addControl('observers', this.getObserversFormArray(null, {required: true}));
      if (enabled) form.controls.observers.enable()
      else form.controls.observers.disable();
    }
    else {
      if (form.controls.observers) form.removeControl('observers');
    }

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }
}
