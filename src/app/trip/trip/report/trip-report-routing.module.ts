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
    loadChildren: () => import('./selectivity/selectivity-trip-report-routing.module').then(m => m.SelectivityTripReportRoutingModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    TripReportModule,
  ],
  exports: [RouterModule]
})
export class TripReportRoutingModule { }
