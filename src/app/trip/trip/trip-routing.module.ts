import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthGuardService, ComponentDirtyGuard} from '@sumaris-net/ngx-components';
import { TripTable } from './trips.table';
import { TripPage } from './trip.page';
import { AppTripModule } from './trip.module';

const routes: Routes = [
  // Table
  {
    path: '',
    pathMatch: 'full',
    canActivate: [AuthGuardService],
    component: TripTable
  },

  // Shared report
  {
    path: 'report',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () => import('./report/trip-report-routing.module').then(m => m.TripReportRoutingModule),
      },
      {
        path: 'selectivity',
        pathMatch: 'full',
        loadChildren: () => import('./report/selectivity/selectivity-trip-report-routing.module').then(m => m.SelectivityTripReportRoutingModule)
      },
    ]
  },

  // Page
  {
    path: ':tripId',
    runGuardsAndResolvers: 'pathParamsChange',
    canActivate: [AuthGuardService],
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
