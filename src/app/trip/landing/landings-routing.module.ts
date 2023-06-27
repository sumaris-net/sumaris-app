import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './landing.page';
import { AppLandingModule } from './landing.module';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { LandingsPage } from '@app/trip/landing/landings.page';

const routes: Routes = [
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


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppLandingModule,
  ],
  exports: [
    RouterModule
  ]
})
export class AppLandingsRoutingModule {
}
