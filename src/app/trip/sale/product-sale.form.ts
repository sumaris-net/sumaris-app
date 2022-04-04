import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Product } from '../services/model/product.model';
import { AbstractControl, FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { AppForm, AppFormUtils, FormArrayHelper, isNotEmptyArray, isNotNil, LocalSettingsService, UsageMode } from '@sumaris-net/ngx-components';
import { Injector } from '@angular/core';
import { Moment } from 'moment';
import { ProductValidatorService } from '../services/validator/product.validator';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Subscription } from 'rxjs';
import { SaleProduct, SaleProductUtils } from '../services/model/sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

@Component({
  selector: 'app-product-sale-form',
  templateUrl: './product-sale.form.html',
  styleUrls: ['./product-sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSaleForm extends AppForm<Product> implements OnInit, OnDestroy {

  computing = false;
  salesHelper: FormArrayHelper<SaleProduct>;
  salesFocusIndex = -1;
  private saleSubscription = new Subscription();

  get saleFormArray(): FormArray {
    return this.form.controls.saleProducts as FormArray;
  }

  mobile: boolean;
  adding = false;
  private _product: Product;

  @Input() showError = true;
  @Input() usageMode: UsageMode;
  @Input() productSalePmfms: DenormalizedPmfmStrategy[];

  get value(): any {
    const json = this.form.value;

    // Convert products sales to products
    json.saleProducts = (json.saleProducts || []).map(saleProduct => SaleProductUtils.saleProductToProduct(this._product, saleProduct, this.productSalePmfms, {keepId: true}));

    return json;
  }

  constructor(
    injector: Injector,
    protected validatorService: ProductValidatorService,
    protected cd: ChangeDetectorRef,
    protected formBuilder: FormBuilder,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector, validatorService.getFormGroup(undefined, {withSaleProducts: true}));
  }

  ngOnInit() {
    super.ngOnInit();

    this.initSalesHelper();

    this.usageMode = this.usageMode || this.settings.usageMode;

    // Combo: sale types
    this.registerAutocompleteField('saleType', {
      service: this.referentialRefService,
      attributes: ['name'],
      filter: {
        entityName: 'SaleType'
      },
      mobile: this.mobile
    });

  }

  async setValue(data: Product, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {

    if (!data) return;
    this._product = data;

    // Initialize product sales by converting products to sale products
    data.saleProducts = isNotEmptyArray(data.saleProducts) ? data.saleProducts.map(p => SaleProductUtils.productToSaleProduct(p, this.productSalePmfms)) : [null];
    this.salesHelper.resize(Math.max(1, data.saleProducts.length));

    super.setValue(data, opts);

    // update saleFromArray validators
    this.validatorService.updateFormGroup(this.form, {withSaleProducts: true});

    this.computeAllPrices();

    this.initSubscription();
  }

  private initSubscription() {

    // clear and re-create
    this.saleSubscription.unsubscribe();
    this.saleSubscription = new Subscription();

    // add subscription on each sale form
    for (const saleControl of this.saleFormArray.controls) {
      this.saleSubscription.add(saleControl.valueChanges.subscribe(() => {
        this.computePrices(this.asFormGroup(saleControl).controls);
        saleControl.markAsPristine();
      }));
    }

  }

  private computeAllPrices() {
    for (const sale of this.saleFormArray.controls as FormGroup[] || []) {
      this.computePrices(sale.controls);
    }
  }

  computePrices(controls: { [key: string]: AbstractControl }) {

    if (this.computing)
      return;

    try {
      this.computing = true;

      SaleProductUtils.computeSaleProduct(
        this.form.value,
        controls,
        (object, valueName) => AppFormUtils.isControlHasInput(object, valueName),
        (object, valueName) => object[valueName].value,
        (object, valueName, value1) => AppFormUtils.setCalculatedValue(object, valueName, value1),
        (object, valueName) => AppFormUtils.resetCalculatedValue(object, valueName),
        true,
        'individualCount'
      );

    } finally {
      this.computing = false;
    }

  }

  isProductWithNumber(): boolean {
    return isNotNil(this.form.value.individualCount);
  }

  isProductWithWeight(): boolean {
    return isNotNil(this.form.value.weight);
  }

  private initSalesHelper() {
    this.salesHelper = new FormArrayHelper<SaleProduct>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'saleProducts'),
      (saleProduct) => this.validatorService.getSaleProductControl(saleProduct),
      SaleProductUtils.isSaleProductEquals,
      SaleProductUtils.isSaleProductEmpty,
      {
        allowEmptyArray: true,
        validators: this.validatorService.getDefaultSaleProductValidators()
      }
    );
    if (this.salesHelper.size() === 0) {
      // add at least one sale
      this.salesHelper.resize(1);
    }
    this.markForCheck();

  }

  asFormGroup(control): FormGroup {
    return control;
  }

  addSale() {
    this.salesHelper.add();
    this.initSubscription();
    if (!this.mobile) {
      this.salesFocusIndex = this.salesHelper.size() - 1;
    }
    this.adding = true;
  }

  removeSale(index: number) {
    this.salesHelper.removeAt(index);
    this.initSubscription();
    this.adding = false;
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  ngOnDestroy() {
    this.saleSubscription.unsubscribe();
    super.ngOnDestroy();
  }
}
