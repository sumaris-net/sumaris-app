import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { ObservedLocationFormReport } from './observed-location-form.report';

const routes = [
  {
    path: '',
    pathMath: 'full',
    component: ObservedLocationFormReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ObservedLocationFormReportRoutingModule {}
