import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TripReportModule } from './trip-report.module';
import { TripReport } from './trip.report';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: TripReport,
    },
    {
        path: 'selectivity',
        loadChildren: () => import('./selectivity/selectivity-trip-report-routing.module').then(m => m.SelectivityTripReportRoutingModule)
    },
];
let TripReportRoutingModule = class TripReportRoutingModule {
};
TripReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            TripReportModule,
        ],
        exports: [RouterModule]
    })
], TripReportRoutingModule);
export { TripReportRoutingModule };
//# sourceMappingURL=trip-report-routing.module.js.map