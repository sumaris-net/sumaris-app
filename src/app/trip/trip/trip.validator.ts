import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import {
  AppFormArray,
  LocalSettingsService,
  ReferentialRef,
  ReferentialUtils,
  SharedFormArrayValidators,
  SharedFormGroupValidators,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { SaleValidatorService } from '../sale/sale.validator';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Trip } from './trip.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { DataRootVesselEntityValidatorService } from '@app/data/services/validator/root-vessel-entity.validator';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { TranslateService } from '@ngx-translate/core';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { Sale } from '../sale/sale.model';
import { FocusMonitor } from '@angular/cdk/a11y';
import { FocusMonitor } from '@angular/cdk/a11y';

export interface TripValidatorOptions extends DataRootEntityValidatorOptions {
  withSamplingStrata?: boolean;
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

@Injectable({ providedIn: 'root' })
export class TripValidatorService<O extends TripValidatorOptions = TripValidatorOptions> extends DataRootVesselEntityValidatorService<Trip, O> {
  static readonly DEFAULT_MIN_DURATION_HOURS = 1; // 1 hour
  static readonly DEFAULT_MAX_DURATION_HOURS = 100 * 24; // 100 days
  logPrefix: string = '🟡[trip-validator]';

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

  // Méthode pour créer un AppFormGroup global pour le Trip, de l'initialiser
  getFormGroup(data?: Trip, opts?: O): UntypedFormGroup {
    console.debug(this.logPrefix + `(${opts?.program?.id}) getFormGroup()`);
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    // todo olm : manage sales
    // Add sale form
    if (opts.withSale) {
      form.addControl('sales', this.getSalesArray(data?.sales)); // ### TODO dedoublonner
      // form.addControl(
      //   'sale',
      //   this.saleValidator.getFormGroup(data?.sale, {
      //     required: false,
      //     withVessel: false,
      //     withProgram: false,
      //   })
      // );
    }

    // Add measurement form
    if (opts.withMeasurements) {
      const pmfms = ((opts.program && opts.program.strategies[0] && opts.program.strategies[0].denormalizedPmfms) || []).filter(
        (p) => p.acquisitionLevel === AcquisitionLevelCodes.TRIP
      );
      form.addControl(
        'measurements',
        this.measurementsValidatorService.getFormGroup(data && data.measurements, {
          isOnFieldMode: opts.isOnFieldMode,
          pmfms,
        })
      );
    }

    return form;
  }

  // Méthode pour créer un AppFormArray pour les ventes
  getSalesArray(data?: Sale[], opts?: { required?: boolean }): AppFormArray<Sale, UntypedFormGroup> {
    const required = !opts || opts.required !== false;
    console.debug(this.logPrefix + `(${data?.[0]?.program?.id}) getSalesArray()`, data);
    if (!data) data = [new Sale()]; // Crée une vente vide si aucune donnée n'est fournie

    const formArray = new AppFormArray<Sale, UntypedFormGroup>(
      (sale) => this.saleValidator.getFormGroup(sale), // Utilisation du SaleValidatorService pour chaque vente
      (a, b) => a?.equals(b) /*a.id === b.id*/, // Comparaison des ventes
      (a) => false /*!!a.id*/, // Vérification si une vente est vide
      {
        allowEmptyArray: true, // Permet un tableau vide TODO OLM enlever
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : null, // Validation pour s'assurer qu'il y a au moins une vente
      }
    );

    // Initialiser les données si elles existent
    if (data) {
      console.debug(this.logPrefix + `(${data?.[0]?.program?.id}) getSalesArray() patchValue Initialiser les données si elles existent`, data);
      formArray.patchValue(data);
    }

    console.debug(this.logPrefix + `(${data?.[0]?.program?.id}) getSalesArray()`, formArray.controls);
    return formArray;
  }

