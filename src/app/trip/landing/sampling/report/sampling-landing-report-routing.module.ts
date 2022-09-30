import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SamplingLandingReport } from './sampling-landing.report';
import { SamplingLandingReportModule } from './sampling-landing.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: SamplingLandingReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SamplingLandingReportModule,
  ],
  exports: [RouterModule]
})
export class SamplingReportRoutingModule { }
