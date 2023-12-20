import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppCoreModule } from '@app/core/core.module';
const routes = [
    {
        path: '',
        loadChildren: () => import('./share/shared-page.module').then(m => m.SharedPageModule),
        data: {
            preload: false,
        }
    },
    {
        path: 'share/report',
        children: [
            {
                path: 'observation/:uuid',
                loadChildren: () => import('@app/trip/observedlocation/report/observed-location-report-routing.module').then(m => m.AppObservedLocationReportRoutingModule),
                data: {}
            },
        ],
    },
    {
        path: 'report-observation',
        loadChildren: () => import('@app/trip/observedlocation/report/observed-location-report-routing.module').then(m => m.AppObservedLocationReportRoutingModule),
        outlet: 'shareContent',
    },
];
let SocialRoutingModule = class SocialRoutingModule {
};
SocialRoutingModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            RouterModule.forChild(routes),
        ],
        declarations: [],
    })
], SocialRoutingModule);
export { SocialRoutingModule };
//# sourceMappingURL=social-routing.module.js.map