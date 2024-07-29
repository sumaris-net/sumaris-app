import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { FormObservedLocationReportModule } from './form-observed-location.module';
import { FormObservedLocationReport } from './form-observed-location.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: FormObservedLocationReport,
  },
  {
    path: 'blank',
    pathMatch: 'full',
    component: FormObservedLocationReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), FormObservedLocationReportModule],
  exports: [RouterModule],
})
export class FormObservedLocationReportRoutingModule {}
