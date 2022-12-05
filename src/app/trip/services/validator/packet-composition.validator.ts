import {Injectable} from '@angular/core';
import {DataEntityValidatorOptions, DataEntityValidatorService} from '@app/data/services/validator/data-entity.validator';
import {PacketComposition, PacketIndexes} from '../model/packet.model';
import {ValidatorService} from '@e-is/ngx-material-table';
import {UntypedFormBuilder, Validators} from '@angular/forms';
import {LocalSettingsService, SharedValidators} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class PacketCompositionValidatorService
  extends DataEntityValidatorService<PacketComposition> implements ValidatorService {

  constructor(
    formBuilder: UntypedFormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService
  ) {
    super(formBuilder, translate, settings);
  }

  getFormGroupConfig(data?: PacketComposition, opts?: DataEntityValidatorOptions): { [p: string]: any } {

    const formConfig = Object.assign(
        super.getFormGroupConfig(data, opts),
        {
          __typename: [PacketComposition.TYPENAME],
          rankOrder: [data?.rankOrder || null],
          taxonGroup: [data?.taxonGroup || null, Validators.compose([Validators.required, SharedValidators.entity])],
          weight: [data?.weight || null, null],
        });

    // add ratios
    PacketIndexes.forEach(index => {
      formConfig['ratio'+index] = [data?.['ratio'+index] || null, Validators.compose([SharedValidators.integer, Validators.min(0), Validators.max(100)])];
    })

    return formConfig;
  }
}
