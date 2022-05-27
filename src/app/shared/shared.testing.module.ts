import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CommonModule} from '@angular/common';
import {CoreModule, SHARED_TESTING_PAGES, SharedModule, SharedTestingModule, TestingPage} from '@sumaris-net/ngx-components';
import {TranslateModule} from '@ngx-translate/core';
import {AppSharedReportModule} from '@app/shared/report/report.module';
import {ReportTestPage} from '@app/shared/report/testing/report.testing';

export const APP_SHARED_TESTING_PAGES: TestingPage[] = [
  ...SHARED_TESTING_PAGES,
  {label: 'Report', page: '/testing/shared/report'}
];

const routes: Routes = [
  {
    path: 'report', loadChildren: () => import('./report/report.testing.module').then(m => m.AppSharedReportTestingModule)
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    SharedTestingModule
  ],
  declarations: [

  ],
  exports: [
  ]
})
export class AppSharedTestingModule {

}
