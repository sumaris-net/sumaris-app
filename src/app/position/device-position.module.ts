import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { DevicePositionMapPage } from '@app/position/device-position-map-page.component';
import { TranslateModule } from '@ngx-translate/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

@NgModule({
  imports: [
    CommonModule,
    LeafletModule,
    AppCoreModule,
    AppSharedModule,
    TranslateModule.forChild(),
  ],
  declarations: [
    DevicePositionMapPage,
  ],
  exports: [
    TranslateModule,
    DevicePositionMapPage,
  ],
})
export class DevicePositionModule { }
