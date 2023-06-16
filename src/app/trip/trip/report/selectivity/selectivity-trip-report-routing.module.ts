import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SelectivityTripReportModule } from '@app/trip/trip/report/selectivity/selectivity-trip-report.module';
import { SelectivityTripReport } from '@app/trip/trip/report/selectivity/selectivity-trip.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: SelectivityTripReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SelectivityTripReportModule,
  ],
  exports: [RouterModule]
})
export class SelectivityTripReportRoutingModule { }
