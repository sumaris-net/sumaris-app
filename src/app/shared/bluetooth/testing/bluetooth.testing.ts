import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';

interface BluetoothTestingState {
  loading: boolean;
  enabled: boolean;
  connectedDevices: BluetoothDevice[];
  values: string[]; // Read values
}

@Component({
  selector: 'app-bluetooth-testing',
  templateUrl: './bluetooth.testing.html',
  styleUrls: ['./bluetooth.testing.scss'],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BluetoothTestingPage {
  constructor(
    protected platform: Platform,
    protected bluetoothService: BluetoothService,
    private cd: ChangeDetectorRef
  ) {}

  async disconnectAll() {
    await this.bluetoothService.disconnectAll();
  }

  async disconnect(item: BluetoothDevice) {
    await this.bluetoothService.disconnect(item);
  }
}
