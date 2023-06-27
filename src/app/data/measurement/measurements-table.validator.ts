import { FormBuilder, FormGroup, UntypedFormGroup } from '@angular/forms';
import { IEntityWithMeasurement, MeasurementFormValues, MeasurementModelValues } from './measurement.model';
import { MeasurementsValidatorOptions, MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { BaseValidatorService } from '@app/shared/service/base.validator.service';
import { Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { TranslateService } from '@ngx-translate/core';
import { isNotNil, WaitForOptions, waitForTrue } from '@sumaris-net/ngx-components';

export interface MeasurementsTableValidatorOptions extends MeasurementsValidatorOptions {
  pmfms: IPmfm[]; // Required pmfms
  withMeasurements?: boolean;
}

export class MeasurementsTableValidatorService<
  T extends IEntityWithMeasurement<T, ID>,
  S extends BaseValidatorService<T, ID, O> = BaseValidatorService<T, any, any>,
  ID = number,
  O = any>
  extends BaseValidatorService<T, ID, O> {

  private readySubject = new BehaviorSubject(false);

  protected readonly measurementsValidatorService: MeasurementsValidatorService;

  protected _delegateOptions: O = null;
  protected _measurementsOptions: MeasurementsTableValidatorOptions = null;

  protected _measurementsConfigCache: { [key: string]: any } = null;

  set delegateOptions(value: O) {
    this._delegateOptions = value;
  }

  get delegateOptions(): O {
    return this._delegateOptions;
  }

  set measurementsOptions(value: MeasurementsTableValidatorOptions) {
    this._measurementsOptions = value;
    this._measurementsConfigCache = null; // Reset the config cache
  }

  get delegate(): S {
    return this._delegate;
  }

  constructor(
    injector: Injector,
    protected _delegate: S
  ) {
    super(injector.get(FormBuilder), injector.get(TranslateService))
    this.measurementsValidatorService = injector.get(MeasurementsValidatorService);
  }

  getRowValidator(data?: T, opts?: O): UntypedFormGroup {

    const form = this._delegate.getRowValidator(data, {
      ...(this._delegateOptions ||{}),
      ...opts
    });

    // Add measurement Values
    // Can be disable (e.g. in Batch Group table) if pmfms = null
    if (isNotNil(this._measurementsOptions?.pmfms)) {
      form.setControl('measurementValues', this.getMeasurementValuesFormGroup(data?.measurementValues, this._measurementsOptions), {emitEvent: false});
    }

    return form;
  }

  updateFormGroup(form: FormGroup, opts?: O) {
    this._delegate.updateFormGroup(form, {
      ...(this._delegateOptions ||{}),
      ...opts
    });

    // TODO: update using measurement values ?
  }

  ready(opts?: WaitForOptions): Promise<void> {
    return waitForTrue(this.readySubject, opts);
  }

  markAsReady() {
    if (!this.readySubject.value) {
      this.readySubject.next(true);
    }
  }

  /* -- protected -- */

  protected getMeasurementValuesFormGroup(data: MeasurementFormValues|MeasurementModelValues|undefined,
                                          opts: MeasurementsTableValidatorOptions): {[key: string]: any} {
    // Create a cached config
    let controlsConfig = this._measurementsConfigCache;

    // If no cache defined
    if (!controlsConfig) {
      // Compute the form group
      controlsConfig = this.measurementsValidatorService.getFormGroupConfig(null, opts);

      // Fill the cache
      this._measurementsConfigCache = controlsConfig;
    }

    return this.formBuilder.group(controlsConfig);
  }
}
