import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuctionControlReport } from './auction-control.report';
import { AuctionControlReportModule } from './auction-control.report.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: AuctionControlReport,
    }
];
let AuctionControlReportRoutingModule = class AuctionControlReportRoutingModule {
};
AuctionControlReportRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            AuctionControlReportModule,
        ],
        exports: [RouterModule]
    })
], AuctionControlReportRoutingModule);
export { AuctionControlReportRoutingModule };
//# sourceMappingURL=auction-control-report-routing.module.js.map