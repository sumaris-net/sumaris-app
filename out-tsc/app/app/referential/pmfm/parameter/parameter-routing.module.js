import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { ParameterPage } from '@app/referential/pmfm/parameter/parameter.page';
import { AppPmfmParameterModule } from '@app/referential/pmfm/parameter/parameter.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: ParameterPage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppPmfmParameterRoutingModule = class AppPmfmParameterRoutingModule {
};
AppPmfmParameterRoutingModule = __decorate([
    NgModule({
        imports: [
            AppPmfmParameterModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppPmfmParameterRoutingModule);
export { AppPmfmParameterRoutingModule };
//# sourceMappingURL=parameter-routing.module.js.map