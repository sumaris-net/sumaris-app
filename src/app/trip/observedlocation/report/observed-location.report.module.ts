import { NgModule } from '@angular/core';
import { ObservedLocationReport } from './observed-location.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppSamplingLandingModule } from '@app/trip/landing/sampling/sampling-landing.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppLandingReportModule } from '@app/trip/landing/report/landing.report.module';
import { AuctionControlReportModule } from '@app/trip/landing/auctioncontrol/report/auction-control.report.module';

@NgModule({
  declarations: [
    ObservedLocationReport
  ],
  imports: [
    AppCoreModule,
    AppReferentialModule,
    AppDataModule,
    TranslateModule.forChild(),
    AppSharedReportModule,
    AppSamplingLandingModule,
    AuctionControlReportModule,
    AppLandingReportModule,
  ],
  exports: [
    ObservedLocationReport
  ],
})
export class AppObservedLocationReportModule { }
