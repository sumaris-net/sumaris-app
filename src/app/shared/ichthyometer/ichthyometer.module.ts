import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { BluetoothSerialModule } from '@app/shared/bluetooth/bluetooth-serial.module';

@NgModule({
  imports: [
    SharedModule,
    BluetoothSerialModule
  ],
  exports: [
    BluetoothSerialModule
  ]
})
export class AppIchthyometerModule {

}
