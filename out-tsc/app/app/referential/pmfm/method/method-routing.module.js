import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MethodPage } from '@app/referential/pmfm/method/method.page';
import { AppPmfmMethodModule } from '@app/referential/pmfm/method/method.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: MethodPage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppPmfmMethodRoutingModule = class AppPmfmMethodRoutingModule {
};
AppPmfmMethodRoutingModule = __decorate([
    NgModule({
        imports: [
            AppPmfmMethodModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppPmfmMethodRoutingModule);
export { AppPmfmMethodRoutingModule };
//# sourceMappingURL=method-routing.module.js.map