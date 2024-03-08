import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SelectivityTripReportModule } from '@app/trip/trip/report/selectivity/selectivity-trip-report.module';
import { SelectivityTripReport } from '@app/trip/trip/report/selectivity/selectivity-trip.report';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: SelectivityTripReport,
    }
];
let SelectivityTripReportRoutingModule = class SelectivityTripReportRoutingModule {
};
SelectivityTripReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            SelectivityTripReportModule,
        ],
        exports: [RouterModule]
    })
], SelectivityTripReportRoutingModule);
export { SelectivityTripReportRoutingModule };
//# sourceMappingURL=selectivity-trip-report-routing.module.js.map