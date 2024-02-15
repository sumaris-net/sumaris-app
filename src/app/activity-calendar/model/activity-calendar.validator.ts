import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import {
  AppFormArray,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  ReferentialUtils,
  SharedFormGroupValidators,
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
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ControlUpdateOnType } from '@app/data/services/validator/data-entity.validator';
import { GearUseFeaturesValidatorService } from '@app/activity-calendar/model/gear-use-features.validator';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';

export interface ActivityCalendarValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  withGearUseFeatures?: boolean;
  withVesselUseFeatures?: boolean;

  pmfms?: IPmfm[];
}

@Injectable({providedIn: 'root'})
export class ActivityCalendarValidatorService<O extends ActivityCalendarValidatorOptions = ActivityCalendarValidatorOptions>
  extends DataRootVesselEntityValidatorService<ActivityCalendar, O> {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected gearUseFeaturesValidatorService: GearUseFeaturesValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ActivityCalendar, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms = opts.pmfms || opts.strategy?.denormalizedPmfms || [];
      pmfms
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR)
        .forEach((p) => {
          const key = p.id.toString();
          const value = data && data.measurementValues && data.measurementValues[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: ActivityCalendar, opts?: O): { [key: string]: any } {

    const config = Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [ActivityCalendar.TYPENAME],
        year: [toNumber(data?.year, null), Validators.required],
        directSurveyInvestigation: [toBoolean(data?.directSurveyInvestigation, null), Validators.required],
        measurementValues: this.formBuilder.group({}),
      });

    // Add measurement values
    if (opts?.withMeasurements && isNotEmptyArray(opts.pmfms)) {
      config['measurementValues'] = this.getMeasurementValuesForm(data?.measurementValues, {
        pmfms: opts.pmfms,
        forceOptional: opts.isOnFieldMode,
        withTypename: opts.withMeasurementTypename
      });
    }

    // Add gear use features
    if (opts.withGearUseFeatures) {
      config.gearUseFeatures = this.getGearUseFeaturesArray(data?.gearUseFeatures);
    }
    //
    // // Add fishing Ares
    // if (opts.withFishingAreas) {
    //   config.fishingAreas = this.getFishingAreasArray(data?.fishingAreas, {required: true});
    // }

    return config;
  }

  getFormGroupOptions(data?: ActivityCalendar, opts?: O): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.dateRange('startDate', 'endDate')
      ])
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    //const enabled = form.enabled;

    // TODO update pmfms, depending on metier/gear ?
    // E.g. compute pmfms from initialPmfms, by filtering on metier/gear ?

    // TODO enable/disable gearUseFeatures ? e.g. when VUF.isActive = false ?

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }


  getGearUseFeaturesArray(data?: GearUseFeatures[], opts?: { maxLength?: number }) {
    const formArray = new AppFormArray<GearUseFeatures, UntypedFormGroup>(
      (guf) => this.gearUseFeaturesValidatorService.getFormGroup(guf),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: true,
        // TODO max length validator ? or min length ?
        //validators: opts?.maxLength ? SharedFormArrayValidators.requiredArrayMaxLength(opts.maxLength) : null,
      }
    );
    if (data) {
      formArray.patchValue(data);
    }
    return formArray;
  }

  /* -- protected methods -- */

  protected getMeasurementValuesForm(data: undefined|MeasurementFormValues|MeasurementModelValues, opts: {
    pmfms: IPmfm[];
    forceOptional?: boolean;
    withTypename?: boolean;
    updateOn?: ControlUpdateOnType;
  }) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
  }

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withVesselUseFeatures = toBoolean(opts.withVesselUseFeatures, true);
    opts.withGearUseFeatures = toBoolean(opts.withGearUseFeatures, true);

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);
    opts.pmfms = opts.pmfms
      || (opts.strategy?.denormalizedPmfms || [])
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.MONTHLY_ACTIVITY);

    return opts;
  }
}


