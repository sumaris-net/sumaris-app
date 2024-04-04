import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppAuctionControlModule } from './auction-control.module';
import { AuctionControlPage } from './auction-control.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
const routes = [
    {
        path: ':controlId',
        data: {
            profile: 'USER',
            pathIdParam: 'controlId'
        },
        children: [
            {
                path: '',
                pathMatch: 'full',
                runGuardsAndResolvers: 'pathParamsChange',
                component: AuctionControlPage,
                canDeactivate: [ComponentDirtyGuard],
                data: {
                    profile: 'USER',
                    pathIdParam: 'controlId'
                }
            },
            {
                path: 'report',
                loadChildren: () => import('./report/auction-control-report-routing.module').then(m => m.AuctionControlReportRoutingModule)
            }
        ]
    }
];
let AppAuctionControlRoutingModule = class AppAuctionControlRoutingModule {
};
AppAuctionControlRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            AppAuctionControlModule
        ],
        exports: [
            RouterModule
        ]
    })
], AppAuctionControlRoutingModule);
export { AppAuctionControlRoutingModule };
//# sourceMappingURL=auction-control-routing.module.js.map