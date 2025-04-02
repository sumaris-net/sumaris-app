import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControl, AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { AppFormArray, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { Measurement, MeasurementFormValues, MeasurementUtils, MeasurementValuesTypes, MeasurementValuesUtils } from './measurement.model';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { TranslateService } from '@ngx-translate/core';
import { ControlUpdateOnType } from '@app/data/services/validator/data-entity.validator';

export interface MeasurementsValidatorOptions {
  isOnFieldMode?: boolean;
  pmfms?: IPmfm[];
  protectedAttributes?: string[];
  forceOptional?: boolean;
  withTypename?: boolean; // Default to true
  updateOn?: ControlUpdateOnType;
}

/**
 * Service for validating measurements data in forms.
 * Provides methods to create and update form groups for measurements validation.
 */
@Injectable({ providedIn: 'root' })
export class MeasurementsValidatorService<T extends Measurement = Measurement, O extends MeasurementsValidatorOptions = MeasurementsValidatorOptions>
  implements ValidatorService
{
  /**
   * Constructor for the MeasurementsValidatorService.
   * @param formBuilder - Angular form builder for creating form controls.
   * @param translate - Service for handling translations.
   * @param settings - Local settings service for application configurations.
   */
  constructor(
    protected formBuilder: UntypedFormBuilder,
    protected translate: TranslateService,
    protected settings: LocalSettingsService
  ) {}

  /**
   * Creates a row-level validator for measurements.
   * @param opts - Options for configuring the validator.
   * @returns A form group for validating a single row of measurements data.
   */
  getRowValidator(opts?: O): UntypedFormGroup {
    return this.getFormGroup(null, opts);
  }

  /**
   * Creates a form group for validating measurements data.
   * @param data - Measurements data or form values to initialize the form group.
   * @param opts - Options for configuring the validator.
   * @returns A form group for validating measurements data.
   */
  getFormGroup(data: T[] | MeasurementFormValues, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
  }

  /**
   * Generates the configuration for a form group based on measurements data.
   * @param data - Measurements data or form values to initialize the form group.
   * @param opts - Options for configuring the validator.
   * @returns A configuration object for the form group.
   */
  getFormGroupConfig(data: T[] | MeasurementFormValues, opts?: O): { [key: string]: any } {
    opts = this.fillDefaultOptions(opts);

    // Convert the array of Measurement into a normalized map of form values
    const measurementValues =
      (data &&
        (MeasurementValuesUtils.isMeasurementFormValues(data)
          ? data
          : // Transform to form values, if need
            MeasurementValuesUtils.normalizeValuesToForm(MeasurementUtils.toMeasurementValues(data as unknown as Measurement[]), opts.pmfms, {
              keepSourceObject: true,
              onlyExistingPmfms: false,
            }))) ||
      undefined;
    const config = opts.pmfms.reduce((res, pmfm) => {
      const value = measurementValues ? measurementValues[pmfm.id] : null;
      const validator = PmfmValidators.create(pmfm, null, opts);

      // If pmfm is multiple, then use a AppFormArray
      if (pmfm.isMultiple) {
        const formArray = new AppFormArray((value) => this.formBuilder.control(value, validator), PmfmValueUtils.equals, PmfmValueUtils.isEmpty, {
          allowEmptyArray: false,
        });
        if (Array.isArray(value)) {
          formArray.setValue(
            value.map((v) => (isNil(v) ? null : v)),
            { emitEvent: false }
          );
        } else {
          formArray.setValue([null], { emitEvent: false });
        }
        res[pmfm.id] = formArray;
      } else {
        res[pmfm.id] = validator ? [value, validator] : [value];
      }
      return res;
    }, {});

    // Validate __typename
    if (opts.withTypename !== false) {
      config['__typename'] = [measurementValues ? measurementValues.__typename : MeasurementValuesTypes.MeasurementFormValue, Validators.required];
    }

    return config;
  }

  /**
   * Provides additional options for the form group.
   * @param data - Measurements data or form values.
   * @param opts - Options for configuring the validator.
   * @returns Abstract control options for the form group.
   */
  getFormGroupOptions(data?: T[] | MeasurementFormValues, opts?: O): AbstractControlOptions | null {
    return { updateOn: opts?.updateOn };
  }

  /**
   * Updates an existing form group with new measurements validation rules.
   * @param form - The form group to update.
   * @param opts - Options for configuring the update.
   */
  updateFormGroup(form: UntypedFormGroup, opts?: O & { emitEvent?: boolean }) {
    opts = this.fillDefaultOptions(opts);

    // DEBUG
    //console.debug(`[measurement-validator] (${opts?.pmfms?.[0]?.['acquisitionLevel']}) updateFormGroup()`)

    const controlNamesToRemove = Object.getOwnPropertyNames(form.controls)
      // Excluded protected attributes
      .filter((controlName) => (!opts.protectedAttributes || !opts.protectedAttributes.includes(controlName)) && controlName !== '__typename');

    opts.pmfms.forEach((pmfm) => {
      const controlName = pmfm.id.toString();
      const validator = PmfmValidators.create(pmfm, null, opts);
      const defaultValue = PmfmValueUtils.fromModelValue(pmfm.defaultValue, pmfm) || null;

      // Multiple acquisition: use form array
      if (pmfm.isMultiple) {
        const formArray = new AppFormArray((value) => this.formBuilder.control(value, validator), PmfmValueUtils.equals, PmfmValueUtils.isEmpty, {
          allowEmptyArray: false,
        });
        // TODO set defaultValue

        form.addControl(controlName, formArray, { emitEvent: opts?.emitEvent });
      }

      // Only one acquisition
      else {
        let control: AbstractControl = form.get(controlName);
        // If new pmfm: add as control
        if (!control) {
          control = this.formBuilder.control(defaultValue, validator);
          form.addControl(controlName, control, { emitEvent: opts?.emitEvent });
        } else {
          control.setValidators(validator);
        }
      }

      // Remove from the remove list
      const index = controlNamesToRemove.indexOf(controlName);
      if (index !== -1) controlNamesToRemove.splice(index, 1);
    });

    // Remove unused controls
    controlNamesToRemove.forEach((controlName) => form.removeControl(controlName, { emitEvent: opts?.emitEvent }));

    // Create control for '__typename' (required)
    const typenameControl = form.get('__typename');
    if (opts.withTypename !== false) {
      if (!typenameControl) {
        // DEBUG
        //console.debug('[measurement-validator] Re add control \'__typename\' to measurement values form group');
        form.addControl('__typename', this.formBuilder.control(MeasurementValuesTypes.MeasurementFormValue, Validators.required), {
          emitEvent: opts?.emitEvent,
        });
      }
    } else if (typenameControl) {
      console.warn("[measurement-validator] Removing control '__typename' from measurement values form group. This is not recommended!");
      form.removeControl('__typename', { emitEvent: opts?.emitEvent });
    }
  }

  /**
   * Fills default options for the measurements validator.
   * @param opts - Options to fill with defaults.
   * @returns The options with default values applied.
   */
  protected fillDefaultOptions(opts?: O): O {
    opts = opts || ({} as O);

    opts.pmfms = opts.pmfms || [];

    opts.forceOptional = toBoolean(opts.forceOptional, false);

    opts.protectedAttributes = opts.protectedAttributes || ['id', 'rankOrder', 'comments', 'updateDate', '__typename'];

    return opts;
  }
}
