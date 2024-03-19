import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarsPage } from './table/activity-calendars.page';
import { AppActivityCalendarModule } from '@app/activity-calendar/activity-calendar.module';
import { ActivityCalendarPage } from '@app/activity-calendar/page/activity-calendar.page';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ActivityCalendarsPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
    },
  },
  {
    path: ':calendarId',
    component: ActivityCalendarPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
      pathIdParam: 'calendarId',
    },
  },
];

@NgModule({
  imports: [AppActivityCalendarModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppActivityCalendarRoutingModule {}
