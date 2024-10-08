import { MeasurementsValidatorOptions, MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Injectable } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Measurement } from '@app/data/measurement/measurement.model';

@Injectable({ providedIn: 'root' })
export class ExpenseValidatorService extends MeasurementsValidatorService {
  constructor() {
    super();
  }

  getFormGroupConfig(data: Measurement[], opts?: MeasurementsValidatorOptions): { [p: string]: any } {
    return Object.assign(super.getFormGroupConfig(data, opts), {
      calculatedTotal: [null],
      baits: this.getBaitsFormArray(),
    });
  }

  protected fillDefaultOptions(opts?: MeasurementsValidatorOptions): MeasurementsValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    // add expense fields as protected attributes
    opts.protectedAttributes.push('calculatedTotal', 'baits');

    return opts;
  }

  getBaitsFormArray() {
    return this.formBuilder.array([this.getBaitControl()]);
  }

  getBaitControl(data?: number): UntypedFormGroup {
    return this.formBuilder.group({
      rankOrder: [data || 1],
    });
  }
}
