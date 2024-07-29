import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ObservedLocationReport } from './observed-location.report';
import { AppObservedLocationReportModule } from './observed-location.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ObservedLocationReport,
  },
  {
    path: 'form',
    loadChildren: () => import('./form/form-observed-location-report-routing.module').then((m) => m.FormObservedLocationReportRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), AppObservedLocationReportModule],
  exports: [RouterModule],
})
export class AppObservedLocationReportRoutingModule {}
