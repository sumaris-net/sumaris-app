import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { LandedTripPage } from '@app/trip/landedtrip/landed-trip.page';
import { AppDataModule } from '@app/data/data.module';
import { AppFishingAreaModule } from '@app/data/fishing-area/fishing-area.module';
import { AppSaleModule } from '@app/trip/sale/sale.module';
import { AppExpenseModule } from '@app/trip/expense/expense.module';
import { AppOperationGroupModule } from '@app/trip/operationgroup/operation-group.module';
import { AppProductModule } from '@app/trip/product/product.module';
import { AppPacketModule } from '@app/trip/packet/packet.module';
import { AppTripModule } from '@app/trip/trip/trip.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppCoreModule } from '@app/core/core.module';


@NgModule({
  imports: [
    AppCoreModule,
    AppDataModule,
    TranslateModule.forChild(),

    // Functional modules
    AppTripModule,
    AppMeasurementModule,
    AppFishingAreaModule,
    AppExpenseModule,
    AppSaleModule,
    AppOperationGroupModule,
    AppProductModule,
    AppPacketModule
  ],
  declarations: [
    LandedTripPage
  ],
  exports: [
    // Components
    LandedTripPage
  ]
})
export class AppLandedTripModule {

  constructor() {
    console.debug('[landing-trip] Creating module...');
  }
}
