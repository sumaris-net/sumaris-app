import { inject, Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import {
  AppFormArray,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  SharedFormArrayValidators,
  SharedFormGroupValidators,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { GearUseFeatures } from './gear-use-features.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { FishingAreaValidatorOptions, FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ControlUpdateOnType, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { ValidatorService } from '@e-is/ngx-material-table';

export interface GearUseFeaturesValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;
  ignoreDateRequired?: boolean;

  pmfms?: IPmfm[];

  withMetier?: boolean;
  requiredMetier?: boolean;
  withGear?: boolean; // false by default (not used in ActivityCalendar)
  requiredGear?: boolean;
  withFishingAreas?: boolean;
  requiredFishingAreas?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GearUseFeaturesValidatorService<O extends GearUseFeaturesValidatorOptions = GearUseFeaturesValidatorOptions>
  extends DataEntityValidatorService<GearUseFeatures, O>
  implements ValidatorService
{
  protected readonly fishingAreaValidator = inject(FishingAreaValidatorService);
  protected readonly measurementsValidatorService = inject(MeasurementsValidatorService);

  constructor() {
    super();
  }

  getFormGroup(data?: GearUseFeatures, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms: IPmfm[] =
        opts.pmfms ||
        (opts.strategy?.denormalizedPmfms || []).filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES);
      pmfms.forEach((p) => {
        const key = p.id.toString();
        const value = data && data.measurementValues && data.measurementValues[key];
        measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
      });
    }

    return form;
  }

  getFormGroupConfig(data?: GearUseFeatures, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [GearUseFeatures.TYPENAME],
      vesselId: [toNumber(data?.vesselId, null)],
      startDate: [data?.startDate || null, opts?.ignoreDateRequired ? null : Validators.required],
      endDate: [data?.endDate || null, opts?.ignoreDateRequired ? null : Validators.required],
      rankOrder: [toNumber(data?.rankOrder, 0)],
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

    // Add metier
    if (opts.withMetier) {
      config.metier = this.getMetierControl(data?.metier, { required: opts?.requiredMetier !== false });
    }

    // Add gear
    if (opts.withGear) {
      config.gear = this.getGearControl(data?.gear, { required: opts?.requiredGear !== false });
    }

    // Add fishing Ares
    if (opts.withFishingAreas) {
      config.fishingAreas = this.getFishingAreasArray(data?.fishingAreas, { required: opts?.requiredFishingAreas !== false });
    }

    return config;
  }

  getFormGroupOptions(data?: GearUseFeatures, opts?: O): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([SharedFormGroupValidators.dateRange('startDate', 'endDate')]),
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const enabled = form.enabled;

    // TODO update metier, gear, fishing areas

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }

  getMetierControl(value: any, opts?: { required?: boolean }): UntypedFormControl {
    const required = !opts || opts.required !== false;
    return this.formBuilder.control(value || null, required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
  }

  getGearControl(value: any, opts?: { required?: boolean }): UntypedFormControl {
    const required = !opts || opts.required !== false;
    return this.formBuilder.control(value || null, required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
  }

  getFishingAreasArray(data?: FishingArea[], opts?: FishingAreaValidatorOptions) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray<FishingArea, UntypedFormGroup>(
      (fa) => this.fishingAreaValidator.getFormGroup(fa, { required }),
      FishingArea.equals,
      FishingArea.isEmpty,
      {
        allowEmptyArray: !required,
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined,
      }
    );
    if (data || required) {
      data = data?.filter(FishingArea.isNotEmpty);
      if (required && isEmptyArray(data)) {
        data = [null];
      }
      formArray.patchValue(data || []);
    }
    return formArray;
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

    opts.withMetier = toBoolean(opts.withMetier, true);
    opts.withGear = toBoolean(opts.withGear, false); // Not used in activity calendar
    opts.withFishingAreas = toBoolean(opts.withFishingAreas, true);
    //todo mf  AcquisitionLevelCodes
    opts.pmfms =
      opts.pmfms ||
      (opts.strategy?.denormalizedPmfms || []).filter(
        (p) => !PmfmUtils.isDenormalizedPmfm(p) || p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES
      );

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);

    return opts;
  }
}
