import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TripReportModule } from './trip-report.module';
import { TripReport } from './trip.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: TripReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    TripReportModule,
  ],
  exports: [RouterModule]
})
export class TripReportRoutingModule { }
