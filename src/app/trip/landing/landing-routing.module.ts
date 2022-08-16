import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './landing.page';
import { AppLandingModule } from './landing.module';

const routes: Routes = [
  {
    path: ':landingId',
    component: LandingPage,
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
      pathIdParam: 'landingId'
    }
  }
];


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppLandingModule
  ],
  exports: [
    RouterModule
  ]
})
export class AppLandingRoutingModule {
}
