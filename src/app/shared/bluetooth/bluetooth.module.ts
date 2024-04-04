import { NgModule } from '@angular/core';
import { AppIconModule, RxStateModule, SharedModule } from '@sumaris-net/ngx-components';
import { AppBluetoothIcon } from './bluetooth.icon';
import { TranslateModule } from '@ngx-translate/core';
import { BluetoothPopover } from '@app/shared/bluetooth/bluetooth.popover';

@NgModule({
  imports: [SharedModule, TranslateModule.forChild(), RxStateModule, AppIconModule],
  declarations: [AppBluetoothIcon, BluetoothPopover],
  exports: [TranslateModule, AppBluetoothIcon, BluetoothPopover],
})
export class AppBluetoothModule {}
