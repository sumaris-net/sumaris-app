import { MeasurementsValidatorOptions, MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Injectable } from '@angular/core';
import { AbstractControlOptions, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Measurement } from '@app/data/measurement/measurement.model';
import { SharedFormGroupValidators, SharedValidators } from '@sumaris-net/ngx-components';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

interface TypedExpenseValidatorOptions extends MeasurementsValidatorOptions {
  typePmfm?: IPmfm;
  totalPmfm?: IPmfm;
}

@Injectable({ providedIn: 'root' })
export class TypedExpenseValidatorService extends MeasurementsValidatorService<Measurement, TypedExpenseValidatorOptions> {
  constructor() {
    super();
  }

  getFormGroupConfig(data: Measurement[], opts?: TypedExpenseValidatorOptions): { [p: string]: any } {
    return Object.assign(super.getFormGroupConfig(data, opts), {
      amount: [null, Validators.compose([SharedValidators.decimal({ maxDecimals: 2 }), Validators.min(0)])],
      packaging: [null, SharedValidators.entity],
    });
  }

  getFormGroupOptions(data?: Measurement[], opts?: TypedExpenseValidatorOptions): AbstractControlOptions {
    return {
      validators: this.getDefaultValidators(),
    };
  }

  getDefaultValidators(): ValidatorFn[] {
    return [SharedFormGroupValidators.requiredIf('packaging', 'amount'), SharedFormGroupValidators.requiredIf('amount', 'packaging')];
  }

  updateFormGroup(form: UntypedFormGroup, opts?: TypedExpenseValidatorOptions) {
    super.updateFormGroup(form, opts);

    // add formGroup validator for type requirement
    const additionalValidators: ValidatorFn[] = [];
    if (opts.typePmfm) {
      additionalValidators.push(SharedFormGroupValidators.requiredIf(opts.typePmfm.id.toString(), 'amount'));
      if (opts.totalPmfm) {
        additionalValidators.push(SharedFormGroupValidators.requiredIf(opts.typePmfm.id.toString(), opts.totalPmfm.id.toString()));
      }
    }
    if (additionalValidators.length) {
      form.setValidators(this.getDefaultValidators().concat(...additionalValidators));
    }
  }

  protected fillDefaultOptions(opts?: TypedExpenseValidatorOptions): TypedExpenseValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    // add expense fields as protected attributes
    opts.protectedAttributes.push('amount', 'packaging');

    return opts;
  }
}
