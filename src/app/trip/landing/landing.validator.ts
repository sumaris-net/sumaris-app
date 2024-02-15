import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { isNotEmptyArray, isNotNil, LocalSettingsService, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Landing } from './landing.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { TranslateService } from '@ngx-translate/core';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ControlUpdateOnType } from '@app/data/services/validator/data-entity.validator';

export interface LandingValidatorOptions extends DataRootEntityValidatorOptions {
  withObservedLocation?: boolean;
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  pmfms?: IPmfm[];
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
    if (opts?.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms = opts.strategy?.denormalizedPmfms || opts.program?.strategies?.[0]?.denormalizedPmfms || [];
      pmfms
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.LANDING)
        .forEach((p) => {
          const key = p.id.toString();
          const value = data?.measurementValues?.[key];
          measForm.addControl(key, this.formBuilder.control(isNotNil(value) ? value : null, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: Landing, opts?: O): { [p: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data), {
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

    // Add measurement values
    if (opts?.withMeasurements && isNotEmptyArray(opts.pmfms)) {
      config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
        pmfms: opts.pmfms,
        forceOptional: opts.isOnFieldMode,
        withTypename: opts.withMeasurementTypename
      });
    }

    // Add observed location
    if (opts.withObservedLocation) {
      config.observedLocation = [data && data.observedLocation, SharedValidators.entity];
    }

    // Add observers
    if (opts.withObservers) {
      config.observers = this.getObserversFormArray(data?.observers);
    }

    return config;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(
      opts.withObservers,
      (opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE)) || false
    );

    opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);

    opts.pmfms = opts.pmfms
      || (opts.strategy?.denormalizedPmfms || [])
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR);
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

  /* -- protected functions -- */

  protected getMeasurementValuesForm(data: undefined|MeasurementFormValues|MeasurementModelValues, opts: {
    pmfms: IPmfm[];
    forceOptional?: boolean;
    withTypename?: boolean;
    updateOn?: ControlUpdateOnType;
  }) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
  }
}
