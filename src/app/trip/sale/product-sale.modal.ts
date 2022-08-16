import { Component, Injector, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { AppEntityEditorModal, AppFormUtils, IEntityEditorModalOptions, referentialToString } from '@sumaris-net/ngx-components';
import { ProductSaleForm } from './product-sale.form';
import { Product } from '../services/model/product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { TranslateService } from '@ngx-translate/core';
import { FormGroup } from '@angular/forms';

export interface IProductSaleModalOptions extends IEntityEditorModalOptions<Product, number> {
  productSalePmfms: DenormalizedPmfmStrategy[];
}

@Component({
  selector: 'app-product-sale-modal',
  templateUrl: './product-sale.modal.html'
})
export class ProductSaleModal extends AppEntityEditorModal<Product> implements OnInit,  OnDestroy, IProductSaleModalOptions {

  @ViewChild('productSaleForm', {static: true}) productSaleForm: ProductSaleForm;

  @Input() productSalePmfms: DenormalizedPmfmStrategy[];

  get form(): FormGroup {
    return this.productSaleForm.form;
  }

  constructor(
    injector: Injector,
    protected viewCtrl: ModalController,
    protected alertCtrl: AlertController,
    protected translate: TranslateService
  ) {
    super(injector, Product, {

    })
  }

  protected registerForms() {
    this.addChildForm(this.productSaleForm);
  }

  async ngOnInit() {
    await super.ngOnInit();

    this.productSaleForm.markAsReady();
  }

  ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  protected async setValue(data: Product) {
    await this.productSaleForm.setValue(Product.fromObject(data));
  }

  protected async computeTitle(data: Product): Promise<string> {
    return this.translate.instant('TRIP.PRODUCT.SALE.TITLE', {taxonGroupLabel: referentialToString(data.taxonGroup)});
  }

  protected getFirstInvalidTabIndex(): number {
    return 0;
  }

  referentialToString = referentialToString;
}
