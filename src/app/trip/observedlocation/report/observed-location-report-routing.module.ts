import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ObservedLocationReport } from './observed-location.report';
import { AppObservedLocationReportModule } from './observed-location.report.module';
import { ObservedLocationFormReport } from './form/observed-location-form.report';
import { ObservedLocationFormReportModule } from './form/observed-location-form-report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ObservedLocationReport,
  },
  {
    path: 'form',
    pathMatch: 'full',
    component: ObservedLocationFormReport,
  },
  {
    path: 'blank-form',
    pathMatch: 'full',
    component: ObservedLocationFormReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), AppObservedLocationReportModule, ObservedLocationFormReportModule],
  exports: [RouterModule],
})
export class AppObservedLocationReportRoutingModule {}
