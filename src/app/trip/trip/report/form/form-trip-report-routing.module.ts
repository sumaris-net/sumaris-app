import { RouterModule, Routes } from '@angular/router';
import { FormTripReport } from './form-trip.report';
import { FormTripReportModule } from './form-trip-report.module';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: FormTripReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), FormTripReportModule],
  exports: [RouterModule],
})
export class FormTripReportRoutingModule {}
