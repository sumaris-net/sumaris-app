import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SamplingLandingReport } from './sampling-landing.report';
import { SamplingLandingReportModule } from './sampling-landing.report.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: SamplingLandingReport,
    }
];
let SamplingReportRoutingModule = class SamplingReportRoutingModule {
};
SamplingReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            SamplingLandingReportModule,
        ],
        exports: [RouterModule]
    })
], SamplingReportRoutingModule);
export { SamplingReportRoutingModule };
//# sourceMappingURL=sampling-landing-report-routing.module.js.map