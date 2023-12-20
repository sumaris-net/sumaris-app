import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OperationPage } from './operation.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
const routes = [
    {
        path: 'selectivity',
        loadChildren: () => import('./selectivity/selectivity-operation-routing.module').then(m => m.AppSelectivityOperationRoutingModule)
    },
    {
        path: ':operationId',
        runGuardsAndResolvers: 'pathParamsChange',
        pathMatch: 'full',
        component: OperationPage,
        canDeactivate: [ComponentDirtyGuard],
        data: {
            pathIdParam: 'operationId'
        }
    },
    // Not implemented yet
    // {
    //   path: ':operationId/report',
    //   pathMatch: 'full',
    //   loadChildren:() => import('./report/operation-report-routing.module').then(m => m.OperationReportRoutingModule),
    // }
];
let AppOperationRoutingModule = class AppOperationRoutingModule {
};
AppOperationRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes)
        ],
        exports: [
            RouterModule
        ]
    })
], AppOperationRoutingModule);
export { AppOperationRoutingModule };
//# sourceMappingURL=operation-routing.module.js.map