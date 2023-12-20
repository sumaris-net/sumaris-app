import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SharedModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { ReportTestPage } from '@app/shared/report/testing/report.testing';
import { NgChartsModule } from 'ng2-charts';
import { ReportEmbeddedTestPage, ReportEmbeddedChildTestPage } from '@app/shared/report/testing/report-embedded.testing';
export const REPORT_TESTING_PAGES = [
    { label: 'Report', page: '/testing/shared/report' },
    { label: 'Report embedded', page: '/testing/shared/report/embedded' }
];
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: ReportTestPage
    },
    {
        path: 'embedded',
        pathMatch: 'full',
        component: ReportEmbeddedTestPage,
    },
];
let AppSharedReportTestingModule = class AppSharedReportTestingModule {
};
AppSharedReportTestingModule = __decorate([
    NgModule({
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
        declarations: [
            ReportTestPage,
            ReportEmbeddedTestPage,
            ReportEmbeddedChildTestPage
        ],
        exports: [
            ReportTestPage,
            ReportEmbeddedTestPage,
        ]
    })
], AppSharedReportTestingModule);
export { AppSharedReportTestingModule };
//# sourceMappingURL=report.testing.module.js.map