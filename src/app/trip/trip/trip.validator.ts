import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { LocalSettingsService, SharedFormArrayValidators, SharedFormGroupValidators, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { SaleValidatorService } from '../sale/sale.validator';
import { MeasurementsValidatorService } from '../../data/measurement/measurement.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Trip } from './trip.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { TranslateService } from '@ngx-translate/core';

export interface TripValidatorOptions extends DataRootEntityValidatorOptions {
  withSale?: boolean;
  withMeasurements?: boolean;
  withMetiers?: boolean;
  withFishingAreas?: boolean;
  returnFieldsRequired?: boolean;
  departureDateTimeRequired?: boolean;
  withOperationGroup?: boolean;
  minDurationInHours?: number;
  maxDurationInHours?: number;
}

@Injectable({providedIn: 'root'})
export class TripValidatorService<O extends TripValidatorOptions = TripValidatorOptions>
  extends DataRootVesselEntityValidatorService<Trip, O> {

  static readonly DEFAULT_MIN_DURATION_HOURS = 1; // 1 hour
  static readonly DEFAULT_MAX_DURATION_HOURS = 100 * 24; // 100 days

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected saleValidator: SaleValidatorService,
    protected fishingAreaValidator: FishingAreaValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: Trip, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    // Add sale form
    if (opts.withSale) {
      form.addControl('sale', this.saleValidator.getFormGroup(data && data.sale, {
        required: false
      }));
    }

    // Add measurement form
    if (opts.withMeasurements) {
      const pmfms = (opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms || [])
        .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.TRIP);
      form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
        isOnFieldMode: opts.isOnFieldMode,
        pmfms
      }));
    }

    return form;
  }

  getFormGroupConfig(data?: Trip, opts?: O): { [key: string]: any } {

    const formConfig = Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [Trip.TYPENAME],
        departureDateTime: [data && data.departureDateTime || null, !opts.departureDateTimeRequired ? null : Validators.required],
        departureLocation: [data && data.departureLocation || null, Validators.compose([Validators.required, SharedValidators.entity])],
        returnDateTime: [data && data.returnDateTime || null, this.getReturnDateTimeValidator(opts)],
        returnLocation: [data && data.returnLocation || null, this.getReturnLocationValidator(opts)]
      });

    // Add observers
    if (opts.withObservers) {
      formConfig.observers = this.getObserversFormArray(data);
    }

    // Add metiers
    if (opts.withMetiers) {
      formConfig.metiers = this.getMetiersArray(data);
    }

    // Add fishing Ares
    if (opts.withFishingAreas) {
      formConfig.fishingAreas = this.getFishingAreasArray(data);
    }

    return formConfig;
  }

  getFormGroupOptions(data?: Trip, opts?: O): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.dateRange('departureDateTime', 'returnDateTime'),
        SharedFormGroupValidators.dateMinDuration('departureDateTime', 'returnDateTime', opts?.minDurationInHours || TripValidatorService.DEFAULT_MIN_DURATION_HOURS, 'hour'),
        SharedFormGroupValidators.dateMaxDuration('departureDateTime', 'returnDateTime', opts?.maxDurationInHours || TripValidatorService.DEFAULT_MAX_DURATION_HOURS, 'hour')
      ])
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    form.get('returnDateTime').setValidators(this.getReturnDateTimeValidator(opts));
    form.get('returnLocation').setValidators(this.getReturnLocationValidator(opts));

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }


  getMetiersArray(data?: Trip, opts?: {required?: boolean}) {
    return this.formBuilder.array(
      (data && data.metiers || []).map(metier => this.getMetierControl(metier, opts)),
      SharedFormArrayValidators.requiredArrayMinLength(1)
    );
  }

  getMetierControl(value: any, opts?: {required?: boolean}) {
    const required = !opts || opts.required !== false;
    return this.formBuilder.control(value || null, required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
  }

  getFishingAreasArray(data?: Trip, opts?: {required?: boolean}) {
    const required = !opts || opts.required !== false;
    return this.formBuilder.array(
      (data && data.fishingAreas || []).map(fa => this.fishingAreaValidator.getFormGroup(fa)),
      required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined
    );
  }

  /* -- protected methods -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(opts.withObservers,
      toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
    ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === "true"));
    opts.withMetiers = toBoolean(opts.withMetiers,
      toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE),
    ProgramProperties.TRIP_METIERS_ENABLE.defaultValue === "true"));
    opts.withSale = toBoolean(opts.withSale, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE), false));
    opts.withMeasurements = toBoolean(opts.withMeasurements,  !!opts.program);
    opts.returnFieldsRequired = toBoolean(opts.returnFieldsRequired, !opts.isOnFieldMode);
    opts.minDurationInHours = toNumber(opts.minDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_MIN_DURATION_HOURS));
    opts.maxDurationInHours = toNumber(opts.maxDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_MAX_DURATION_HOURS));

    return opts;
  }


  protected getReturnDateTimeValidator(opts: TripValidatorOptions): ValidatorFn {
    return Validators.compose([
      opts.returnFieldsRequired ? Validators.required : Validators.nullValidator,
      SharedValidators.dateRangeEnd('departureDateTime'),
      SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration', 'dateMinDuration'])
    ]);
  }

  protected getReturnLocationValidator(opts: TripValidatorOptions): ValidatorFn {
    return opts.returnFieldsRequired ? Validators.compose([Validators.required, SharedValidators.entity]) : SharedValidators.entity;
  }
}


