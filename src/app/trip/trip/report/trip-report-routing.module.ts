import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TripReportModule } from './trip-report.module';
import { TripReport } from './trip.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: TripReport,
  },
  {
    path: 'selectivity',
    loadChildren: () => import('./selectivity/selectivity-trip-report-routing.module').then((m) => m.SelectivityTripReportRoutingModule),
  },
  {
    path: 'onboard',
    loadChildren: () => import('./onboard/onboard-trip-report-routing.module').then((m) => m.OnboardTripReportRoutingModule),
  },
  {
    path: 'form',
    data: { isBlankForm: false },
    loadChildren: () => import('./form/form-trip-report-routing.module').then((m) => m.FormTripReportRoutingModule),
  },
  {
    path: 'blank-form',
    data: { isBlankForm: true },
    loadChildren: () => import('./form/form-trip-report-routing.module').then((m) => m.FormTripReportRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), TripReportModule],
  exports: [RouterModule],
})
export class TripReportRoutingModule {}
