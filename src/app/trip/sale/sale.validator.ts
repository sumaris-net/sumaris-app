import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormGroup, Validators } from '@angular/forms';
import { fromDateISOString, isNotNil, SharedFormGroupValidators, SharedValidators, toBoolean, toNumber } from '@sumaris-net/ngx-components';
import { Sale } from './sale.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { Moment } from 'moment';
import { DateAdapter } from '@angular/material/core';

export interface SaleValidatorOptions extends DataRootEntityValidatorOptions {
  required?: boolean;
  withProgram?: boolean;
  withVessel?: boolean;
  minDate?: Moment;
}

@Injectable({ providedIn: 'root' })
export class SaleValidatorService<O extends SaleValidatorOptions = SaleValidatorOptions> extends DataRootEntityValidatorService<
  Sale,
  SaleValidatorOptions
> {
  constructor(protected dateAdapter: DateAdapter<Moment>) {
    super();
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

    // Re add group validators
    const formGroupOptions = this.getFormGroupOptions(null, opts);
    form.setValidators(formGroupOptions?.validators);

    return form;
  }

  /* -- fill options defaults -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = opts || ({} as O);

    opts.isOnFieldMode = isNotNil(opts.isOnFieldMode) ? opts.isOnFieldMode : this.settings?.isOnFieldMode() || false;

    opts.required = toBoolean(opts.required, true);

    opts.withProgram = toBoolean(opts.withProgram, true);

    opts.withVessel = toBoolean(opts.withVessel, true);

    return opts;
  }
}
