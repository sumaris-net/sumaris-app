import { MeasurementsValidatorOptions, MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Measurement } from '@app/data/measurement/measurement.model';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class ExpenseValidatorService extends MeasurementsValidatorService {
  constructor(formBuilder: UntypedFormBuilder, translate: TranslateService, settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data: Measurement[], opts?: MeasurementsValidatorOptions): { [p: string]: any } {
    return Object.assign(super.getFormGroupConfig(data, opts), {
      calculatedTotal: [null],
      baits: this.getBaitsFormArray(),
      gears: this.getGearsFormArray(),
    });
  }

  protected fillDefaultOptions(opts?: MeasurementsValidatorOptions): MeasurementsValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    // add expense fields as protected attributes
    opts.protectedAttributes.push('calculatedTotal', 'baits');
    opts.protectedAttributes.push('calculatedTotal', 'gears');

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

  getGearsFormArray() {
    return this.formBuilder.array([this.getGearControl()]);
  }

  getGearControl(data?: number): UntypedFormGroup {
    return this.formBuilder.group({
      rankOrder: [data || 1],
    });
  }
}
