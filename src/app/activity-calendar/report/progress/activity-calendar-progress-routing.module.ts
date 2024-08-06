import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarProgressReportModule } from './activity-calendar-progress-report.module';
import { ActivityCalendarProgressReport } from './activity-calendar-progress.report';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ActivityCalendarProgressReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), ActivityCalendarProgressReportModule],
  exports: [RouterModule],
})
export class ActivityCalendarProgressReportRoutingModule {}
