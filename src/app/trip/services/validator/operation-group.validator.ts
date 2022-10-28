import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toBoolean } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { MeasurementsValidatorService } from './measurement.validator';
import { Program } from '@app/referential/services/model/program.model';
import { OperationGroup } from '../model/trip.model';

export interface OperationGroupValidatorOptions extends DataEntityValidatorOptions {
  program?: Program;
  withMeasurements?: boolean;
}

@Injectable({providedIn: 'root'})
export class OperationGroupValidatorService<O extends OperationGroupValidatorOptions = OperationGroupValidatorOptions>
  extends DataEntityValidatorService<OperationGroup, O> implements ValidatorService {

  constructor(
    formBuilder: UntypedFormBuilder,
    settings: LocalSettingsService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, settings);
  }

  getRowValidator(): UntypedFormGroup {
    return this.getFormGroup();
  }

  getFormGroup(data?: OperationGroup, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);

    // Add measurement form
    // if (opts.withMeasurements) {
    //   const pmfms = (opts.program?.strategies?.[0]?.denormalizedPmfms || [])
    //     .filter(p => p.acquisitionLevel === AcquisitionLevelCodes.OPERATION);
    //   form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
    //     isOnFieldMode: opts.isOnFieldMode,
    //     pmfms
    //   }));
    // }

    return form;
  }

  getFormGroupConfig(data?: OperationGroup, opts?: O): { [key: string]: any } {

    return Object.assign(
      super.getFormGroupConfig(data, opts),
      {
        __typename: [OperationGroup.TYPENAME],
        rankOrderOnPeriod: [data?.rankOrderOnPeriod || null],
        metier: [data?.metier || null, Validators.compose([Validators.required, SharedValidators.entity])],
        physicalGearId: [data?.physicalGearId || null],
        measurementValues: this.formBuilder.group({}),
        comments: [data?.comments || null, Validators.maxLength(2000)]
      });
  }

  /* -- protected methods -- */

  protected fillDefaultOptions(opts?: O): O {
    opts = super.fillDefaultOptions(opts);

    opts.withMeasurements = toBoolean(opts.withMeasurements, toBoolean(!!opts.program, false));
    //console.debug("[operation-validator] Ope Validator will use options:", opts);

    return opts;
  }

}
