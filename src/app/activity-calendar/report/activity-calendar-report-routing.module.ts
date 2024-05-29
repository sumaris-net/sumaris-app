import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: 'form',
    loadChildren: () => import('./form/form-activity-calendar-routing.module').then((m) => m.FormActivityCalendarRoutingModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
