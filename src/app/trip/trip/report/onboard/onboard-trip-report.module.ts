import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { OnboardTripReport } from './onboard-trip.report';

@NgModule({
  declarations: [OnboardTripReport],
  imports: [AppCoreModule, AppSharedReportModule, AppOperationModule, AppReferentialModule],
  exports: [OnboardTripReport],
})
export class OnboardTripReportModule {}
