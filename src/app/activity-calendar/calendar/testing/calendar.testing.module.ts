import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarTestPage } from './calendar-test.page';
import { AppCalendarModule } from '@app/activity-calendar/calendar/calendar.module';
import { GearUseFeaturesTestPage } from '@app/activity-calendar/metier/testing/gear-use-features.test';
import { AppGearUseFeaturesTableModule } from '@app/activity-calendar/metier/gear-use-features.table.module';

export const ACTIVITY_CALENDAR_TESTING_PAGES: TestingPage[] = [
  { label: 'Activity calendar module', divider: true },
  { label: 'Calendar', page: '/testing/activity-calendar/calendar' },
  { label: 'Gear Use Features', page: '/testing/activity-calendar/gearUseFeatures' },
];

const routes: Routes = [
  {
    path: 'calendar',
    pathMatch: 'full',
    component: CalendarTestPage,
  },
  {
    path: 'gearUseFeatures',
    pathMatch: 'full',
    component: GearUseFeaturesTestPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    AppCalendarModule,
    AppGearUseFeaturesTableModule,
  ],
  declarations: [CalendarTestPage, GearUseFeaturesTestPage],
  exports: [CalendarTestPage, GearUseFeaturesTestPage],
})
export class CalendarTestingModule {}
