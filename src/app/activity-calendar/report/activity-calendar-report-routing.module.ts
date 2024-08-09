import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { FormActivityCalendarReportModule } from './form/form-activity-calendar-report.module';
import { FormActivityCalendarReport } from './form/form-activity-calendar.report';

const routes: Routes = [
  {
    path: 'form',
    pathMatch: 'full',
    component: FormActivityCalendarReport,
  },
  {
    path: 'blank-form',
    pathMatch: 'full',
    component: FormActivityCalendarReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), FormActivityCalendarReportModule],
  exports: [RouterModule],
})
export class ActivityCalendarReportRoutingModule {}
