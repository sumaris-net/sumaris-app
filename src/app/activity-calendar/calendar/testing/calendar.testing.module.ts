import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarTestPage } from './calendar-test.page';
import { AppCalendarModule } from '@app/activity-calendar/calendar/calendar.module';

export const ACTIVITY_CALENDAR_TESTING_PAGES: TestingPage[] = [
  { label: 'Activity calendar module', divider: true },
  { label: 'Calendar', page: '/testing/activity-calendar/calendar' },
];

const routes: Routes = [
  {
    path: 'calendar',
    pathMatch: 'full',
    component: CalendarTestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    AppCalendarModule
  ],
  declarations: [
    CalendarTestPage
  ],
  exports: [
    CalendarTestPage
  ]
})
export class CalendarTestingModule {

}
