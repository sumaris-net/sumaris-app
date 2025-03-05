import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ObservedLocationReport } from './observed-location.report';
import { AppObservedLocationReportModule } from './observed-location.report.module';
import { ObservedLocationFormReport } from './form/observed-location-form.report';

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
    component: ObservedLocationFormReport,
  },
  {
    data: {
      isBlankForm: true,
    },
    path: 'blank-form',
    pathMatch: 'full',
    component: ObservedLocationFormReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), AppObservedLocationReportModule],
  exports: [RouterModule],
})
export class AppObservedLocationReportRoutingModule {}
