import { __decorate } from "tslib";
import { AppCoreModule } from '@app/core/core.module';
import { NgModule } from '@angular/core';
import { JobReportModal } from '@app/social/job/report/job.report.modal';
let AppJobReportModule = class AppJobReportModule {
};
AppJobReportModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule
        ],
        declarations: [JobReportModal],
        exports: [
            // Components
            JobReportModal
        ]
    })
], AppJobReportModule);
export { AppJobReportModule };
//# sourceMappingURL=job-report.module.js.map