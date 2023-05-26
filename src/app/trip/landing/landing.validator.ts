import {Injectable, Optional} from '@angular/core';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {LocalSettingsService, SharedValidators, toBoolean, toNumber} from '@sumaris-net/ngx-components';
import {ProgramProperties} from '@app/referential/services/config/program.config';
import {MeasurementsValidatorService} from '../../data/measurement/measurement.validator';
import {Landing} from './landing.model';
import {DataRootEntityValidatorOptions} from '@app/data/services/validator/root-data-entity.validator';
import {DataRootVesselEntityValidatorService} from '@app/data/services/validator/root-vessel-entity.validator';
import {AcquisitionLevelCodes} from '@app/referential/services/model/model.enum';
import {PmfmValidators} from '@app/referential/services/validator/pmfm.validators';
import {Strategy} from '@app/referential/services/model/strategy.model';
import { TranslateService } from '@ngx-translate/core';

export interface LandingValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withStrategy?: boolean;
  withObservedLocation?: boolean;
  strategy: Strategy;
}

@Injectable({providedIn: 'root'})
export class LandingValidatorService<O extends LandingValidatorOptions = LandingValidatorOptions>
  extends DataRootVesselEntityValidatorService<Landing, O> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService,
  ) {
    super(formBuilder,translate, settings);
  }

  getFormGroup(data?: Landing, opts?: O): UntypedFormGroup {

    const form = super.getFormGroup(data, opts);

    // Add measurement form
    if (opts && opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms = (opts.strategy && opts.strategy.denormalizedPmfms)
        || (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms)
        || [];
      pmfms
        .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.LANDING)
        .forEach(p => {
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
      location: [data && data.location || null, SharedValidators.entity],
      dateTime: [data && data.dateTime || null],
      rankOrder: [toNumber(data && data.rankOrder, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
      rankOrderOnVessel: [toNumber(data && data.rankOrderOnVessel, null), Validators.compose([SharedValidators.integer, Validators.min(1)])],
      measurementValues: this.formBuilder.group({}),

      // Parent id
      observedLocationId: [toNumber(data && data.observedLocationId, null)],
      tripId: [toNumber(data && data.tripId, null)],

      // Computed values (e.g. for BIO-PARAM program)
      samplesCount: [data && data.samplesCount, null]
    });


    // Add observed location
    if (opts.withObservedLocation) {
      formConfig.observedLocation = [data && data.observedLocation, SharedValidators.entity];
    }

    // Add observers
    if (opts.withObservers) {
      formConfig.observers = this.getObserversFormArray(data);
    }

    return formConfig;
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(opts.withObservers,
      opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_OBSERVERS_ENABLE) || false);

    opts.withStrategy = toBoolean(opts.withStrategy,
      opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.LANDING_STRATEGY_ENABLE) || false);

    opts.withMeasurements = toBoolean(opts.withMeasurements,  toBoolean(!!opts.program, false));

    return opts;
  }

}
