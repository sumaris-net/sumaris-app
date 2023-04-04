import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DevicePositionRoutingModule } from './device-position-routing.module';
import {AppCoreModule} from '@app/core/core.module';
import {AppSharedModule} from '@app/shared/shared.module';
import {DevicePositionMapPage} from '@app/device-position/device-position-table/device-position-map-page.component';
import {TranslateModule} from '@ngx-translate/core';

@NgModule({
  declarations: [
    DevicePositionMapPage,
  ],
  exports: [
    TranslateModule,
    DevicePositionMapPage,
  ],
  imports: [
    CommonModule,
    AppCoreModule,
    AppSharedModule,
    TranslateModule.forChild(),
  ],
})
export class DevicePositionModule { }
