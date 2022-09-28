import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ObservedLocationReport } from './observed-location.report';
import { AppObservedLocationReportModule } from './observed-location.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ObservedLocationReport,
  }
];


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppObservedLocationReportModule
  ],
  exports: [
    RouterModule
  ]
})
export class AppObservedLocationReportRoutingModule {
}
