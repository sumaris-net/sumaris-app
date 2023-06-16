import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy } from '@angular/core';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { AppBluetoothIcon, BluetoothIconState } from '@app/shared/bluetooth/bluetooth.icon';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';


export declare type IchthyometerType = 'gwaleen';
interface IchthyometerIconState extends BluetoothIconState<Ichthyometer> {
  type: IchthyometerType;
}

@Component({
  selector: 'app-ichthyometer-icon',
  templateUrl: './ichthyometer.icon.html',
  styleUrls: [
    './ichthyometer.icon.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppIchthyometerIcon extends AppBluetoothIcon<IchthyometerIconState, Ichthyometer> implements OnDestroy {


  @Input() set type(value: IchthyometerType) {
    this.state.set('type', _ => value);
  }

  get type(): IchthyometerType {
    return this.state.get('type');
  }

  constructor(
    injector: Injector,
    bluetoothService: BluetoothService,
    private ichthyometerService: IchthyometerService
  ) {
    super(injector, bluetoothService);
    this.titleI18n = 'SHARED.ICHTHYOMETER.TITLE';
    this.selectedDeviceIcon = {matIcon: 'straighten'};
    this.settingsId = 'ichthyometer';
  }


  ngOnInit() {
    super.ngOnInit();

    const self = this;

    this.checkAfterConnect = this.checkAfterConnect || ((device) => {
      const ichthyometer = self.ichthyometerService.get(device, self.type);
      return ichthyometer.ping();
    });
  }

  asDevice(device: BluetoothDevice): Ichthyometer {
    return this.ichthyometerService.get(device, this.type);
  }

}
