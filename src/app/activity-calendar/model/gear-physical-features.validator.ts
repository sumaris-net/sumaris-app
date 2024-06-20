import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import {
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  SharedFormGroupValidators,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { ControlUpdateOnType, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { ValidatorService } from '@e-is/ngx-material-table';
import { GearPhysicalFeatures } from './gear-physical-features.model';

export interface GearPhysicalFeaturesValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;

  pmfms?: IPmfm[];

  withMetier?: boolean;
  requiredMetier?: boolean;
  withGear?: boolean; // false by default (not used in ActivityCalendar)
  requiredGear?: boolean;
}

@Injectable({ providedIn: 'root' })
export class GearPhysicalFeaturesValidatorService<O extends GearPhysicalFeaturesValidatorOptions = GearPhysicalFeaturesValidatorOptions>
  extends DataEntityValidatorService<GearPhysicalFeatures, O>
  implements ValidatorService
{
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected fishingAreaValidator: FishingAreaValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: GearPhysicalFeatures, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    if (opts.withMeasurements) {
      const measForm = form.get('measurementValues') as UntypedFormGroup;
      const pmfms = opts.pmfms || opts.strategy?.denormalizedPmfms || [];
      pmfms
        .filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES)
        .forEach((p) => {
          const key = p.id.toString();
          const value = data && data.measurementValues && data.measurementValues[key];
          measForm.addControl(key, this.formBuilder.control(value, PmfmValidators.create(p)));
        });
    }

    return form;
  }

  getFormGroupConfig(data?: GearPhysicalFeatures, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [GearPhysicalFeatures.TYPENAME],
      vesselId: [toNumber(data?.vesselId, null)],
      startDate: [data?.startDate || null, Validators.required],
      endDate: [data?.endDate || null, Validators.required],
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

    return config;
  }

  getFormGroupOptions(data?: GearPhysicalFeatures, opts?: O): AbstractControlOptions {
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
    //todo mf  AcquisitionLevelCodes
    opts.pmfms = opts.pmfms || (opts.strategy?.denormalizedPmfms || []).filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.MONTHLY_ACTIVITY);

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);

    return opts;
  }
}
