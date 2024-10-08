import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AppForm, AppFormUtils, FormArrayHelper, isNotEmptyArray, UsageMode } from '@sumaris-net/ngx-components';
import { PacketValidatorService } from '../packet/packet.validator';
import { Packet } from '../packet/packet.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Subscription } from 'rxjs';
import { fillRankOrder } from '@app/data/services/model/model.utils';
import { SaleProduct, SaleProductUtils } from './sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';

// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

@Component({
  selector: 'app-packet-sale-form',
  templateUrl: './packet-sale.form.html',
  styleUrls: ['./packet-sale.form.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacketSaleForm extends AppForm<Packet> implements OnInit, OnDestroy {
  private _saleSubscription: Subscription;
  private _data: Packet;

  computing = false;
  salesHelper: FormArrayHelper<SaleProduct>;
  salesFocusIndex = -1;
  salesEditedIndex: number;

  get saleFormArray(): UntypedFormArray {
    return this.form.controls.saleProducts as UntypedFormArray;
  }

  get value(): any {
    const json = this.form.value;

    // Update packets sales if needed
    fillRankOrder(json.saleProducts);

    // Convert aggregated products sales to products
    json.saleProducts = json.saleProducts && SaleProductUtils.aggregatedSaleProductsToProducts(this._data, json.saleProducts, this.pmfms);

    return json;
  }

  @Input() mobile: boolean;
  @Input() showError = true;
  @Input() usageMode: UsageMode;
  @Input() pmfms: DenormalizedPmfmStrategy[];

  constructor(
    protected validatorService: PacketValidatorService,
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
  }

  ngOnDestroy() {
    this._saleSubscription?.unsubscribe();
    super.ngOnDestroy();
  }

  setValue(data: Packet, opts?: { emitEvent?: boolean; onlySelf?: boolean }) {
    if (!data) return;
    this._data = data;

    // Initialize product sales by converting products to aggregated sale products
    const aggregatedSaleProducts = isNotEmptyArray(data.saleProducts)
      ? SaleProductUtils.productsToAggregatedSaleProduct(data.saleProducts, this.pmfms).map((p) => p.asObject())
      : [{}];
    this.salesHelper.resize(Math.max(1, aggregatedSaleProducts.length));

    data.saleProducts = aggregatedSaleProducts;

    // Set value
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
    for (const sale of (this.saleFormArray.controls as UntypedFormGroup[]) || []) {
      this.computePrices(sale.controls);
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
        (object, valueName, value) => AppFormUtils.setCalculatedValue(object, valueName, value),
        (object, valueName) => AppFormUtils.resetCalculatedValue(object, valueName),
        false,
        'subgroupCount',
        'number'
      );
    } finally {
      this.computing = false;
    }
  }

  private initSalesHelper() {
    this.salesHelper = new FormArrayHelper<SaleProduct>(
      FormArrayHelper.getOrCreateArray(this.formBuilder, this.form, 'saleProducts'),
      (saleProduct) => this.validatorService.getSaleProductControl(saleProduct),
      SaleProductUtils.isSaleProductEquals,
      SaleProductUtils.isSaleProductEmpty,
      {
        allowEmptyArray: true,
      }
    );
    if (this.salesHelper.size() === 0) {
      // add at least one sale
      this.salesHelper.resize(1);
    }
    this.markForCheck();
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
      }, 500);
    }
  }
}
