import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {comment} from 'postcss';
import {DevicePositionMapPage} from '@app/device-position/device-position-table/device-position-map-page.component';
import {AuthGuardService} from '@sumaris-net/ngx-components';


const routes: Routes = [
  {
    path: '',
    component: DevicePositionMapPage,
    data: {
      profile: 'SUPERVISOR'
    },
    canActivate: [AuthGuardService], // TODO ensure this can only be accessed by admin
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DevicePositionRoutingModule { }
