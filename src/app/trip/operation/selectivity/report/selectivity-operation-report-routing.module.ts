import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SelectivityOperationReport } from './selectivity-operation.report';
import { SelectivityOperationReportModule } from './selectivity-operation.report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: SelectivityOperationReport,
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    SelectivityOperationReportModule,
  ],
  exports: [
    RouterModule,
  ]
})
export class SelectivityOperationReportRoutingModule {}
