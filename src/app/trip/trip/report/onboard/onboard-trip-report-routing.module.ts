import { RouterModule, Routes } from '@angular/router';
import { OnboardTripReport } from './onboard-trip.report';
import { OnboardTripReportModule } from './onboard-trip-report.module';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: OnboardTripReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), OnboardTripReportModule],
  exports: [RouterModule],
})
export class OnboardTripReportRoutingModule {}