  // configuration du formGroup
  getFormGroupConfig(data?: Trip, opts?: O): { [key: string]: any } {
    console.debug(this.logPrefix + `(${opts?.program?.id}) getFormGroupConfig()`);
    const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [Trip.TYPENAME],
      departureDateTime: [(data && data.departureDateTime) || null, !opts.departureDateTimeRequired ? null : Validators.required],
      departureLocation: [(data && data.departureLocation) || null, Validators.compose([Validators.required, SharedValidators.entity])],
      returnDateTime: [(data && data.returnDateTime) || null, this.getReturnDateTimeValidator(opts)],
      returnLocation: [(data && data.returnLocation) || null, this.getReturnLocationValidator(opts)],
    });

    // Add sampling strata
    if (opts.withSamplingStrata) {
      formConfig.samplingStrata = [data?.samplingStrata || null, Validators.compose([Validators.required, SharedValidators.entity])];
    }

    // Add observers
    if (opts.withObservers) {
      formConfig.observers = this.getObserversFormArray(data?.observers);
    }

    // Add metiers
    if (opts.withMetiers) {
      formConfig.metiers = this.getMetiersArray(data?.metiers);
    }

    // Add fishing Ares
    if (opts.withFishingAreas) {
      formConfig.fishingAreas = this.getFishingAreasArray(data?.fishingAreas, { required: true });
    }

    // todo olm : manage sales
    if (opts.withSale) {
      console.debug(this.logPrefix + `(${opts?.program?.id}) getFormGroupConfig() before`, opts, data?.sales);
      formConfig.sales = this.getSalesArray(data?.sales);
    }

