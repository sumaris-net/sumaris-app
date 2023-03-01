import {Injectable} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {AbstractControlOptions, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {LocalSettingsService, SharedValidators, toBoolean, toNumber} from '@sumaris-net/ngx-components';
import {PhysicalGear} from '@app/trip/physicalgear/physical-gear.model';
import {DataRootEntityValidatorService} from '@app/data/services/validator/root-data-entity.validator';
import {TranslateService} from '@ngx-translate/core';
import {AcquisitionLevelType} from '@app/referential/services/model/model.enum';
import {DenormalizedPmfmStrategy} from '@app/referential/services/model/pmfm-strategy.model';
import {Program} from '@app/referential/services/model/program.model';
import {MeasurementsValidatorService} from '@app/trip/services/validator/measurement.validator';
import {ProgramProperties} from '@app/referential/services/config/program.config';
import {MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils} from '@app/trip/services/model/measurement.model';
import {IPmfm} from '@app/referential/services/model/pmfm.model';


export interface PhysicalGearValidatorOptions {
  program?: Program;
  withMeasurementValues?: boolean;
  withChildren?: boolean;
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
    opts = opts || <PhysicalGearValidatorOptions>{};

    const form = super.getFormGroup(data, opts);

    // Add measurement values form
    if (opts.withMeasurementValues) {
      form.setControl('measurementValues', this.getMeasurementValuesForm(data?.measurementValues, {
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
      (data || []).map(child => this.getFormGroup(child, {...opts,
        withChildren: false, // Allow only one level allowed
        acquisitionLevel: 'CHILD_PHYSICAL_GEAR' // Force the acquisition level
      }))
    );
  }

  protected getMeasurementValuesForm(data: undefined|MeasurementFormValues|MeasurementModelValues, opts: {pmfms: IPmfm[]; forceOptional?: boolean, withTypename?: boolean}) {
    const measurementValues = data && MeasurementValuesUtils.normalizeValuesToForm(data, opts.pmfms);
    return this.measurementsValidatorService.getFormGroup(measurementValues, opts);
  }

  protected fillDefaultOptions(opts?: PhysicalGearValidatorOptions): PhysicalGearValidatorOptions {

    opts = super.fillDefaultOptions(opts);

    opts.withChildren = toBoolean(opts.withChildren, toBoolean(opts.program?.getPropertyAsBoolean(ProgramProperties.TRIP_PHYSICAL_GEAR_ALLOW_CHILDREN), false));

    return
  }
}
