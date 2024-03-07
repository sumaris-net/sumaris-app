import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LandingPage } from './landing.page';
import { AppLandingModule } from './landing.module';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
const routes = [
    {
        path: ':landingId',
        data: {
            profile: 'USER',
            pathIdParam: 'landingId',
        },
        children: [
            {
                path: '',
                pathMatch: 'full',
                runGuardsAndResolvers: 'pathParamsChange',
                component: LandingPage,
                canDeactivate: [ComponentDirtyGuard],
                data: {
                    profile: 'USER',
                    pathIdParam: 'landingId',
                },
            },
            {
                path: 'report',
                loadChildren: () => import('./report/landing-report-routing.module').then((m) => m.LandingReportRoutingModule),
            },
        ],
    },
];
let AppLandingRoutingModule = class AppLandingRoutingModule {
};
AppLandingRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            AppLandingModule,
        ],
        exports: [
            RouterModule
        ]
    })
], AppLandingRoutingModule);
export { AppLandingRoutingModule };
//# sourceMappingURL=landing-routing.module.js.map