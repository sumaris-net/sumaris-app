import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ObservedLocationReport } from './observed-location.report';
import { AppObservedLocationReportModule } from './observed-location.report.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: ObservedLocationReport,
    }
];
let AppObservedLocationReportRoutingModule = class AppObservedLocationReportRoutingModule {
};
AppObservedLocationReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            AppObservedLocationReportModule
        ],
        exports: [
            RouterModule
        ]
    })
], AppObservedLocationReportRoutingModule);
export { AppObservedLocationReportRoutingModule };
//# sourceMappingURL=observed-location-report-routing.module.js.map