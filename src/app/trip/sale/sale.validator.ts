import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import {
  AppFormArray,
  fromDateISOString,
  isNotNil,
  LocalSettingsService,
  ReferentialRef,
  ReferentialUtils,
  SharedFormArrayValidators,
  SharedFormGroupValidators,
  SharedValidators,
  toBoolean,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Sale } from './sale.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { Moment } from 'moment';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';

export interface SaleValidatorOptions extends DataRootEntityValidatorOptions {
  required?: boolean;
  withProgram?: boolean;
  withVessel?: boolean;
  minDate?: Moment;
  withMetiers?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SaleValidatorService<O extends SaleValidatorOptions = SaleValidatorOptions> extends DataRootEntityValidatorService<
  Sale,
  SaleValidatorOptions
> {
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected dateAdapter: DateAdapter<Moment>
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: Sale, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [Sale.TYPENAME],
      saleType: [
        data?.saleType || null,
        !opts?.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity]),
      ],
      startDateTime: [data?.startDateTime || null],
      endDateTime: [data?.endDateTime || null, SharedValidators.dateRangeEnd('startDateTime')],
      saleLocation: [data?.saleLocation || null, SharedValidators.entity],

      // Parent id
      tripId: [toNumber(data?.tripId, null)],
      landingId: [toNumber(data?.landingId, null)],
    });

    // Remove program
    if (!opts?.withProgram) delete config.program;

    // Add vessel
    if (opts?.withVessel !== false) {
      config.vesselSnapshot = [
        (data && data.vesselSnapshot) || null,
        !opts?.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity]),
      ];
    }
    // Add metiers
    if (opts.withMetiers) {
      config.metiers = this.getMetiersArray(data?.metiers);
    }

    return config;
  }

  getFormGroupOptions(data?: Sale, opts?: SaleValidatorOptions): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.requiredIf('saleType', 'saleLocation'),
        SharedFormGroupValidators.requiredIf('saleLocation', 'saleType'),
        SharedFormGroupValidators.requiredIf('startDateTime', 'saleType'),
      ]),
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);
    const enabled = form.enabled;

    // Program
    let programControl = form.controls['program'];
    if (!programControl && opts.withProgram) {
      programControl = this.formBuilder.control(null, !opts?.required ? SharedValidators.entity : [Validators.required, SharedValidators.entity]);
      form.addControl('program', programControl);
      if (enabled && !programControl.enabled) programControl.enable();
      else if (!enabled && programControl.enabled) programControl.disable();
    } else if (programControl && !opts.withProgram) {
      form.removeControl('program');
    } else if (programControl) {
      // Is required ?
      if (opts.required && !programControl.hasValidator(Validators.required)) programControl.addValidators(Validators.required);
      else if (!opts.required && programControl.hasValidator(Validators.required)) programControl.removeValidators(Validators.required);
    }

    // Vessel
    let vesselSnapshotControl = form.controls['vesselSnapshot'];
    if (!vesselSnapshotControl && opts.withVessel) {
      vesselSnapshotControl = this.formBuilder.control(
        null,
        !opts.required ? SharedValidators.entity : [Validators.required, SharedValidators.entity]
      );
      form.addControl('vesselSnapshot', vesselSnapshotControl);
      if (enabled && !vesselSnapshotControl.enabled) vesselSnapshotControl.enable();
      else if (!enabled && vesselSnapshotControl.enabled) vesselSnapshotControl.disable();
    } else if (vesselSnapshotControl && !opts.withVessel) {
      form.removeControl('vesselSnapshot');
    } else if (vesselSnapshotControl) {
      // Is required ?
      if (opts.required && !vesselSnapshotControl.hasValidator(Validators.required)) vesselSnapshotControl.addValidators(Validators.required);
      else if (!opts.required && vesselSnapshotControl.hasValidator(Validators.required)) vesselSnapshotControl.removeValidators(Validators.required);
    }

    // Sale type
    const saleTypeControl = form.controls['saleType'];
    if (opts.required && !saleTypeControl.hasValidator(Validators.required)) saleTypeControl.addValidators(Validators.required);
    else if (!opts.required && saleTypeControl.hasValidator(Validators.required)) saleTypeControl.removeValidators(Validators.required);

    if (opts.minDate) {
      const minDate = fromDateISOString(opts.minDate);
      const minDateStr = this.dateAdapter.format(minDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
      form.controls['startDateTime'].setValidators([SharedValidators.validDate, SharedValidators.dateIsAfter(minDate, minDateStr)]);
    } else {
      form.controls['startDateTime'].setValidators(SharedValidators.validDate);
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

    // Re add group validators
    const formGroupOptions = this.getFormGroupOptions(null, opts);
    form.setValidators(formGroupOptions?.validators);

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

  /* -- fill options defaults -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || ({} as O);

    opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : this.settings?.isOnFieldMode() || false;

    opts.required = toBoolean(opts.required, true);

    opts.withProgram = toBoolean(opts.withProgram, true);

    opts.withVessel = toBoolean(opts.withVessel, true);

    opts.withMetiers = toBoolean(opts.withMetiers, false);

    return opts;
  }
}
