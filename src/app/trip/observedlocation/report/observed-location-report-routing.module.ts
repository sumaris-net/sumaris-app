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
    data: {
      isBlankForm: false,
    },
    path: 'form',
    pathMatch: 'full',
    loadChildren: () => import('./form/observed-location-form-report-routing.module').then((m) => m.ObservedLocationFormReportRoutingModule),
  },
  {
    data: {
      isBlankForm: true,
    },
    path: 'blank-form',
    pathMatch: 'full',
    loadChildren: () => import('./form/observed-location-form-report-routing.module').then((m) => m.ObservedLocationFormReportRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), AppObservedLocationReportModule],
  exports: [RouterModule],
})
export class AppObservedLocationReportRoutingModule {}
