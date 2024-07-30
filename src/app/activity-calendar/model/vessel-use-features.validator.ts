import { Injectable } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { LocalSettingsService, toNumber } from '@sumaris-net/ngx-components';
import { MeasurementsValidatorService } from '@app/data/measurement/measurement.validator';
import { VesselUseFeatures } from './vessel-use-features.model';
import { DataRootEntityValidatorOptions } from '@app/data/services/validator/root-data-entity.validator';
import { FishingAreaValidatorService } from '@app/data/fishing-area/fishing-area.validator';
import { TranslateService } from '@ngx-translate/core';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { ValidatorService } from '@e-is/ngx-material-table';

export interface VesselUseFeaturesValidatorOptions extends DataRootEntityValidatorOptions {
  withMeasurements?: boolean;
  withMeasurementTypename?: boolean;

  pmfms?: IPmfm[];

  withMetier?: boolean;
  requiredMetier?: boolean;
  withGear?: boolean; // false by default (not used in ActivityCalendar)
  requiredGear?: boolean;
  withFishingAreas?: boolean;
  requiredFishingAreas?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VesselUseFeaturesValidatorService<O extends VesselUseFeaturesValidatorOptions = VesselUseFeaturesValidatorOptions>
  extends DataEntityValidatorService<VesselUseFeatures, O>
  implements ValidatorService
{
  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService,
    protected fishingAreaValidator: FishingAreaValidatorService,
    protected measurementsValidatorService: MeasurementsValidatorService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: VesselUseFeatures, opts?: O): UntypedFormGroup {
    opts = this.fillDefaultOptions(opts);

    const form = super.getFormGroup(data, opts);
    return form;
  }

  getFormGroupConfig(data?: VesselUseFeatures, opts?: O): { [key: string]: any } {
    const config = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [VesselUseFeatures.TYPENAME],
      isActive: [toNumber(data?.isActive, null)],
    });

    return config;
  }
}
