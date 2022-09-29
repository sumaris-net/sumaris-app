import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingReport } from './landing.report';
import { AppLandingReportModule } from './landing.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppLandingReportModule,
  ],
  exports: [RouterModule]
})
export class AppReportRoutingModule { }
