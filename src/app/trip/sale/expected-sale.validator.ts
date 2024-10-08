import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { SharedValidators } from '@sumaris-net/ngx-components';
import { ExpectedSale } from '@app/trip/sale/expected-sale.model';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';

@Injectable({ providedIn: 'root' })
export class ExpectedSaleValidatorService extends DataEntityValidatorService<ExpectedSale> {
  constructor() {
    super();
  }

  getFormGroup(data?: ExpectedSale, opts?: DataEntityValidatorOptions): FormGroup {
    opts = this.fillDefaultOptions(opts);
    return this.formBuilder.group(this.getFormGroupConfig(data, opts), this.getFormGroupOptions(data, opts));
  }

  getFormGroupConfig(data?: ExpectedSale, opts?: DataEntityValidatorOptions): { [key: string]: any } {
    return {
      __typename: [ExpectedSale.TYPENAME],
      id: [data?.id || null],
      updateDate: [data?.updateDate || null],
      saleType: [data?.saleType || null, SharedValidators.entity],
      saleDate: [data?.saleDate || null],
      saleLocation: [data?.saleLocation || null, SharedValidators.entity],
    };
  }
}
