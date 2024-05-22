import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarReport } from './activity-calendar.report';
import { ActivityCalendarReportModule } from './activity-calendar-report.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ActivityCalendarReport,
  },
  {
    path: 'form',
    pathMatch: 'full',
    component: ActivityCalendarReport,
  },
  {
    path: 'blank-form',
    data: { isBlankForm: true },
    component: ActivityCalendarReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), ActivityCalendarReportModule],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
