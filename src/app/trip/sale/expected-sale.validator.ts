import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LocalSettingsService, SharedValidators } from '@sumaris-net/ngx-components';
import { ExpectedSale } from '@app/trip/sale/expected-sale.model';
import { DataEntityValidatorOptions, DataEntityValidatorService } from '@app/data/services/validator/data-entity.validator';
import { TranslateService } from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class ExpectedSaleValidatorService
  extends DataEntityValidatorService<ExpectedSale> {

  constructor(
    formBuilder: FormBuilder,
    translate: TranslateService,
    settings: LocalSettingsService) {
    super(formBuilder, translate, settings);
  }

  getFormGroup(data?: ExpectedSale, opts?: DataEntityValidatorOptions): FormGroup {
    opts = this.fillDefaultOptions(opts);
    return this.formBuilder.group(
      this.getFormGroupConfig(data, opts),
      this.getFormGroupOptions(data, opts)
    );
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
