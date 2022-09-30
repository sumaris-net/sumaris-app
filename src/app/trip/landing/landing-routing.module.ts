import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './landing.page';
import { AppLandingModule } from './landing.module';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: ':landingId',
    data: {
      profile: 'USER',
      pathIdParam: 'landingId'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        component: LandingPage,
        canDeactivate: [ComponentDirtyGuard],
      },
      {
        path: 'report',
        loadChildren:() => import('./report/landing-report-routing.module').then(m => m.LandingReportRoutingModule)
      }
    ],
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
export class AppLandingRoutingModule {
}
