import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarFormReport } from './form/activity-calendar-form.report';
import { ActivityCalendarFormReportModule } from './form/activity-calendar-form-report.module';
import { ActivityCalendarFormsReport } from './form/activity-calendar-forms.report';

const routes: Routes = [
  {
    path: 'form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
  {
    path: 'forms',
    pathMatch: 'full',
    component: ActivityCalendarFormsReport,
  },
  {
    path: 'blank-form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
  {
    path: 'blank-forms',
    pathMatch: 'full',
    component: ActivityCalendarFormsReport,
  },
  {
    path: 'progress',
    loadChildren: () => import('./progress/activity-calendar-progress-routing.module').then((m) => m.ActivityCalendarProgressReportRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), ActivityCalendarFormReportModule],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
