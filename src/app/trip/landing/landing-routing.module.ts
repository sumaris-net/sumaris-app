import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LandingPage } from './landing.page';
import { AppLandingModule } from './landing.module';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { LandingReport } from './report/landing.report';
import { AppLandingReportModule } from './report/landing.report.module';

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
        component: LandingReport,
      }
    ],
  }
];


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppLandingModule,
    AppLandingReportModule,
  ],
  exports: [
    RouterModule
  ]
})
export class AppLandingRoutingModule {
}
