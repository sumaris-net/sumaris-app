import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SelectivityOperationPage } from '@app/trip/operation/selectivity/selectivity-operation.page';
import { AppSelectivityOperationModule } from '@app/trip/operation/selectivity/selectivity-operation.module';
const routes = [
    {
        path: ':selectivityOperationId',
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
            pathIdParam: 'selectivityOperationId'
        },
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: SelectivityOperationPage,
                canDeactivate: [ComponentDirtyGuard],
                data: {
                    pathIdParam: 'selectivityOperationId'
                },
            }
        ],
    }
];
let AppSelectivityOperationRoutingModule = class AppSelectivityOperationRoutingModule {
};
AppSelectivityOperationRoutingModule = __decorate([
    NgModule({
        imports: [
            AppSelectivityOperationModule,
            RouterModule.forChild(routes)
        ],
        exports: [
            RouterModule
        ]
    })
], AppSelectivityOperationRoutingModule);
export { AppSelectivityOperationRoutingModule };
//# sourceMappingURL=selectivity-operation-routing.module.js.map