import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { SoftwarePage } from '@app/referential/software/software.page';
import { AppSoftwareModule } from '@app/referential/software/software.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: SoftwarePage,
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
            profile: 'ADMIN',
            pathIdParam: 'id'
        }
    }
];
let AppSoftwareRoutingModule = class AppSoftwareRoutingModule {
};
AppSoftwareRoutingModule = __decorate([
    NgModule({
        imports: [
            AppSoftwareModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppSoftwareRoutingModule);
export { AppSoftwareRoutingModule };
//# sourceMappingURL=software-routing.module.js.map