import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';
import { TripTable } from './trips.table';
import { TripPage } from './trip.page';
import { AppTripModule } from './trip.module';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: TripTable
  },
  {
    path: ':tripId',
    runGuardsAndResolvers: 'pathParamsChange',
    data: {
      profile: 'USER',
      pathIdParam: 'tripId'
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
          pathIdParam: 'tripId'
        },
      },
      {
        path: 'operation',
        loadChildren: () => import('../operation/operation-routing.module').then(m => m.AppOperationRoutingModule)
      },
      {
        path: 'landing',
        loadChildren: () => import('../landing/landing-routing.module').then(m => m.AppLandingRoutingModule)
      },
      {
        path: 'report',
        loadChildren: () => import('./report/trip-report-routing.module').then(m => m.TripReportRoutingModule)
      }
    ]
  }

];


@NgModule({
  imports: [
    AppTripModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class AppTripRoutingModule {
}
