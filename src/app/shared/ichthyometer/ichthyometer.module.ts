import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IchthyometerIcon } from '@app/shared/ichthyometer/ichthyometer.icon';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';
import { PushModule } from '@rx-angular/template/push';
import { RxStateModule } from '@app/shared/rx-state.module';

@NgModule({
  imports: [
    SharedModule,
    RxStateModule,
    AppBluetoothModule
  ],
  declarations: [
    IchthyometerIcon
  ],
  exports: [
    IchthyometerIcon
  ]
})
export class AppIchthyometerModule {

}
