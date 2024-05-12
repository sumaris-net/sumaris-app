import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarReport } from './activity-calendar.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ActivityCalendarReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), ActivityCalendarReportRoutingModule],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
