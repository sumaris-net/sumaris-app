import { NgModule } from '@angular/core';
import { ExpectedSaleForm } from './expected-sale.form';
import { ProductSaleForm } from './product-sale.form';
import { ProductSaleModal } from './product-sale.modal';
import { PacketSaleModal } from './packet-sale.modal';
import { PacketSaleForm } from './packet-sale.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { SaleForm } from '@app/trip/sale/sale.form';
import { AppProductModule } from '@app/trip/product/product.module';
import { SalePage } from '@app/trip/sale/sale.page';
import { AppFishingAreaModule } from '@app/data/fishing-area/fishing-area.module';
import { AppDataModule } from '@app/data/data.module';

@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),

    // Functional modules
    AppMeasurementModule,
    AppProductModule,
    AppFishingAreaModule,
    AppDataModule,
  ],
  declarations: [SaleForm, ProductSaleForm, ProductSaleModal, ExpectedSaleForm, PacketSaleForm, PacketSaleModal, SalePage],
  exports: [
    // Components
    SaleForm,
    ProductSaleForm,
    ProductSaleModal,
    ExpectedSaleForm,
    PacketSaleForm,
    PacketSaleModal,
    SalePage,
  ],
})
export class AppSaleModule {
  constructor() {
    console.debug('[sale] Creating module...');
  }
}
