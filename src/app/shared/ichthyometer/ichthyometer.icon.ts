import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { BluetoothDeviceCheckFn } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerService, IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.service';
import { IconRef, isNotEmptyArray } from '@sumaris-net/ngx-components';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';


@Component({
  selector: 'app-ichthyometer-icon',
  templateUrl: './ichthyometer.icon.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppIchthyometerIcon implements OnInit {

  @Input() title = 'SHARED.ICHTHYOMETER.TITLE';
  @Input() type: IchthyometerType
  @Input() selectedDeviceIcon: IconRef = {matIcon: 'straighten'};
  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  constructor(
    injector: Injector,
    private ichthyometerService: IchthyometerService
  ) {
  }

  ngOnInit() {
    const ichthyometerService = this.ichthyometerService;

    this.checkAfterConnect = this.checkAfterConnect || ((device) => ichthyometerService.checkAfterConnect(device));

    // Auto start the service
    this.ichthyometerService.ready();
  }

  deviceFilter(device: BluetoothDevice): boolean {
    return !!device.address;
  }

  onConnectedDevicesChanges(devices: BluetoothDevice[]) {
    // Check if there is some connected devices, and if to restart the ichthyometerService service
    if (isNotEmptyArray(devices) && !this.ichthyometerService.started) {
      // Restart the service (can have been stopped if devices all have been disconnected)
      this.ichthyometerService.ready();
    }
  }
}
