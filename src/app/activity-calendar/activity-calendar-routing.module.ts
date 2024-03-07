import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarsPage } from './activity-calendars.page';
import { AppActivityCalendarModule } from '@app/activity-calendar/activity-calendar.module';
import { AuthGuardService } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [AuthGuardService],
    component: ActivityCalendarsPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
    },
  },
  // {
  //   path: ':id',
  //   component: VesselPage,
  //   runGuardsAndResolvers: 'pathParamsChange',
  //   data: {
  //     profile: 'USER'
  //   }
  // }
];

@NgModule({
  imports: [
    AppActivityCalendarModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppActivityCalendarRoutingModule { }
