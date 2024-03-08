import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { TranslateModule } from '@ngx-translate/core';
import { SamplingLandingReport } from './sampling-landing.report';
let SamplingLandingReportModule = class SamplingLandingReportModule {
};
SamplingLandingReportModule = __decorate([
    NgModule({
        declarations: [
            SamplingLandingReport,
        ],
        imports: [
            AppCoreModule,
            AppDataModule,
            TranslateModule.forChild(),
            AppSharedReportModule,
            AppReferentialModule,
        ],
        exports: [
            SamplingLandingReport,
        ]
    })
], SamplingLandingReportModule);
export { SamplingLandingReportModule };
//# sourceMappingURL=sampling-landing.report.module.js.map