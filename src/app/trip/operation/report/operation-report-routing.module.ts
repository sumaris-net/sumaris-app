import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationReport as OperationReport } from './operation.report';
import { OperationReportModule as OperationReportModule } from './operation.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: OperationReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    OperationReportModule,
  ],
  exports: [
    RouterModule,
  ]
})
export class OperationReportRoutingModule {}
