import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AppForm, AppFormProvider, firstNotNilPromise, isNotNil, LocalSettingsService, round } from '@sumaris-net/ngx-components';
import { ProductsTable } from '../product/products.table';
import { MeasurementsForm } from '../measurement/measurements.form.component';
import { ExpectedSale } from '@app/trip/services/model/expected-sale.model';
import { Product } from '@app/trip/services/model/product.model';
import { SaleProductUtils } from '@app/trip/services/model/sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MeasurementValuesUtils } from '@app/trip/services/model/measurement.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-expected-sale-form',
  templateUrl: './expected-sale.form.html',
  styleUrls: ['./expected-sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpectedSaleForm extends AppFormProvider<MeasurementsForm> implements OnInit {

  readonly debug = !environment.production;

  @Input() programLabel: string;
  @Input() showError = false;
  @Input() mobile: boolean;

  @ViewChild('saleMeasurementsForm', {static: true}) saleMeasurementsForm: MeasurementsForm;
  @ViewChild('productsTable', {static: true}) productsTable: ProductsTable;

  data: ExpectedSale;
  totalPriceCalculated: number;

  get value(): ExpectedSale {
    return this.getValue();
  }

  set value(data: ExpectedSale) {
    this.setValue(isNotNil(data) ? data : new ExpectedSale());
  }

  constructor(
    protected injector: Injector,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    super(() => this.saleMeasurementsForm);
  }

  ngOnInit() {
    this.productsTable.disable(); // Readonly
  }

  setValue(data: ExpectedSale, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    this.data = data;

    this.saleMeasurementsForm.value = data.measurements || [];

    this.updateProducts(data.products);
  }

  getValue() {
    this.data.measurements = this.saleMeasurementsForm.value;
    this.data.products = null; // don't return readonly table value
    return this.data;
  }

  async updateProducts(value: Product[]) {

    const pmfms = (await firstNotNilPromise(this.productsTable.$pmfms))
      .map(pmfm => DenormalizedPmfmStrategy.fromObject(pmfm));
    let products = (value || []).slice();
    this.totalPriceCalculated = 0;

    // compute prices
    products = products.map(product => {
      const saleProduct = SaleProductUtils.productToSaleProduct(product, pmfms);
      SaleProductUtils.computeSaleProduct(
        product,
        saleProduct,
        (object, valueName) => !!object[valueName],
        (object, valueName) => object[valueName],
        (object, valueName, value) => object[valueName] = round(value),
        (object, valueName) => object[valueName] = undefined,
        true,
        'individualCount'
      );
      const target = {...product, ...saleProduct};
      target.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(target.measurementValues, pmfms);

      // add measurements for each calculated or non calculated values
      MeasurementValuesUtils.setValue(target.measurementValues, pmfms, PmfmIds.AVERAGE_WEIGHT_PRICE, saleProduct.averageWeightPrice);
      MeasurementValuesUtils.setValue(target.measurementValues, pmfms, PmfmIds.AVERAGE_PACKAGING_PRICE, saleProduct.averagePackagingPrice);
      MeasurementValuesUtils.setValue(target.measurementValues, pmfms, PmfmIds.TOTAL_PRICE, saleProduct.totalPrice);
      this.totalPriceCalculated += saleProduct.totalPrice;

      return Product.fromObject(target);
    })

    if (this.totalPriceCalculated == 0) this.totalPriceCalculated = undefined;

    // populate table
    this.productsTable.value = products;

  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

}
