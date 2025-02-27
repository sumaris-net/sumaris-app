import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarFormReport } from './form/activity-calendar-form.report';

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
    component: ActivityCalendarFormReport,
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
    component: ActivityCalendarFormReport,
  },
  {
    path: 'progress',
    loadChildren: () => import('./progress/activity-calendar-progress-routing.module').then((m) => m.ActivityCalendarProgressReportRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
