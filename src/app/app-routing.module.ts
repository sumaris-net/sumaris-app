import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AccountPage, AuthGuardService, ComponentDirtyGuard, HomePage, RegisterConfirmPage, SettingsPage, SharedRoutingModule } from '@sumaris-net/ngx-components';
import { QuicklinkModule, QuicklinkStrategy } from 'ngx-quicklink';
import { AppObservedLocationRoutingModule } from '@app/trip/observed-location-routing.module';
import { AppInboxMessageRoutingModule } from '@app/social/message/inbox-message-routing.module';

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
      },
      // Shared module
      {
        path: 'shared',
        loadChildren: () => import('./shared/shared.testing.module').then(m => m.AppSharedTestingModule)
      },
      // Social module
      {
        path: 'social',
        loadChildren: () => import('@sumaris-net/ngx-components').then(m => m.SocialTestingModule)
      },
      // Trip module
      {
        path: 'trip',
        loadChildren: () => import('./trip/trip.testing.module').then(m => m.TripTestingModule)
      },
      // Referential module
      {
        path: 'referential',
        loadChildren: () => import('./referential/referential.testing.module').then(m => m.ReferentialTestingModule)
      },
      // Image module
      {
        path: 'image',
        loadChildren: () => import('./image/image.testing.module').then(m => m.ImageTestingModule)
      }
    ]
  },

  // Other route redirection (should at the end of the array)
  {
    path: "**",
    redirectTo: '/'
  }
];

export const ROUTE_OPTIONS: ExtraOptions = {
  enableTracing: false,
  //enableTracing: !environment.production,
  useHash: false,
  onSameUrlNavigation: 'reload',
  preloadingStrategy: QuicklinkStrategy
};

@NgModule({
  imports: [
    QuicklinkModule,
    SharedRoutingModule,
    RouterModule.forRoot(routes, ROUTE_OPTIONS)
  ],
  exports: [
    RouterModule,
    SharedRoutingModule
  ]
})
export class AppRoutingModule {
}
