import { Injectable } from '@angular/core';
import { ControlUpdateOnType, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import {
  AppFormArray,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  SharedFormArrayValidators,
  SharedFormGroupValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { FishingAreaValidatorOptions } from '@app/data/fishing-area/fishing-area.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { GearUseFeaturesValidatorOptions, GearUseFeaturesValidatorService } from '@app/activity-calendar/model/gear-use-features.validator';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';

export interface ActivityMonthValidatorOptions extends GearUseFeaturesValidatorOptions {
  metierCount?: number;
  maxMetierCount?: number;
  fishingAreaCount?: number;
  maxFishingAreaCount?: number;
}

@Injectable({ providedIn: 'root' })
export class ActivityMonthValidatorService<
  O extends ActivityMonthValidatorOptions = ActivityMonthValidatorOptions,
> extends DataEntityValidatorService<ActivityMonth, O> {
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected gearUseFeaturesValidator: GearUseFeaturesValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ActivityMonth, opts?: O): UntypedFormGroup {
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

    if (opts.withMetier) {
      const gufArray = this.getGearUseFeaturesArray(data?.gearUseFeatures, {
        ...opts,
        required: true,
        withMetier: true,
        withGear: false,
        withFishingAreas: true,
      });
      form.addControl('gearUseFeatures', gufArray);
    }

    return form;
  }

  getFormGroupConfig(data?: ActivityMonth, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [VesselUseFeatures.TYPENAME],
      vesselId: [toNumber(data?.vesselId, null)],
      month: [toNumber(data?.month, null), Validators.required],
      startDate: [data?.startDate || null, Validators.required],
      endDate: [data?.endDate || null, Validators.required],
      isActive: [toNumber(data?.isActive, null), Validators.required],
      basePortLocation: [data?.basePortLocation || null, Validators.required],
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

    return config;
  }

  getFormGroupOptions(data?: ActivityMonth, opts?: O): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([SharedFormGroupValidators.dateRange('startDate', 'endDate')]),
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const enabled = form.enabled;

    // TODO update metier, gear, fishing areas
    let gufArray = form.get('gearUseFeatures') as AppFormArray<GearUseFeatures, UntypedFormGroup>;
    if (opts.withMetier) {
      if (!gufArray) {
        gufArray = this.getGearUseFeaturesArray(null, { required: !opts.isOnFieldMode });
        form.addControl('gearUseFeatures', gufArray);
      }
      if (isNotNil(opts?.metierCount)) {
        gufArray.resize(opts.metierCount);
      }

      if (enabled && !gufArray.enabled) gufArray.enable();
      else if (!enabled && gufArray.enabled) gufArray.disable();

      // Set start/end date, and fishing area
      const startDate = form.get('startDate').value;
      const endDate = form.get('endDate').value;
      gufArray.forEach((guf) => {
        // Init fishing areas
        if (opts?.withFishingAreas) {
          let faArray = guf.get('fishingAreas') as AppFormArray<FishingArea, UntypedFormGroup>;
          if (!faArray) {
            faArray = this.getFishingAreaArray(null, { required: !opts.isOnFieldMode });
            guf.addControl('fishingAreas', faArray);
          }
          if (!faArray.length && isNotNil(opts?.fishingAreaCount)) {
            faArray.resize(opts.fishingAreaCount);
          }
          if (enabled && !faArray.enabled) faArray.enable();
          else if (!enabled && faArray.enabled) faArray.disable();
        } else {
          //if (guf.controls.fishingAreas) guf.removeControl('fishingAreas');
          if (guf.controls.fishingAreas) guf.controls.fishingAreas.disable();
        }

        // Init start/end date
        guf.patchValue({ startDate, endDate }, { emitEvent: false });

        if (enabled && !guf.enabled) guf.enable();
        else if (!enabled && guf.enabled) guf.disable();
      });
    } else {
      //if (gufArray) form.removeControl('gearUseFeatures');
      gufArray.disable();
    }

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }

  getI18nError(errorKey: string, errorContent?: any): any {
    console.log('TODO translate error: ' + errorKey);
    return super.getI18nError(errorKey, errorContent);
  }

  getGearUseFeaturesArray(data?: GearUseFeatures[], opts?: GearUseFeaturesValidatorOptions & { required?: boolean }) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray(
      (fa) => this.gearUseFeaturesValidator.getFormGroup(fa, opts),
      GearUseFeatures.equals,
      GearUseFeatures.isEmpty,
      {
        allowEmptyArray: !required,
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined,
      }
    );
    if (data || required) {
      formArray.patchValue(data?.length ? data : required ? [null] : []);
    }
    return formArray;
  }

  getFishingAreaArray(data?: FishingArea[], opts?: FishingAreaValidatorOptions) {
    return this.gearUseFeaturesValidator.getFishingAreasArray(data, opts);
  }

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

    opts.pmfms = opts.pmfms || (opts.strategy?.denormalizedPmfms || []).filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.MONTHLY_ACTIVITY);

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);

    opts.withMetier = toBoolean(opts.withMetier, true);
    opts.withFishingAreas = toBoolean(opts.withFishingAreas, true);

    return opts;
  }
}
