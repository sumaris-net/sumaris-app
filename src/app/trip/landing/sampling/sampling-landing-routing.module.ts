import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { SamplingLandingPage } from '@app/trip/landing/sampling/sampling-landing.page';
import { AppSamplingLandingModule } from '@app/trip/landing/sampling/sampling-landing.module';

const routes: Routes = [
  {
    path: ':samplingId',
    data: {
      profile: 'USER',
      pathIdParam: 'samplingId'
    },
    children: [
      {
        path: '',
        pathMatch: 'full',
        runGuardsAndResolvers: 'pathParamsChange',
        component: SamplingLandingPage,
        canDeactivate: [ComponentDirtyGuard]
      },
      {
        path: 'report',
        loadChildren: () => import('./report/sampling-landing-report-routing.module').then(m =>m.SamplingReportRoutingModule)
      }
    ]
  }
];


@NgModule({
  imports: [
    RouterModule.forChild(routes),
    AppSamplingLandingModule
  ],
  exports: [
    RouterModule
  ]
})
export class AppSamplingLandingRoutingModule {
}
