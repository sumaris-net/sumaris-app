import { Injectable } from '@angular/core';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { PacketComposition, PacketIndexes } from './packet.model';
import { ValidatorService } from '@e-is/ngx-material-table';
import { Validators } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';

@Injectable({ providedIn: 'root' })
export class PacketCompositionValidatorService extends DataEntityValidatorService<PacketComposition> implements ValidatorService {
  constructor() {
    super();
  }

  getFormGroupConfig(data?: PacketComposition, opts?: DataEntityValidatorOptions): { [p: string]: any } {
    const formConfig = Object.assign(super.getFormGroupConfig(data, opts), {
      __typename: [PacketComposition.TYPENAME],
      rankOrder: [data?.rankOrder || null],
      taxonGroup: [data?.taxonGroup || null, Validators.compose([Validators.required, SharedValidators.entity])],
      weight: [data?.weight || null, null],
    });

    // add ratios
    PacketIndexes.forEach((index) => {
      formConfig['ratio' + index] = [
        data?.['ratio' + index] || null,
        Validators.compose([SharedValidators.integer, Validators.min(0), Validators.max(100)]),
      ];
    });

    return formConfig;
  }
}
