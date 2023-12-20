import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { AuthGuardService, UsersPage } from '@sumaris-net/ngx-components';
import { NgModule } from '@angular/core';
import { ConfigurationPage } from './config/configuration.page';
import { AppAdminModule } from './admin.module';
const routes = [
    {
        path: 'users',
        pathMatch: 'full',
        component: UsersPage,
        canActivate: [AuthGuardService],
        data: {
            profile: 'ADMIN'
        }
    },
    {
        path: 'config',
        pathMatch: 'full',
        component: ConfigurationPage,
        canActivate: [AuthGuardService],
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppAdminRoutingModule = class AppAdminRoutingModule {
};
AppAdminRoutingModule = __decorate([
    NgModule({
        imports: [
            AppAdminModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppAdminRoutingModule);
export { AppAdminRoutingModule };
//# sourceMappingURL=admin-routing.module.js.map