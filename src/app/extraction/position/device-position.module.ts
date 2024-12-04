import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { DevicePositionMapPage } from '@app/extraction/position/device-position-map-page.component';
import { TranslateModule } from '@ngx-translate/core';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { AppSharedProgressionModule } from '@app/shared/progression/progression.module';

@NgModule({
  imports: [CommonModule, TranslateModule.forChild(), LeafletModule, AppCoreModule, AppSharedModule, AppSharedProgressionModule],
  declarations: [DevicePositionMapPage],
  exports: [TranslateModule, DevicePositionMapPage],
})
export class DevicePositionModule {}
