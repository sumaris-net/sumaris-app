import { MeasurementsValidatorOptions, MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { inject, Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Measurement, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { AppFormArray, isEmptyArray, LocalSettingsService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class ExpenseValidatorService extends MeasurementsValidatorService {
  constructor(formBuilder: UntypedFormBuilder, translate: TranslateService, settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data: Measurement[], opts?: MeasurementsValidatorOptions): { [p: string]: any } {
    return Object.assign(super.getFormGroupConfig(data, opts), {
      calculatedTotal: [null],
      baits: this.getBaitsFormArray(data),
      gears: this.getGearsFormArray(data),
    });
  }

  protected fillDefaultOptions(opts?: MeasurementsValidatorOptions): MeasurementsValidatorOptions {
    opts = super.fillDefaultOptions(opts);

    // add expense fields as protected attributes
    opts.protectedAttributes.push('calculatedTotal', 'baits');
    opts.protectedAttributes.push('calculatedTotal', 'gears');

    return opts;
  }

  getBaitsFormArray(data?: Measurement[]) {
    const array = new AppFormArray<Measurement, UntypedFormGroup>(
      (value) => this.getBaitControl(),
      (v1, v2) => MeasurementUtils.equals([v1], [v2]),
      MeasurementUtils.isEmpty,
      {
        allowEmptyArray: false,
      },
    );

    if (isEmptyArray(data)) {
      array.setValue([{ rankOrder: 1 }]);
    }

    return array;
  }

  getBaitControl(data?: Measurement): UntypedFormGroup {
    return this.formBuilder.group({
      rankOrder: [data?.rankOrder || 1],
    });
  }

  getGearsFormArray(data?: Measurement[]) {
    const array = new AppFormArray<Measurement, UntypedFormGroup>(
      (value) => this.getGearControl(),
      (v1, v2) => MeasurementUtils.equals([v1], [v2]),
      MeasurementUtils.isEmpty,
      {
        allowEmptyArray: false,
      }
    );
    if (isEmptyArray(data)) {
      array.setValue([{ rankOrder: 1 }]);
    }

    return array;
  }

  getGearControl(data?: number): UntypedFormGroup {
    return this.formBuilder.group({
      rankOrder: [data || 1],
    });
  }
}
