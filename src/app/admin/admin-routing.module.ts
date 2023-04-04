import { RouterModule, Routes } from '@angular/router';
import { AuthGuardService, UsersPage } from '@sumaris-net/ngx-components';
import { NgModule } from '@angular/core';
import { ConfigurationPage } from './config/configuration.page';
import { AppAdminModule } from './admin.module';

const routes: Routes = [
  {
    path: 'users',
    pathMatch: 'full',
    component: UsersPage,
    canActivate: [AuthGuardService],
    data: {
      profile: 'ADMIN'
    }
  },
  {
    path: 'config',
    pathMatch: 'full',
    component: ConfigurationPage,
    canActivate: [AuthGuardService],
    data: {
      profile: 'ADMIN'
    }
  },

  // DevicePosition path
  {
    path: 'device-position',
    canActivate: [AuthGuardService],
    data: {
      profile: 'ADMIN'
    },
    loadChildren: () => import('./position/device-position-routing.module').then(m => m.DevicePositionRoutingModule)
  },
];

@NgModule({
  imports: [
    AppAdminModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class AppAdminRoutingModule { }
