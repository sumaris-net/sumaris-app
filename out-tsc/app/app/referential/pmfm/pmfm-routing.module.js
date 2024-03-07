import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { PmfmPage } from './pmfm.page';
import { AppPmfmModule } from '@app/referential/pmfm/pmfm.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: PmfmPage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppPmfmRoutingModule = class AppPmfmRoutingModule {
};
AppPmfmRoutingModule = __decorate([
    NgModule({
        imports: [
            AppPmfmModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppPmfmRoutingModule);
export { AppPmfmRoutingModule };
//# sourceMappingURL=pmfm-routing.module.js.map