    return formConfig;
  }

  getFormGroupOptions(data?: Trip, opts?: O): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.dateRange('departureDateTime', 'returnDateTime'),
        SharedFormGroupValidators.dateMinDuration(
          'departureDateTime',
          'returnDateTime',
          opts?.minDurationInHours || TripValidatorService.DEFAULT_MIN_DURATION_HOURS,
          'hour'
        ),
        SharedFormGroupValidators.dateMaxDuration(
          'departureDateTime',
          'returnDateTime',
          opts?.maxDurationInHours || TripValidatorService.DEFAULT_MAX_DURATION_HOURS,
          'hour'
        ),
      ]),
    };
  }

  //mise à jour du formGroup dans le cas où les options sont modifiées (par exemple, si on passe d'un programme à un autre)
  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    console.debug(this.logPrefix + `(${opts?.program?.id}) updateFormGroup()`);
    opts = this.fillDefaultOptions(opts);

    const enabled = form.enabled;
    form.get('returnDateTime')?.setValidators(this.getReturnDateTimeValidator(opts));
    form.get('returnLocation')?.setValidators(this.getReturnLocationValidator(opts));

    // Sampling strata
    if (opts.withSamplingStrata) {
      if (!form.controls.samplingStrata) {
        form.addControl('samplingStrata', this.formBuilder.control(null, [Validators.required, SharedValidators.entity]));
      }
      if (enabled) form.controls.samplingStrata.enable();
      else form.controls.samplingStrata.disable();
    } else {
      if (form.controls.samplingStrata) form.removeControl('samplingStrata');
    }

    // Add sale form
    if (opts.withSale) {
      if (!form.controls.sale) {
        form.addControl(
          'sale',
          this.saleValidator.getFormGroup(null, {
            required: false,
            withVessel: false,
            withProgram: false,
          })
        );
      }
      if (enabled) form.controls.sale.enable();
      else form.controls.sale.disable();
    } else {
      if (form.controls.sale) form.removeControl('sale');
    }

    // Metier array
    if (opts?.withMetiers) {
      if (!form.controls.metiers) {
        form.addControl('metiers', this.getMetiersArray(null, { required: true }));
      }
      if (enabled) form.controls.metiers.enable();
      else form.controls.metiers.disable();
    } else {
      if (form.controls.metiers) form.removeControl('metiers');
    }

    // Sale array
    if (opts?.withSale) {
      console.debug(this.logPrefix + `(${opts?.program?.id}) updateFormGroup() before`, form.controls.sales);
      if (!form.controls.sales) form.addControl('sales', this.getSalesArray(null, { required: true })); // ### TODO dedoublonner
      if (enabled) {
        form.controls.sales.enable();
        this.getSalesArray(null).forEach((sale) => {
          sale.enable();
        });
      } else {
        form.controls.sales.disable();
      }
    } else {
      if (form.controls.sales) form.removeControl('sales');
    }
    console.debug(this.logPrefix + `(${opts?.program?.id}) updateFormGroup()`, form.controls.sales);

    // Observers
    if (opts?.withObservers) {
      if (!form.controls.observers) form.addControl('observers', this.getObserversFormArray(null, { required: true }));
      if (enabled) form.controls.observers.enable();
      else form.controls.observers.disable();
    } else {
      if (form.controls.observers) form.removeControl('observers');
    }

    // Fishing areas
    if (opts?.withFishingAreas) {
      if (!form.controls.fishingAreas) form.addControl('fishingAreas', this.getFishingAreasArray(null, { required: true }));
      if (enabled) form.controls.fishingAreas.enable();
      else form.controls.fishingAreas.disable();
    } else {
      if (form.controls.fishingAreas) form.removeControl('fishingAreas');
    }

    // Update form group validators
    const formValidators = this.getFormGroupOptions(null, opts)?.validators;
    form.setValidators(formValidators);

    return form;
  }

  getMetiersArray(data?: ReferentialRef<any>[], opts?: { required?: boolean }) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray<ReferentialRef<any>, UntypedFormControl>(
      (metier) => this.getMetierControl(metier, { required }),
      ReferentialUtils.equals,
      ReferentialUtils.isEmpty,
      {
        allowEmptyArray: false,
        validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : null,
      }
    );
    if (data || required) {
      formArray.patchValue(data || [null]);
    }
    return formArray;
  }

  getMetierControl(value: any, opts?: { required?: boolean }): UntypedFormControl {
    const required = !opts || opts.required !== false;
    return this.formBuilder.control(value || null, required ? [Validators.required, SharedValidators.entity] : SharedValidators.entity);
  }

  protected getFishingAreasArray(data?: FishingArea[], opts?: { required?: boolean }) {
    const required = !opts || opts.required !== false;
    const formArray = new AppFormArray((fa) => this.fishingAreaValidator.getFormGroup(fa, { required }), FishingArea.equals, FishingArea.isEmpty, {
      allowEmptyArray: false,
      validators: required ? SharedFormArrayValidators.requiredArrayMinLength(1) : undefined,
    });
    if (data || required) {
      formArray.patchValue(data || [null]);
    }
    return formArray;
  }

  /* -- protected methods -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withObservers = toBoolean(
      opts.withObservers,
      toBoolean(
        opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_OBSERVERS_ENABLE),
        ProgramProperties.TRIP_OBSERVERS_ENABLE.defaultValue === 'true'
      )
    );
    opts.withMetiers = toBoolean(
      opts.withMetiers,
      toBoolean(
        opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_METIERS_ENABLE),
        ProgramProperties.TRIP_METIERS_ENABLE.defaultValue === 'true'
      )
    );
    opts.withSale = toBoolean(opts.withSale, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_SALE_ENABLE), true)); //TODO OLM replace true by false
    opts.withMeasurements = toBoolean(opts.withMeasurements, !!opts.program);
    opts.returnFieldsRequired = toBoolean(opts.returnFieldsRequired, !opts.isOnFieldMode);
    opts.minDurationInHours = toNumber(opts.minDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_MIN_DURATION_HOURS));
    opts.maxDurationInHours = toNumber(opts.maxDurationInHours, opts.program?.getPropertyAsInt(ProgramProperties.TRIP_MAX_DURATION_HOURS));

    console.debug(this.logPrefix + `(${opts?.program?.id}) fillDefaultOptions()`, opts);
    return opts;
  }

  protected getReturnDateTimeValidator(opts: TripValidatorOptions): ValidatorFn {
    return Validators.compose([
      opts.returnFieldsRequired ? Validators.required : Validators.nullValidator,
      SharedValidators.dateRangeEnd('departureDateTime'),
      SharedValidators.copyParentErrors(['dateRange', 'dateMaxDuration', 'dateMinDuration']),
    ]);
  }

  protected getReturnLocationValidator(opts: TripValidatorOptions): ValidatorFn {
    return opts.returnFieldsRequired ? Validators.compose([Validators.required, SharedValidators.entity]) : SharedValidators.entity;
  }
}
