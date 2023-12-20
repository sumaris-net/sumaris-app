import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppOperationModule } from '@app/trip/operation/operation.module';
import { TripReport } from './trip.report';
import { AppReferentialModule } from '@app/referential/referential.module';
let TripReportModule = class TripReportModule {
};
TripReportModule = __decorate([
    NgModule({
        declarations: [
            TripReport
        ],
        imports: [
            AppCoreModule,
            AppReferentialModule,
            AppSharedReportModule,
            AppOperationModule
        ],
        exports: [
            TripReport
        ],
    })
], TripReportModule);
export { TripReportModule };
//# sourceMappingURL=trip-report.module.js.map