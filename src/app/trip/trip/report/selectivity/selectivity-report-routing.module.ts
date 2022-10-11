import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SelectivityReport } from './selectivity.report';
import { SelectivityReportModule } from './selectivity.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: SelectivityReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SelectivityReportModule,
  ],
  exports: [RouterModule]
})
export class SelectivityReportRoutingModule { }
