import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Product } from '../product/product.model';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AppForm, AppFormUtils, FormArrayHelper, isNotEmptyArray, isNotNil, UsageMode } from '@sumaris-net/ngx-components';
import { ProductValidatorService } from '../product/product.validator';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Subscription } from 'rxjs';
import { SaleProduct, SaleProductUtils } from './sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

@Component({
  selector: 'app-product-sale-form',
  templateUrl: './product-sale.form.html',
  styleUrls: ['./product-sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductSaleForm extends AppForm<Product> implements OnInit, OnDestroy {
  private _saleSubscription: Subscription;
  private _data: Product;

  computing = false;
  salesHelper: FormArrayHelper<SaleProduct>;
  salesFocusIndex = -1;
  salesEditedIndex: number;
  hasIndividualCount: boolean;

  get saleFormArray(): UntypedFormArray {
    return this.form.controls.saleProducts as UntypedFormArray;
  }

  get value(): any {
    const json = this.form.value;

    // Convert products sales to products
    json.saleProducts = (json.saleProducts || []).map((saleProduct) =>
      SaleProductUtils.saleProductToProduct(this._data, saleProduct, this.productSalePmfms, { keepId: true })
    );

    return json;
  }

  @Input() mobile: boolean;
  @Input() showError = true;
  @Input() usageMode: UsageMode;
  @Input() productSalePmfms: DenormalizedPmfmStrategy[];

  constructor(
    protected validatorService: ProductValidatorService,
    protected formBuilder: UntypedFormBuilder,
    protected referentialRefService: ReferentialRefService
  ) {
    super(validatorService.getFormGroup(undefined, { withSaleProducts: true }));
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
        entityName: 'SaleType',
      },
      showAllOnFocus: true,
      mobile: this.mobile,
    });

    this.registerSubscription(
      this.form.get('individualCount').valueChanges.subscribe((value) => {
        this.hasIndividualCount = isNotNil(value);
        this.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    this._saleSubscription?.unsubscribe();
    super.ngOnDestroy();
  }

  async setValue(data: Product, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    if (!data) return;
    this._data = data;

    // Initialize product sales by converting products to sale products
    data.saleProducts = isNotEmptyArray(data.saleProducts)
      ? data.saleProducts.map((p) => SaleProductUtils.productToSaleProduct(p, this.productSalePmfms))
      : [null];
    this.salesHelper.resize(Math.max(1, data.saleProducts.length));

    super.setValue(data, opts);

    // update saleFromArray validators
    this.validatorService.updateFormGroup(this.form, { withSaleProducts: true });

    this.computeAllPrices();

    this.initSubscription();
  }

  private initSubscription() {
    // clear and re-create
    this._saleSubscription?.unsubscribe();
    this._saleSubscription = new Subscription();

    // add subscription on each sale form
    for (const saleForm of (this.saleFormArray.controls as UntypedFormGroup[]) || []) {
      this._saleSubscription.add(
        saleForm.valueChanges.subscribe(() => {
          const dirty = saleForm.dirty;
          this.computePrices(saleForm.controls);

          // Restore previous state - fix OBSDEB bug
          if (!dirty) saleForm.markAsPristine();
        })
      );
    }
  }

  private computeAllPrices() {
    for (const saleForm of (this.saleFormArray.controls as UntypedFormGroup[]) || []) {
      this.computePrices(saleForm.controls);
    }
  }

  computePrices(controls: { [key: string]: AbstractControl }) {
    if (this.computing) return;

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
        validators: this.validatorService.getDefaultSaleProductValidators(),
      }
    );
    if (this.salesHelper.size() === 0) {
      // add at least one sale
      this.salesHelper.resize(1);
    }
    this.markForCheck();
  }

  asFormGroup(control): UntypedFormGroup {
    return control;
  }

  addSale(event?: Event) {
    event?.stopPropagation();
    this.salesHelper.add();

    this.initSubscription();

    this.editSale(this.salesHelper.size() - 1);
  }

  removeSale(index: number) {
    this.salesHelper.removeAt(index);
    this.initSubscription();

    this.editSale(index - 1, { focus: false });
  }

  editSale(index: number, opts = { focus: true }) {
    const maxIndex = this.salesHelper.size() - 1;
    if (index < 0) {
      index = 0;
    } else if (index > maxIndex) {
      index = maxIndex;
    }
    if (this.salesEditedIndex === index) return; // Skip if same

    this.salesEditedIndex = index;
    this.markForCheck();

    // Focus
    if (!this.mobile && (!opts || opts.focus !== false)) {
      this.salesFocusIndex = index;
      setTimeout(() => {
        this.salesFocusIndex = undefined;
        this.markForCheck();
      }, 500);
    }
  }
}
