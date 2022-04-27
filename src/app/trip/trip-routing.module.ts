import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OperationPage } from './operation/operation.page';
import { LandingPage } from './landing/landing.page';
import { ComponentDirtyGuard, SharedRoutingModule } from '@sumaris-net/ngx-components';
import { TripTable } from './trip/trips.table';
import { TripPage } from './trip/trip.page';
import { TripModule } from './trip.module';

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
        canDeactivate: [ComponentDirtyGuard]
      },
      {
        path: 'operation/:operationId',
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
          pathIdParam: 'operationId'
        },
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: OperationPage,
            runGuardsAndResolvers: 'pathParamsChange',
            canDeactivate: [ComponentDirtyGuard]
          }
        ]
      }
    ]
  },

  {
    path: ':tripId/landing/:landingId',
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
    SharedRoutingModule,
    TripModule,
    RouterModule.forChild(routes)
  ],
  exports: [
    RouterModule
  ]
})
export class TripRoutingModule {
}
