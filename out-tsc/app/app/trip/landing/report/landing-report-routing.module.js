import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LandingReport } from './landing.report';
import { LandingReportModule } from './landing.report.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: LandingReport,
    }
];
let LandingReportRoutingModule = class LandingReportRoutingModule {
};
LandingReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            LandingReportModule,
        ],
        exports: [RouterModule]
    })
], LandingReportRoutingModule);
export { LandingReportRoutingModule };
//# sourceMappingURL=landing-report-routing.module.js.map