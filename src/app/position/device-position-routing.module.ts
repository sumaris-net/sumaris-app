import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {comment} from 'postcss';
import {DevicePositionMapPage} from '@app/position/device-position-map-page.component';
import {AuthGuardService} from '@sumaris-net/ngx-components';


const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: DevicePositionMapPage,
    canActivate: [AuthGuardService],
    data: {
      profile: 'ADMIN'
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevicePositionRoutingModule { }
