import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {HomePage} from './core/home/home';
import { TestForm } from './trip/trip.module'
import {RegisterConfirmPage} from './core/register/confirm/confirm';
import {AccountPage} from './core/account/account';
import {SettingsPage} from "./core/settings/settings.page";
import {AuthGuardService} from "./core/services/auth-guard.service";
import {SHARED_ROUTE_OPTIONS, SharedRoutingModule} from "./shared/shared-routing.module";

const routes: Routes = [
  // Core path
  {
    path: '',
    component: HomePage
  },

  {
    path: 'home/:action',
    component: HomePage
  },
  {
    path: 'confirm/:email/:code',
    component: RegisterConfirmPage
  },
  {
    path: 'account',
    pathMatch: 'full',
    component: AccountPage,
    canActivate: [AuthGuardService]
  },
  {
    path: 'settings',
    pathMatch: 'full',
    component: SettingsPage
  },

  // Admin
  {
    path: 'admin',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./admin/admin-routing.module').then(m => m.AdminRoutingModule)
  },

  // Referential
  {
    path: 'referential',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./referential/referential-routing.module').then(m => m.ReferentialRoutingModule)
  },

  // Trips
  {
    path: 'trips',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    loadChildren: () => import('./trip/trip-routing.module').then(m => m.TripRoutingModule)
  },
 // test
 {
  path: 'bargeo/test',
  canActivate: [AuthGuardService],
  data: {
    profile: 'USER'
  },
  children: [
    {
      path: '',
      pathMatch: 'full',
      component: TestForm
    }
  ]
},
  // Observations
  {
    path: 'observations',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    loadChildren: () => import('./trip/landed-trip-routing.module').then(m => m.LandedTripRoutingModule)
  },

  // Extraction path
  {
    path: 'extraction',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./trip/extraction/extraction.module').then(m => m.ExtractionModule)
  },

  // Test module (disable in menu, by default - can be enable by the Pod configuration page)
  {
    path: 'testing',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'shared',
      },
      // Shared module
      {
        path: 'shared',
        loadChildren: () => import('./shared/shared.testing.module').then(m => m.SharedTestingModule)
      },
      // Trip module
      {
        path: 'trip',
        loadChildren: () => import('./trip/trip.testing.module').then(m => m.TripTestingModule)
      }
    ]
  },

  // Other route redirection (should at the end of the array)
  {
    path: "**",
    redirectTo: '/'
  }
];


@NgModule({
  imports: [
    SharedRoutingModule,
    RouterModule.forRoot(routes, SHARED_ROUTE_OPTIONS)
  ],
  exports: [
    RouterModule
  ]
})
export class AppRoutingModule {
}
