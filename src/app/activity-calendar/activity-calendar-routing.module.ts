import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ActivityCalendarsPage } from '@app/activity-calendar/table/activity-calendars.page';

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
    VesselModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class ActivityCalendarRoutingModule { }
