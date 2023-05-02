import { NgModule } from '@angular/core';
import { ObservedLocationReport } from './observed-location.report';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { TranslateModule } from '@ngx-translate/core';
import { AuctionControlReportModule } from '@app/trip/landing/auction-control/report/auction-control.report.module';
import { SamplingLandingReportModule } from '@app/trip/landing/sampling/report/sampling-landing.report.module';
import { LandingReportModule } from '@app/trip/landing/report/landing.report.module';

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
    LandingReportModule,
    AuctionControlReportModule,
    SamplingLandingReportModule,
  ],
  exports: [
    ObservedLocationReport
  ],
})
export class AppObservedLocationReportModule { }
