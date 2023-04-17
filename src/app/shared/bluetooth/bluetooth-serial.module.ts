import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { BluetoothSerialComponent } from '@app/shared/bluetooth/bluetooth-serial.component';

@NgModule({
  imports: [
    SharedModule,
  ],
  declarations: [
    BluetoothSerialComponent
  ],
  exports: [
    BluetoothSerialComponent
  ]
})
export class BluetoothSerialModule {

}
