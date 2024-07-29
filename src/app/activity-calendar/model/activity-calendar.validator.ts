import { Injectable } from '@angular/core';
import { AbstractControlOptions, FormArray, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  AppFormArray,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  ReferentialUtils,
  SharedFormArrayValidators,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { ActivityCalendar } from './activity-calendar.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ControlUpdateOnType } from '@app/data/services/validator/data-entity.validator';
import { GearUseFeaturesValidatorService } from '@app/activity-calendar/model/gear-use-features.validator';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { GearPhysicalFeaturesValidatorService } from './gear-physical-features.validator';
import { GearPhysicalFeatures } from './gear-physical-features.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { VesselUseFeatures } from './vessel-use-features.model';
import { VesselUseFeaturesValidatorService } from './vessel-use-features.validator';

export interface ActivityCalendarValidatorOptions extends DataRootEntityValidatorOptions {
  timezone?: string;

  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  withGearUseFeatures?: boolean;
  withGearPhysicalFeatures?: boolean;
  withVesselUseFeatures?: boolean;
  withAllMonths?: boolean;

  pmfms?: IPmfm[];
}

@Injectable({ providedIn: 'root' })
export class ActivityCalendarValidatorService<
  O extends ActivityCalendarValidatorOptions = ActivityCalendarValidatorOptions,
> extends DataRootVesselEntityValidatorService<ActivityCalendar, O> {
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected gearUseFeaturesValidatorService: GearUseFeaturesValidatorService,
    protected gearPhysicalFeaturesValidatorService: GearPhysicalFeaturesValidatorService,
    protected vesselUseFeaturesValidatorService: VesselUseFeaturesValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ActivityCalendar, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms: IPmfm[] = opts.pmfms || opts.strategy?.denormalizedPmfms || [];
      pmfms
        .filter((p) => !PmfmUtils.isDenormalizedPmfm(p) || p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR)
        .forEach((p) => {
          const key = p.id.toString();
          const value = data && data.measurementValues && data.measurementValues[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }
    if (opts.withAllMonths) {
      form.setValidators(this.validateMonthNumbers);
      form.updateValueAndValidity();
    }

    return form;
  }

  getFormGroupConfig(data?: ActivityCalendar, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [ActivityCalendar.TYPENAME],
      startDate: [data?.startDate || null, Validators.compose([Validators.required, SharedValidators.validDate])],
      year: [toNumber(data?.year, null), Validators.required],
      directSurveyInvestigation: [toBoolean(data?.directSurveyInvestigation, null), Validators.required],
      economicSurvey: [toBoolean(data?.economicSurvey, null)],
      measurementValues: this.formBuilder.group({}),
    });

    // Add measurement values
    if (opts?.withMeasurements && isNotEmptyArray(opts.pmfms)) {
      config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
        pmfms: opts.pmfms,
        forceOptional: opts.isOnFieldMode,
        withTypename: opts.withMeasurementTypename,
      });
    }

    // Add gear use features
    if (opts.withGearUseFeatures) {
      config.gearUseFeatures = this.getGearUseFeaturesArray(data?.gearUseFeatures);
    }
    // Add vessel use features
    if (opts.withVesselUseFeatures) {
      config.vesselUseFeatures = this.getVesselUseFeatures(data?.vesselUseFeatures);
    }
    // Add gear physical features
    if (opts.withGearPhysicalFeatures) {
      config.gearPhysicalFeatures = this.getGearPhysicalFeaturesArray(data?.gearPhysicalFeatures);
    }

    // Add observers
    if (opts.withObservers) {
      config.observers = this.getObserversFormArray(data?.observers);
    }

    //
    // // Add fishing Ares
    // if (opts.withFishingAreas) {
    //   config.fishingAreas = this.getFishingAreasArray(data?.fishingAreas, {required: true});
    // }

    return config;
  }

  getFormGroupOptions(data?: ActivityCalendar, opts?: O): AbstractControlOptions | null {
    const validators: ValidatorFn | ValidatorFn[] | null = null;

    // Add a form group control, to make there is ont GUF, when isActive=true
    // if (opts?.isOnFieldMode !== false) {
    //   validators = (form) => {
    //     const isActive = form.get('isActive').value;
    //     console.log('TODO isActive=' + isActive);
    //     if (isActive) {
    //       return {required: true};
    //     }
    //     return null;
    //   };
    // }
    //
    return {
      ...super.getFormGroupOptions(data, opts),
      validators,
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);
    const enabled = form.enabled;

    // TODO update pmfms, depending on metier/gear ?
    // E.g. compute pmfms from initialPmfms, by filtering on metier/gear ?

    // TODO enable/disable gearUseFeatures ? e.g. when VUF.isActive = false ?

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

  getGearUseFeaturesArray(data?: GearUseFeatures[], opts?: { maxLength?: number; required?: boolean }) {
    const required = opts?.required || false;
    const formArray = new AppFormArray<GearUseFeatures, UntypedFormGroup>(
      (guf) => this.gearUseFeaturesValidatorService.getFormGroup(guf),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: true,
        validators: opts?.maxLength ? SharedFormArrayValidators.arrayMaxLength(opts.maxLength) : null,
      }
    );
    if (data) {
      data = data?.filter(GearUseFeatures.isNotEmpty);
      if (required && isEmptyArray(data)) {
        data = [null];
      }
      formArray.patchValue(data || []);
    }
    return formArray;
  }

  getVesselUseFeatures(data?: VesselUseFeatures[], opts?: { maxLength?: number; required?: boolean }) {
    const required = opts?.required || false;
    const formArray = new AppFormArray<VesselUseFeatures, UntypedFormGroup>(
      (vuf) => this.vesselUseFeaturesValidatorService.getFormGroup(vuf),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: true,
        validators: opts?.maxLength ? SharedFormArrayValidators.arrayMaxLength(opts.maxLength) : null,
      }
    );
    if (data) {
      data = data?.filter(VesselUseFeatures.isNotEmpty);
      if (required && isEmptyArray(data)) {
        data = [null];
      }
      formArray.patchValue(data || []);
    }
    return formArray;
  }

  getGearPhysicalFeaturesArray(data?: GearPhysicalFeatures[], opts?: { maxLength?: number }) {
    const formArray = new AppFormArray<GearPhysicalFeatures, UntypedFormGroup>(
      (gpf) => this.gearPhysicalFeaturesValidatorService.getFormGroup(gpf),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: true,
        validators: opts?.maxLength ? SharedFormArrayValidators.arrayMaxLength(opts.maxLength) : null,
      }
    );
    if (data) {
      formArray.patchValue(data);
    }
    return formArray;
  }

  getI18nError(errorKey: string, errorContent?: any): any {
    if (ACTIVITY_CALENDAR_VALIDATOR_I18N_ERROR_KEYS[errorKey]) {
      return this.translate.instant(ACTIVITY_CALENDAR_VALIDATOR_I18N_ERROR_KEYS[errorKey], errorContent);
    }
    return super.getI18nError(errorKey, errorContent);
  }

  /* -- protected methods -- */

  protected getMeasurementValuesForm(
    data: undefined | MeasurementFormValues | MeasurementModelValues,
    opts: {
      pmfms: IPmfm[];
      forceOptional?: boolean;
      withTypename?: boolean;
      updateOn?: ControlUpdateOnType;
    }
  ) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withVesselUseFeatures = toBoolean(opts.withVesselUseFeatures, true);
    opts.withGearUseFeatures = toBoolean(opts.withGearUseFeatures, true);
    opts.withAllMonths = toBoolean(opts.withAllMonths, true);

    opts.withObservers = toBoolean(
      opts.withObservers,
      toBoolean(
        opts.program && opts.program.getPropertyAsBoolean(ProgramProperties.ACTIVITY_CALENDAR_OBSERVERS_ENABLE),
        ProgramProperties.ACTIVITY_CALENDAR_OBSERVERS_ENABLE.defaultValue === 'true'
      )
    );

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);
    opts.pmfms = opts.pmfms || (opts.strategy?.denormalizedPmfms || []).filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.MONTHLY_ACTIVITY);

    return opts;
  }

  validateMonthNumbers(group: FormArray): ValidationErrors | null {
    const months = group.get('vesselUseFeatures')?.value as AppFormArray<VesselUseFeatures, UntypedFormGroup>;
    if (!months) {
      return null;
    }

    if (months && months.length !== 12) {
      return { invalidMonthNumbers: true };
    }
    return null;
  }
}

export const ACTIVITY_CALENDAR_VALIDATOR_I18N_ERROR_KEYS = {
  invalidMonthNumbers: 'ACTIVITY_CALENDAR.ERROR.MONTH_NUMBERS',
};
