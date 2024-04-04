import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthGuardService, ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { TripTable } from './trips.table';
import { TripPage } from './trip.page';
import { AppTripModule } from './trip.module';
const routes = [
    // Table
    {
        path: '',
        pathMatch: 'full',
        canActivate: [AuthGuardService],
        component: TripTable,
    },
    // Page
    {
        path: ':tripId',
        runGuardsAndResolvers: 'pathParamsChange',
        canActivate: [AuthGuardService],
        data: {
            profile: 'USER',
            pathIdParam: 'tripId',
        },
        children: [
            {
                path: '',
                pathMatch: 'full',
                component: TripPage,
                runGuardsAndResolvers: 'pathParamsChange',
                canDeactivate: [ComponentDirtyGuard],
                data: {
                    profile: 'USER',
                    pathIdParam: 'tripId',
                },
            },
            {
                path: 'operation',
                loadChildren: () => import('../operation/operation-routing.module').then((m) => m.AppOperationRoutingModule),
            },
            {
                path: 'landing',
                loadChildren: () => import('../landing/landing-routing.module').then((m) => m.AppLandingRoutingModule),
            },
            {
                path: 'report',
                loadChildren: () => import('./report/trip-report-routing.module').then((m) => m.TripReportRoutingModule),
            },
        ],
    },
    // Shared report
    {
        path: 'report',
        children: [
            {
                path: '',
                pathMatch: 'full',
                loadChildren: () => import('./report/trip-report-routing.module').then((m) => m.TripReportRoutingModule),
            },
            {
                path: 'selectivity',
                pathMatch: 'full',
                loadChildren: () => import('./report/selectivity/selectivity-trip-report-routing.module').then((m) => m.SelectivityTripReportRoutingModule),
            },
        ],
    },
];
let AppTripRoutingModule = class AppTripRoutingModule {
};
AppTripRoutingModule = __decorate([
    NgModule({
        imports: [
            AppTripModule,
            RouterModule.forChild(routes)
        ],
        exports: [
            RouterModule
        ]
    })
], AppTripRoutingModule);
export { AppTripRoutingModule };
//# sourceMappingURL=trip-routing.module.js.map