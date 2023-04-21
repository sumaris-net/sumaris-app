import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, Output } from '@angular/core';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { BluetoothIcon, BluetoothIconState } from '@app/shared/bluetooth/bluetooth.icon';
import { IconRef } from '@sumaris-net/ngx-components';
import { map, switchMap } from 'rxjs/operators';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { selectSlice } from '@rx-angular/state';


export declare type IchthyometerType = 'gwaleen';
interface IchthyometerIconState extends BluetoothIconState {
  type: IchthyometerType;
  connectedIchthyometer: Ichthyometer;
}

@Component({
  selector: 'app-ichthyometer-icon',
  templateUrl: './ichthyometer.icon.html',
  styleUrls: [
    './ichthyometer.icon.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IchthyometerIcon extends BluetoothIcon<IchthyometerIconState> implements OnDestroy {

  protected readonly connectedIchthyometer$ = this.state.select('connectedIchthyometer');

  @Input() set type(value: IchthyometerType) {
    this.state.set('type', _ => value);
  }

  get type(): IchthyometerType {
    return this.state.get('type');
  }

  @Input() set connectedIchthyometer(value: Ichthyometer) {
    this.state.set('connectedIchthyometer', _ => value);
  }

  get connectedIchthyometer(): Ichthyometer {
    return this.state.get('connectedIchthyometer');
  }

  @Output() onRead = this.state.select('connectedIchthyometer').pipe(
    switchMap(item => item.watch())
  )

  constructor(
    injector: Injector,
    bluetoothService: BluetoothService,
    private ichthyometerService: IchthyometerService
  ) {
    super(injector, bluetoothService, {
      connectedIchthyometer: null
    });
    this.titleI18n = 'SHARED.ICHTHYOMETER.TITLE';
    this.selectedDeviceIcon = {matIcon: 'straighten'};
    this.settingsId = 'ichthyometer';


    this.state.connect('connectedIchthyometer', this.state.select(selectSlice(['connectedDevice', 'type']))
      .pipe(
        map(({connectedDevice, type}) => {
          if (connectedDevice?.address) {
            return this.ichthyometerService.get(connectedDevice, type);
          }
          return null
        })
      )
    );
  }


  ngOnInit() {
    super.ngOnInit();

    this.checkAfterConnect = this.checkAfterConnect || ((device) => {
      const ichthyometer = this.ichthyometerService.get(device, this.type);
      return ichthyometer.ping();
    });
  }
}
