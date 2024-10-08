import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarFormReport } from './form/activity-calendar-form.report';
import { ActivityCalendarFormReportModule } from './form/activity-calendar-form-report.module';
import { ActivityCalendarFormsReport } from './form/activity-calendar-forms.report';

const routes: Routes = [
  {
    data: {
      isBlankForm: false,
    },
    path: 'form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
  {
    data: {
      isBlankForm: false,
    },
    path: 'forms',
    pathMatch: 'full',
    component: ActivityCalendarFormsReport,
  },
  {
    data: {
      isBlankForm: true,
    },
    path: 'blank-form',
    pathMatch: 'full',
    component: ActivityCalendarFormReport,
  },
  {
    data: {
      isBlankForm: true,
    },
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
