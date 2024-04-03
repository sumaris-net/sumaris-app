import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import {
  fromDateISOString,
  isNotNil,
  LocalSettingsService,
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
  minDate?: Moment;
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
    const config = Object.assign(super.getFormGroupConfig(data), {
      __typename: [Sale.TYPENAME],
      vesselSnapshot: [
        (data && data.vesselSnapshot) || null,
        !opts?.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity]),
      ],
      saleType: [
        (data && data.saleType) || null,
        !opts.required ? SharedValidators.entity : Validators.compose([Validators.required, SharedValidators.entity]),
      ],
      startDateTime: [(data && data.startDateTime) || null],
      endDateTime: [(data && data.endDateTime) || null, SharedValidators.dateRangeEnd('startDateTime')],
      saleLocation: [(data && data.saleLocation) || null, SharedValidators.entity],

      // Parent id
      tripId: [toNumber(data?.tripId, null)],
      landingId: [toNumber(data?.landingId, null)],
    });

    return config;
  }

  getFormGroupOptions(data?: Sale, opts?: SaleValidatorOptions): AbstractControlOptions {
    return <AbstractControlOptions>{
      validator: Validators.compose([
        SharedFormGroupValidators.requiredIf('saleLocation', 'saleType'),
        SharedFormGroupValidators.requiredIf('startDateTime', 'saleType'),
      ]),
    };
  }

  updateFormGroup(form: UntypedFormGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const vesselSnapshotControl = form.controls['vesselSnapshot'];
    const saleTypeControl = form.controls['saleType'];
    if (opts.required === true) {
      if (!vesselSnapshotControl.hasValidator(Validators.required)) vesselSnapshotControl.addValidators(Validators.required);
      if (!saleTypeControl.hasValidator(Validators.required)) saleTypeControl.addValidators(Validators.required);
    } else {
      if (vesselSnapshotControl.hasValidator(Validators.required)) vesselSnapshotControl.removeValidators(Validators.required);
      if (saleTypeControl.hasValidator(Validators.required)) saleTypeControl.removeValidators(Validators.required);
    }

    if (opts.minDate) {
      const minDate = fromDateISOString(opts.minDate);
      const minDateStr = this.dateAdapter.format(minDate, this.translate.instant('COMMON.DATE_TIME_PATTERN'));
      form.controls['startDateTime'].setValidators(SharedValidators.dateIsAfter(minDate, minDateStr));
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

    opts.withProgram = toBoolean(opts.withProgram, false);

    return opts;
  }
}
