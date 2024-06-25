import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarsTable } from './table/activity-calendars.table';
import { AppActivityCalendarModule } from '@app/activity-calendar/activity-calendar.module';
import { ActivityCalendarPage } from '@app/activity-calendar/page/activity-calendar.page';
import { AuthGuardService, ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ActivityCalendarsTable,
    canActivate: [AuthGuardService],
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
    },
  },
  {
    path: ':calendarId',
    runGuardsAndResolvers: 'pathParamsChange',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
      pathIdParam: 'calendarId',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ActivityCalendarPage,
        canDeactivate: [ComponentDirtyGuard],
        data: {
          profile: 'USER',
          pathIdParam: 'calendarId',
        },
      },
      {
        path: 'report',
        loadChildren: () => import('./report/activity-calendar-report-routing.module').then((m) => m.ActivityCalendarReportRoutingModule),
      },
    ],
  },
  // Shared report
  {
    path: 'report',
    loadChildren: () => import('./report/activity-calendar-report-routing.module').then((m) => m.ActivityCalendarReportRoutingModule),
  },
];

@NgModule({
  imports: [AppActivityCalendarModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppActivityCalendarRoutingModule {}
