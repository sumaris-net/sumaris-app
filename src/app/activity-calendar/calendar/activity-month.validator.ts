import { Injectable } from '@angular/core';
import { ControlUpdateOnType, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import {
  AppFormArray,
  equals,
  isNil,
  isNotEmptyArray,
  isNotNil,
  LocalSettingsService,
  ReferentialUtils,
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
import { VesselUseFeatures, VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { Subject, Subscription, tap } from 'rxjs';
import { debounceTime, filter, map, startWith } from 'rxjs/operators';
import { FORM_VALIDATOR_OPTIONS_PROPERTY } from '@app/shared/service/base.validator.service';

export interface ActivityMonthValidatorOptions extends GearUseFeaturesValidatorOptions {
  required?: boolean;

  metierCount?: number;
  maxMetierCount?: number;
  fishingAreaCount?: number;
  maxFishingAreaCount?: number;
  debounceTime?: number;
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
        required: data?.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE,
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
      isActive: [toNumber(data?.isActive, null), opts?.required ? Validators.required : undefined],
      basePortLocation: [data?.basePortLocation || null],
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
      validators: [
        SharedFormGroupValidators.dateRange('startDate', 'endDate'),
        SharedFormGroupValidators.requiredIf('basePortLocation', 'isActive', {
          predicate: (control) => control.value === VesselUseFeaturesIsActiveEnum.ACTIVE || control.value === VesselUseFeaturesIsActiveEnum.INACTIVE,
        }),
      ],
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O) {
    opts = this.fillDefaultOptions(opts);

    // Update form group validators
    const previousOpts = form[FORM_VALIDATOR_OPTIONS_PROPERTY];

    // Remember new options
    form[FORM_VALIDATOR_OPTIONS_PROPERTY] = opts;

    const enabled = form.enabled;
    const isActive = form.get('isActive').value;

    // Is active
    const isActiveControl = form.get('isActive');
    if (opts.required && !isActiveControl.hasValidator(Validators.required)) {
      isActiveControl.addValidators(Validators.required);
    } else if (!opts.required && isActiveControl.hasValidator(Validators.required)) {
      isActiveControl.removeValidators(Validators.required);
    }

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
      const gufEnabled = enabled && isActive === VesselUseFeaturesIsActiveEnum.ACTIVE;
      gufArray.forEach((guf) => {
        // Init fishing areas
        let faArray = guf.get('fishingAreas') as AppFormArray<FishingArea, UntypedFormGroup>;
        if (opts?.withFishingAreas) {
          if (!faArray) {
            faArray = this.getFishingAreaArray(null, { required: !opts.isOnFieldMode });
            guf.addControl('fishingAreas', faArray, { emitEvent: false });
          }
          if (isNotNil(opts?.fishingAreaCount)) {
            faArray.resize(opts.fishingAreaCount, { emitEvent: false });
          }
          if (gufEnabled && faArray.disabled) faArray.enable({ emitEvent: false });
          else if (!gufEnabled && faArray.enabled) faArray.disable({ emitEvent: false });
        } else {
          //if (faArray) guf.removeControl('fishingAreas');
          if (faArray) faArray.disable({ emitEvent: false });
        }

        // Init start/end date
        guf.patchValue({ startDate, endDate }, { emitEvent: false });

        if (gufEnabled && !guf.enabled) guf.enable({ emitEvent: false });
        else if (!gufEnabled && guf.enabled) guf.disable({ emitEvent: false });
      });
    } else {
      //if (gufArray) form.removeControl('gearUseFeatures');
      if (gufArray?.enabled) gufArray.disable({ emitEvent: false, onlySelf: true });
    }

    // Update form group validators (if changes)
    if (!equals(previousOpts, opts)) {
      const formValidators = this.getFormGroupOptions(null, opts)?.validators;
      form.setValidators(formValidators);
    }
  }

  getI18nError(errorKey: string, errorContent?: any): any {
    console.log('TODO translate error: ' + errorKey);
    return super.getI18nError(errorKey, errorContent);
  }

  getGearUseFeaturesArray(data?: GearUseFeatures[], opts?: GearUseFeaturesValidatorOptions & { required?: boolean }) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray(
      (fa) => this.gearUseFeaturesValidator.getFormGroup(fa, { ...opts, requiredMetier: false, requiredFishingAreas: false }),
      GearUseFeatures.equals,
      GearUseFeatures.isEmpty,
      {
        allowEmptyArray: !required,
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined,
      }
    );
    if (data || required) {
      formArray.patchValue(isNotEmptyArray(data) ? data : required ? [null] : []);
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

    opts.required = toBoolean(opts.required, true);
    opts.pmfms = opts.pmfms || (opts.strategy?.denormalizedPmfms || []).filter((p) => p.acquisitionLevel === AcquisitionLevelCodes.MONTHLY_ACTIVITY);

    opts.withMeasurements = toBoolean(opts.withMeasurements, isNotEmptyArray(opts.pmfms) || isNotNil(opts.strategy));
    opts.withMeasurementTypename = toBoolean(opts.withMeasurementTypename, opts.withMeasurements);

    opts.withMetier = toBoolean(opts.withMetier, true);
    opts.withFishingAreas = toBoolean(opts.withFishingAreas, true);

    return opts;
  }
}

export class ActivityMonthValidators {
  static startListenChanges(form: UntypedFormGroup, pmfms: IPmfm[], opts?: { markForCheck: () => void; debounceTime?: number }): Subscription {
    if (!form) {
      console.warn("Argument 'form' required");
      return null;
    }

    const $errors = new Subject<ValidationErrors | null>();
    form.setAsyncValidators((control) => $errors);

    let computing = false;
    const subscription = form.valueChanges
      .pipe(
        startWith<any, any>(form.value),
        filter(() => !computing),
        // Protected against loop
        tap(() => (computing = true)),
        debounceTime(toNumber(opts?.debounceTime, 0)),
        map(() =>
          form.touched
            ? ActivityMonthValidators.computeAndValidate(form, {
                ...form[FORM_VALIDATOR_OPTIONS_PROPERTY],
                ...opts,
                emitEvent: false,
                onlySelf: false,
              })
            : undefined
        ),
        tap((errors) => {
          computing = false;
          $errors.next(errors);
          if (opts.markForCheck) opts.markForCheck();
        })
      )
      .subscribe();

    // When unsubscribe, remove async validator
    subscription.add(() => {
      $errors.next(null);
      $errors.complete();
      form.clearAsyncValidators();
      if (opts.markForCheck) opts.markForCheck();
    });

    return subscription;
  }

  static computeAndValidate(
    form: UntypedFormGroup,
    opts?: ActivityMonthValidatorOptions & {
      emitEvent?: boolean;
      onlySelf?: boolean;
      markForCheck?: () => void;
    }
  ): ValidationErrors | null {
    console.debug('[activity-month-validator] Starting computation and validation...');
    let errors: any;

    const isActiveControl = form.get('isActive') as UntypedFormControl;
    const gearUseFeaturesArray = form.get('gearUseFeatures') as AppFormArray<GearUseFeatures, UntypedFormGroup>;
    let dirty = false;

    // Get isActive value, and force  ACTIVE when having metier
    let isActive = isActiveControl.value;
    if (isNil(isActive)) {
      // Check each gear use features
      const hasMetier = (gearUseFeaturesArray.value as any[]).some((guf) => isNotNil(guf.metier?.id));
      if (hasMetier) {
        isActive = VesselUseFeaturesIsActiveEnum.ACTIVE;
        isActiveControl.setValue(isActive, { emitEvent: false });
        dirty = true;
      }
    }

    // Check isActive
    if (isNotNil(isActive)) {
      const measurementForm = form.get('measurementValues');
      const basePortLocationControl = form.get('basePortLocation');
      switch (isActive) {
        case VesselUseFeaturesIsActiveEnum.ACTIVE: {
          if (basePortLocationControl.disabled) basePortLocationControl.enable({ emitEvent: false });
          if (measurementForm.disabled) measurementForm.enable({ emitEvent: false });
          if (gearUseFeaturesArray?.disabled) gearUseFeaturesArray.enable({ emitEvent: false });

          // Check each gear use features
          (gearUseFeaturesArray.value as any[]).forEach((guf, index) => {
            const faArray = gearUseFeaturesArray.get([index, 'fishingAreas']) as AppFormArray<any, any>;
            if (isNotNil(guf.metier?.id)) {
              if (faArray.disabled) faArray.enable({ emitEvent: false });
            } else {
              if (faArray.enabled) faArray.disable({ emitEvent: false });
            }
            if (isNotNil(opts?.fishingAreaCount)) {
              faArray.resize(opts?.fishingAreaCount, { emitEvent: false });
            }
          });
          //const errorMetier =

          break;
        }
        case VesselUseFeaturesIsActiveEnum.INACTIVE: {
          if (basePortLocationControl.disabled) basePortLocationControl.enable({ emitEvent: false });
          if (MeasurementValuesUtils.isNotEmpty(measurementForm?.value)) {
            measurementForm.reset(null, { emitEvent: false });
            dirty = true;
          }
          if (measurementForm?.enabled) measurementForm.disable({ emitEvent: false });
          if (gearUseFeaturesArray?.enabled) gearUseFeaturesArray.disable({ emitEvent: false });
          break;
        }
        case VesselUseFeaturesIsActiveEnum.NOT_EXISTS: {
          if (ReferentialUtils.isNotEmpty(basePortLocationControl.value)) {
            basePortLocationControl.reset(null, { emitEvent: false });
            dirty = true;
          }
          if (basePortLocationControl.enabled) basePortLocationControl.disable({ emitEvent: false });
          if (MeasurementValuesUtils.isNotEmpty(measurementForm?.value)) {
            measurementForm.reset(null, { emitEvent: false });
            dirty = true;
          }
          if (measurementForm?.enabled) measurementForm.disable({ emitEvent: false });
          if (gearUseFeaturesArray?.enabled) gearUseFeaturesArray.disable({ emitEvent: false });
          break;
        }
      }
    }

    if (dirty) {
      form.markAsDirty();
    }

    if (opts?.markForCheck) {
      //console.debug("[activity-month-validator] calling MarkForCheck...");
      opts.markForCheck();
    }

    return errors;
  }
}

export const ACTIVITY_MONTH_VALIDATOR_I18N_ERROR_KEYS = {
  // TODO
};
