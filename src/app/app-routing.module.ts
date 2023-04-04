import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountPage, AuthGuardService, ComponentDirtyGuard, HomePage, RegisterConfirmPage, SettingsPage, SharedRoutingModule } from '@sumaris-net/ngx-components';
import { QuicklinkModule, QuicklinkStrategy } from 'ngx-quicklink';

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
    canActivate: [AuthGuardService],
    canDeactivate: [ComponentDirtyGuard]
  },
  {
    path: 'settings',
    pathMatch: 'full',
    component: SettingsPage,
    canDeactivate: [ComponentDirtyGuard]
  },

  // Admin
  {
    path: 'admin',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./admin/admin-routing.module').then(m => m.AppAdminRoutingModule)
  },

  // Referential
  {
    path: 'referential',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./referential/referential-routing.module').then(m => m.ReferentialRoutingModule)
  },

  // Vessel
  {
    path: 'vessels',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./vessel/vessel-routing.module').then(m => m.VesselRoutingModule)
  },

  // Trips
  {
    path: 'trips',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    loadChildren: () => import('./trip/trip-routing.module').then(m => m.AppTripRoutingModule)
  },

  // Observations
  {
    path: 'observations',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    loadChildren: () => import('./trip/observed-location-routing.module').then(m => m.AppObservedLocationRoutingModule)
  },

  // Extraction path
  {
    path: 'extraction',
    canActivate: [AuthGuardService],
    data: {
      profile: 'GUEST'
    },
    loadChildren: () => import('./extraction/extraction-routing.module').then(m => m.AppExtractionRoutingModule)
  },

  // DevicePosition path
  {
    path: 'device-position',
    canActivate: [AuthGuardService],
    data: {
      profile: 'SUPERVISOR'
    },
    loadChildren: () => import('./position/device-position-routing.module').then(m => m.DevicePositionRoutingModule)
  },

  // Inbox message
  {
    path: 'inbox',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER'
    },
    loadChildren: () => import('./social/message/inbox-message-routing.module').then(m => m.AppInboxMessageRoutingModule)
  },

  // Test module (disable in menu, by default - can be enabled by the Pod configuration page)
  {
    path: 'testing',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'shared',
        data: {
          preload: false
        }
      },
      // Shared module
      {
        path: 'shared',
        loadChildren: () => import('./shared/shared.testing.module').then(m => m.AppSharedTestingModule),
        data: {
          preload: false
        }
      },
      // Core module
      {
        path: 'core',
        loadChildren: () => import('@sumaris-net/ngx-components').then(m => m.CoreTestingModule),
        data: {
          preload: false
        }
      },
      // Social module
      {
        path: 'social',
        loadChildren: () => import('@sumaris-net/ngx-components').then(m => m.SocialTestingModule),
        data: {
          preload: false
        }
      },
      // Data module
      {
        path: 'data',
        loadChildren: () => import('./data/data.testing.module').then(m => m.DataTestingModule),
        data: {
          preload: false
        }
      },
      // Trip module
      {
        path: 'trip',
        loadChildren: () => import('./trip/trip.testing.module').then(m => m.TripTestingModule),
        data: {
          preload: false
        }
      },
      // Referential module
      {
        path: 'referential',
        loadChildren: () => import('./referential/referential.testing.module').then(m => m.ReferentialTestingModule),
        data: {
          preload: false
        }
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
    QuicklinkModule,
    SharedRoutingModule,
    RouterModule.forRoot(routes, {

      // DEBUG
      //enableTracing: !environment.production,
      enableTracing: false,

      useHash: false,
      onSameUrlNavigation: 'reload',
      preloadingStrategy: QuicklinkStrategy
    })
  ],
  exports: [
    RouterModule,
    SharedRoutingModule
  ]
})
export class AppRoutingModule {
}
