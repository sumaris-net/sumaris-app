import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService, ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { ObservedLocationsPage } from './table/observed-locations.page';
import { ObservedLocationPage } from './observed-location.page';
import { LandedTripPage } from '../landedtrip/landed-trip.page';
import { AppObservedLocationModule } from '@app/trip/observedlocation/observed-location.module';

const routes: Routes = [
  // table
  {
    path: '',
    pathMatch: 'full',
    component: ObservedLocationsPage,
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
    },
  },

  // Landings
  {
    path: 'landings',
    loadChildren: () => import('../landing/landings-routing.module').then((m) => m.AppLandingsRoutingModule),
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
    },
  },

  {
    path: ':observedLocationId',
    runGuardsAndResolvers: 'pathParamsChange',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
      pathIdParam: 'observedLocationId',
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ObservedLocationPage,
        runGuardsAndResolvers: 'pathParamsChange',
        canDeactivate: [ComponentDirtyGuard],
        data: {
          profile: 'USER',
          pathIdParam: 'observedLocationId',
        },
      },
      {
        path: 'landing',
        loadChildren: () => import('../landing/landing-routing.module').then((m) => m.AppLandingRoutingModule),
      },
      {
        path: 'control',
        loadChildren: () => import('../landing/auction-control/auction-control-routing.module').then((m) => m.AppAuctionControlRoutingModule),
      },
      {
        path: 'sampling',
        loadChildren: () => import('../landing/sampling/sampling-landing-routing.module').then((m) => m.AppSamplingLandingRoutingModule),
      },
      {
        path: 'sale',
        loadChildren: () => import('../sale/sale-routing.module').then((m) => m.AppSaleRoutingModule),
      },
      {
        path: 'trip/:tripId',
        data: {
          profile: 'USER',
          pathIdParam: 'tripId',
        },
        pathMatch: 'full',
        component: LandedTripPage,
        runGuardsAndResolvers: 'pathParamsChange',
        canDeactivate: [ComponentDirtyGuard],
      },
      {
        path: 'report',
        loadChildren: () => import('./report/observed-location-report-routing.module').then((m) => m.AppObservedLocationReportRoutingModule),
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
        loadChildren: () => import('./report/observed-location-report-routing.module').then((m) => m.AppObservedLocationReportRoutingModule),
      },
      {
        path: 'landing',
        pathMatch: 'full',
        loadChildren: () => import('@app/trip/landing/report/landing-report-routing.module').then((m) => m.LandingReportRoutingModule),
      },
      {
        path: 'control',
        pathMatch: 'full',
        loadChildren: () =>
          import('@app/trip/landing/auction-control/report/auction-control-report-routing.module').then((m) => m.AuctionControlReportRoutingModule),
      },
      {
        path: 'sampling',
        pathMatch: 'full',
        loadChildren: () =>
          import('@app/trip/landing/sampling/report/sampling-landing-report-routing.module').then((m) => m.SamplingReportRoutingModule),
      },
    ],
  },
];

@NgModule({
  imports: [AppObservedLocationModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AppObservedLocationRoutingModule {}
