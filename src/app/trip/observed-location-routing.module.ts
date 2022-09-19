import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { ObservedLocationsPage } from './observedlocation/observed-locations.page';
import { ObservedLocationPage } from './observedlocation/observed-location.page';
import { LandedTripPage } from './landedtrip/landed-trip.page';
import { AppObservedLocationModule } from '@app/trip/observedlocation/observed-location.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: ObservedLocationsPage
  },
  {
    path: ':observedLocationId',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      pathIdParam: 'observedLocationId'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ObservedLocationPage,
        runGuardsAndResolvers: 'pathParamsChange',
        canDeactivate: [ComponentDirtyGuard]
      },
      {
        path: 'landing',
        loadChildren: () => import('./landing/landing-routing.module').then(m => m.AppLandingRoutingModule)
      },
      {
        path: 'control',
        loadChildren: () => import('./landing/auctioncontrol/auction-control-routing.module').then(m => m.AppAuctionControlRoutingModule)
      },
      {
        path: 'sampling',
        loadChildren: () => import('./landing/sampling/sampling-landing-routing.module').then(m => m.AppSamplingLandingRoutingModule)
      },
      {
        path: 'trip/:tripId',
        data: {
          pathIdParam: 'tripId'
        },
        pathMatch: 'full',
        component: LandedTripPage,
        runGuardsAndResolvers: 'pathParamsChange',
        canDeactivate: [ComponentDirtyGuard]
      }
    ]
  }
];


@NgModule({
  imports: [
    AppObservedLocationModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppObservedLocationRoutingModule {
}
