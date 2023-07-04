import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core';
import { BluetoothDeviceCheckFn } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerService, IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.service';
import { IconRef } from '@sumaris-net/ngx-components';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';


@Component({
  selector: 'app-ichthyometer-icon',
  templateUrl: './ichthyometer.icon.html',
  styleUrls: [
    './ichthyometer.icon.scss'
  ],
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
    this.ichthyometerService.start();
  }

  ngOnInit() {
    const ichthyometerService = this.ichthyometerService;

    this.checkAfterConnect = this.checkAfterConnect || ((device) => ichthyometerService.checkAfterConnect(device));

  }

  deviceFilter(device: BluetoothDevice): boolean {
    return !!device.address;
  }
}
