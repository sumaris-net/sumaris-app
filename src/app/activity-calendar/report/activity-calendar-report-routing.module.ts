import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: 'form',
    loadChildren: () => import('./form/form-activity-calendar-routing.module').then((m) => m.FormActivityCalendarRoutingModule),
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
