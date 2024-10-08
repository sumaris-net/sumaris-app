import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { IReferentialRef, isNotNil, LoadResult } from '@sumaris-net/ngx-components';
import { MeasurementValuesForm } from '@app/data/measurement/measurement-values.form.class';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { IWithProductsEntity, Product } from '@app/trip/product/product.model';
import { ProductValidatorService } from '@app/trip/product/product.validator';
import { RxState } from '@rx-angular/state';

@Component({
  selector: 'app-product-form',
  templateUrl: './product.form.html',
  styleUrls: ['./product.form.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductForm extends MeasurementValuesForm<Product> implements OnInit {
  readonly mobile: boolean;

  @Input() tabindex: number;
  @Input() showComment = false;
  @Input() showError = true;
  @Input() parents: IWithProductsEntity<any>[];
  @Input() parentAttributes: string[];

  constructor(protected validatorService: ProductValidatorService) {
    super(
      validatorService.getFormGroup(null, {
        withMeasurements: false,
      })
    );

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;

    this.mobile = this.settings.mobile;
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Default values
    this.tabindex = isNotNil(this.tabindex) ? this.tabindex : 1;

    this.registerAutocompleteField('parent', {
      items: this.parents,
      attributes: this.parentAttributes,
      columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
      columnSizes: this.parentAttributes.map((attr) => (attr === 'metier.label' ? 3 : attr === 'rankOrderOnPeriod' ? 1 : undefined)),
      mobile: this.mobile,
    });

    const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
    this.registerAutocompleteField('taxonGroup', {
      suggestFn: (value: any, options?: any) => this.suggestTaxonGroups(value, options),
      columnSizes: taxonGroupAttributes.map((attr) => (attr === 'label' ? 3 : undefined)),
      mobile: this.mobile,
    });
  }

  /* -- protected methods -- */

  protected async suggestTaxonGroups(value: any, options?: any): Promise<LoadResult<IReferentialRef>> {
    return this.programRefService.suggestTaxonGroups(value, {
      program: this.programLabel,
      searchAttribute: options && options.searchAttribute,
    });
  }
}
