import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {AlertController, ModalController} from '@ionic/angular';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import {Alerts, AppFormUtils, isNil, referentialToString} from '@sumaris-net/ngx-components';
import { ProductSaleForm } from './product-sale.form';
import { Product } from '../services/model/product.model';
import { DenormalizedPmfmStrategy, PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { TranslateService } from '@ngx-translate/core';
import { IPmfm } from '@app/referential/services/model/pmfm.model';

export interface IProductSaleModalOptions {
  disabled: boolean;
  data: Product;
  productSalePmfms: DenormalizedPmfmStrategy[];
  mobile: boolean;
}

@Component({
  selector: 'app-product-sale-modal',
  templateUrl: './product-sale.modal.html'
})
export class ProductSaleModal implements OnInit,  OnDestroy, IProductSaleModalOptions {

  loading = false;
  subscription = new Subscription();
  $title = new BehaviorSubject<string>(null);

  @ViewChild('productSaleForm', {static: true}) productSaleForm: ProductSaleForm;

  @Input() mobile: boolean;
  @Input() data: Product;
  @Input() productSalePmfms: DenormalizedPmfmStrategy[];
  @Input() disabled: boolean;

  get enabled(): boolean {
    return this.productSaleForm.enabled;
  }

  get valid(): boolean {
    return this.productSaleForm?.valid || false;
  }

  get invalid(): boolean {
    return this.productSaleForm?.invalid || false;
  }

  constructor(
    protected viewCtrl: ModalController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService
  ) {

  }

  ngOnInit() {
    this.updateTitle();
    setTimeout(async () => {
      await this.productSaleForm.setValue(Product.fromObject(this.data))
      if (!this.disabled) this.enable();
    });

    this.productSaleForm.markAsReady();
  }

  protected updateTitle() {
    const title = this.translate.instant('TRIP.PRODUCT.SALE.TITLE', {taxonGroupLabel: referentialToString(this.data.taxonGroup)});
    this.$title.next(title);
  }

  async onSave(event: any): Promise<any> {

    // Avoid multiple call
    if (this.disabled) return;

    await AppFormUtils.waitWhilePending(this.productSaleForm);

    if (this.productSaleForm.invalid) {
      AppFormUtils.logFormErrors(this.productSaleForm.form);
      this.productSaleForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const value = this.productSaleForm.value;
      this.disable();
      await this.viewCtrl.dismiss(value);
      this.productSaleForm.error = null;
    } catch (err) {
      console.error(err);
      this.productSaleForm.error = err && err.message || err;
      this.enable();
      this.loading = false;
    }
  }

  disable() {
    this.disabled = true;
    this.productSaleForm.disable();
  }

  enable() {
    this.disabled = false;
    this.productSaleForm.enable();
  }

  cancel() {
    this.viewCtrl.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  referentialToString = referentialToString;
}
