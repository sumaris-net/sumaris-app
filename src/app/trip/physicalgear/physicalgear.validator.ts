import { Injectable } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AbstractControlOptions, UntypedFormArray, UntypedFormBuilder, FormGroup, Validators, UntypedFormGroup } from '@angular/forms';
import { LocalSettingsService, SharedValidators, toNumber } from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { DataRootEntityValidatorOptions, DataRootEntityValidatorService } from '@app/data/services/validator/root-data-entity.validator';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes, AcquisitionLevelType } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { Program } from '@app/referential/services/model/program.model';
import { DataEntityValidatorOptions } from '@app/data/services/validator/data-entity.validator';
import { MeasurementsValidatorService } from '@app/trip/services/validator/measurement.validator';


export interface PhysicalGearValidatorOptions extends DataEntityValidatorOptions {
  program?: Program;
  withChildren?: boolean;
  withMeasurements?: boolean;
  pmfms?: DenormalizedPmfmStrategy[];
  acquisitionLevel?: AcquisitionLevelType;
}

@Injectable({providedIn: 'root'})
export class PhysicalGearValidatorService
  extends DataRootEntityValidatorService<PhysicalGear, PhysicalGearValidatorOptions>
  implements ValidatorService {

  constructor(formBuilder: UntypedFormBuilder,
              translate: TranslateService,
              protected measurementsValidatorService: MeasurementsValidatorService,
              settings?: LocalSettingsService,
              ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: PhysicalGear, opts?: PhysicalGearValidatorOptions): UntypedFormGroup {
    const form = super.getFormGroup(data, opts);

    // Add measurement form
    if (opts.withMeasurements) {
      if (!opts.pmfms) {
        const acquisitionLevel = opts.isChild ? AcquisitionLevelCodes.CHILD_OPERATION : AcquisitionLevelCodes.OPERATION;
        opts.pmfms = (opts.program?.strategies?.[0] && opts.program.strategies[0].denormalizedPmfms || [])
          .filter(p => p.acquisitionLevel === acquisitionLevel);
      }
      form.addControl('measurements', this.measurementsValidatorService.getFormGroup(data && data.measurements, {
        forceOptional: opts.isOnFieldMode,
        pmfms: opts.pmfms
      }));
    }

    return form;
  }

  getFormGroupConfig(data?: PhysicalGear, opts?: PhysicalGearValidatorOptions): { [key: string]: any } {
    const config = {
      ...super.getFormGroupConfig(data, opts),
      __typename: [PhysicalGear.TYPENAME],
      rankOrder: [toNumber(data?.rankOrder, null), Validators.compose([Validators.required, SharedValidators.integer, Validators.min(1)])],
      gear: [data?.gear || null, Validators.compose([Validators.required, SharedValidators.entity])],
      measurementValues: this.formBuilder.group({}),
      tripId: [toNumber(data?.tripId, null)]
    };

    // Change program is optional
    config['program'] = [data?.program || null];

    if (!opts || opts.withChildren !== false) {
      config['children'] = this.getChildrenArray(data?.children, opts);
    }

    return config;
  }

  getFormGroupOptions(data?: PhysicalGear, opts?: PhysicalGearValidatorOptions): AbstractControlOptions | null {
    return null;
  }

  getChildrenArray(data?: PhysicalGear[], opts?: PhysicalGearValidatorOptions): UntypedFormArray {
    return this.formBuilder.array(
      (data || []).map(child => this.getFormGroup(child, {...opts, withChildren: false /*Allow only one level*/}))
    );
  }
}
