import { NgModule } from '@angular/core';
import { AuctionControlPage } from './auction-control.page';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { AuctionControlReport } from '@app/trip/landing/auctioncontrol/auction-control.report';
import { AppSharedReportModule } from '@app/shared/report/report.module';


@NgModule({
  imports: [
    AppCoreModule,
    AppDataModule,
    AppSharedReportModule,
    TranslateModule.forChild(),

    // Functional modules
    VesselModule,
    AppReferentialModule,
    AppMeasurementModule,
    AppSampleModule,
    AppLandingModule,

  ],
  declarations: [
    AuctionControlPage,
    AuctionControlReport
  ],
  exports: [
    // Components
    AuctionControlPage,
    AuctionControlReport
  ]
})
export class AppAuctionControlModule {

  constructor() {
    console.debug('[auction-control] Creating module...');
  }
}
