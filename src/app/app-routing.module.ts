import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { environment } from '@environments/environment';
import {
  AccountPage,
  AppChangePasswordPage,
  AuthGuardService,
  ComponentDirtyGuard,
  HomePage,
  RegisterConfirmPage,
  SettingsPage,
  SharedRoutingModule,
} from '@sumaris-net/ngx-components';
import { QuicklinkModule, QuicklinkStrategy } from 'ngx-quicklink';

const routes: Routes = [
  // Core path
  {
    path: '',
    component: HomePage,
  },

  {
    path: 'home/:action',
    component: HomePage,
  },
  {
    path: 'confirm/:email/:code',
    component: RegisterConfirmPage,
  },
  {
    path: 'password/:email/:token',
    component: AppChangePasswordPage,
  },
  {
    path: 'account',
    canActivate: [AuthGuardService],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: AccountPage,
        canDeactivate: [ComponentDirtyGuard],
      },
      {
        path: 'password',
        component: AppChangePasswordPage,
      },
    ],
  },

  {
    path: 'settings',
    pathMatch: 'full',
    component: SettingsPage,
    canDeactivate: [ComponentDirtyGuard],
  },

  // Admin
  {
    path: 'admin',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./admin/admin-routing.module').then((m) => m.AppAdminRoutingModule),
  },

  // Referential
  {
    path: 'referential',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./referential/referential-routing.module').then((m) => m.ReferentialRoutingModule),
  },

  // Vessel
  {
    path: 'vessels',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./vessel/vessel-routing.module').then((m) => m.VesselRoutingModule),
  },

  // ScientificCruise
  {
    path: 'scientific-cruise',
    data: {
      profile: 'USER',
    },
    loadChildren: () => import('./trip/scientific-cruise/scientific-cruise-routing.module').then((m) => m.AppScientificCruiseRoutingModule),
  },

  // Trips
  {
    path: 'trips',
    data: {
      profile: 'USER',
    },
    loadChildren: () => import('./trip/trip/trip-routing.module').then((m) => m.AppTripRoutingModule),
  },

  // Observations
  {
    path: 'observations',
    loadChildren: () => import('./trip/observedlocation/observed-location-routing.module').then((m) => m.AppObservedLocationRoutingModule),
  },

  // Landings
  {
    path: 'landings',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
    },
    loadChildren: () => import('./trip/landing/landings-routing.module').then((m) => m.AppLandingsRoutingModule),
  },

  // Activity Calendar
  {
    path: 'activity-calendar',
    loadChildren: () => import('./activity-calendar/activity-calendar-routing.module').then((m) => m.AppActivityCalendarRoutingModule),
  },

  // Extraction path
  {
    path: 'extraction',
    canActivate: [AuthGuardService],
    data: {
      profile: 'GUEST',
    },
    loadChildren: () => import('./extraction/extraction-routing.module').then((m) => m.AppExtractionRoutingModule),
  },

  // Inbox message
  {
    path: 'inbox',
    canActivate: [AuthGuardService],
    data: {
      profile: 'USER',
    },
    loadChildren: () => import('./social/message/inbox-message-routing.module').then((m) => m.AppInboxMessageRoutingModule),
  },

  // Shared page
  {
    path: 'share',
    loadChildren: () => import('./social/social-routing.module').then((m) => m.SocialRoutingModule),
    data: {
      preload: false,
    },
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
          preload: false,
        },
      },
      // Shared module
      {
        path: 'shared',
        loadChildren: () => import('./shared/shared.testing.module').then((m) => m.AppSharedTestingModule),
        data: {
          preload: false,
        },
      },
      // Core module
      {
        path: 'core',
        loadChildren: () => import('@sumaris-net/ngx-components').then((m) => m.CoreTestingModule),
        data: {
          preload: false,
        },
      },
      // Social module
      {
        path: 'social',
        loadChildren: () => import('@sumaris-net/ngx-components').then((m) => m.SocialTestingModule),
        data: {
          preload: false,
        },
      },
      // Data module
      {
        path: 'data',
        loadChildren: () => import('./data/data.testing.module').then((m) => m.DataTestingModule),
        data: {
          preload: false,
        },
      },
      // Referential module
      {
        path: 'referential',
        loadChildren: () => import('./referential/referential.testing.module').then((m) => m.ReferentialTestingModule),
        data: {
          preload: false,
        },
      },
      // Trip module
      {
        path: 'trip',
        loadChildren: () => import('./trip/trip.testing.module').then((m) => m.TripTestingModule),
        data: {
          preload: false,
        },
      },
      // Activity calendar
      {
        path: 'activity-calendar',
        loadChildren: () => import('./activity-calendar/calendar/testing/calendar.testing.module').then((m) => m.CalendarTestingModule),
        data: {
          preload: false,
        },
      },
    ],
  },

  // Other route redirection (should at the end of the array)
  {
    path: '**',
    redirectTo: '/',
  },
];

export const ROUTE_OPTIONS: ExtraOptions = {
  // DEBUG
  //enableTracing: !environment.production,
  enableTracing: false,
  useHash: environment.useHash || false,
  onSameUrlNavigation: 'reload',
  preloadingStrategy: QuicklinkStrategy,
};

@NgModule({
  imports: [QuicklinkModule, SharedRoutingModule, RouterModule.forRoot(routes, ROUTE_OPTIONS)],
  exports: [RouterModule, SharedRoutingModule],
})
export class AppRoutingModule {}
