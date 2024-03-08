import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { SelectivityTripReport } from '@app/trip/trip/report/selectivity/selectivity-trip.report';
import { AppReferentialModule } from '@app/referential/referential.module';
let SelectivityTripReportModule = class SelectivityTripReportModule {
};
SelectivityTripReportModule = __decorate([
    NgModule({
        declarations: [
            SelectivityTripReport
        ],
        imports: [
            AppCoreModule,
            AppSharedReportModule,
            AppOperationModule,
            AppReferentialModule
        ],
        exports: [
            SelectivityTripReport
        ],
    })
], SelectivityTripReportModule);
export { SelectivityTripReportModule };
//# sourceMappingURL=selectivity-trip-report.module.js.map