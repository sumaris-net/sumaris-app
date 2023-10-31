import { NgModule } from '@angular/core';
import {AppIconModule, RxStateModule, SharedModule} from '@sumaris-net/ngx-components';
import { AppIchthyometerIcon } from '@app/shared/ichthyometer/ichthyometer.icon';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';

@NgModule({
  imports: [
    SharedModule,
    RxStateModule,
    AppIconModule,
    AppBluetoothModule
  ],
  declarations: [
    AppIchthyometerIcon
  ],
  exports: [
    AppIchthyometerIcon
  ]
})
export class AppIchthyometerModule {

}
