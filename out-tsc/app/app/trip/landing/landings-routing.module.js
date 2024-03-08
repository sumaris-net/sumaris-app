import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppLandingModule } from './landing.module';
import { LandingsPage } from '@app/trip/landing/landings.page';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        component: LandingsPage,
    },
    {
        path: 'landing',
        loadChildren: () => import('./landing-routing.module').then(m => m.AppLandingRoutingModule)
    },
    {
        path: 'control',
        loadChildren: () => import('./auction-control/auction-control-routing.module').then(m => m.AppAuctionControlRoutingModule)
    },
    {
        path: 'sampling',
        loadChildren: () => import('./sampling/sampling-landing-routing.module').then(m => m.AppSamplingLandingRoutingModule)
    }
];
let AppLandingsRoutingModule = class AppLandingsRoutingModule {
};
AppLandingsRoutingModule = __decorate([
    NgModule({
        imports: [
            RouterModule.forChild(routes),
            AppLandingModule,
        ],
        exports: [
            RouterModule
        ]
    })
], AppLandingsRoutingModule);
export { AppLandingsRoutingModule };
//# sourceMappingURL=landings-routing.module.js.map