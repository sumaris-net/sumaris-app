import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { TripFormReport } from './trip-form.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: TripFormReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TripFormReportRoutingModule {}
