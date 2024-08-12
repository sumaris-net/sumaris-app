import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarFormReport } from './form/activity-calendar-form.report';
import { ActivityCalendarFormReportModule } from './form/activity-calendar-form-report.module';

const routes: Routes = [
  {
    path: 'form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
  {
    path: 'blank-form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), ActivityCalendarFormReportModule],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
