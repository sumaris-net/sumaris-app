import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { ReportTestPage } from '@app/shared/report/testing/report.testing';
import { NgChartsModule } from 'ng2-charts';
import { ReportEmbeddedTestPage, ReportEmbeddedChildTestPage } from '@app/shared/report/testing/report-embedded.testing';

export const REPORT_TESTING_PAGES: TestingPage[] = [
  { label: 'Report', page: '/testing/shared/report' },
  { label: 'Report embedded', page: '/testing/shared/report/embedded' },
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ReportTestPage,
  },
  {
    path: 'embedded',
    pathMatch: 'full',
    component: ReportEmbeddedTestPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    NgChartsModule,

    // App modules
    AppSharedReportModule,
  ],
  declarations: [ReportTestPage, ReportEmbeddedTestPage, ReportEmbeddedChildTestPage],
  exports: [ReportTestPage, ReportEmbeddedTestPage],
})
export class AppSharedReportTestingModule {}
