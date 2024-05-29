import { RouterModule, Routes } from '@angular/router';
import { FormActivityCalendarReportModule } from './form-activity-calendar-report.module';
import { FormActivityCalendarReport } from './form-activity-calendar.report';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: FormActivityCalendarReport,
  },
  {
    path: 'blank',
    pathMatch: 'full',
    component: FormActivityCalendarReport,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), FormActivityCalendarReportModule],
  exports: [RouterModule],
})
export class FormActivityCalendarRoutingModule {}
