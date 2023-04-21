import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceCheckFn, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { map, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { FilterFn, IconRef, LocalSettings, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { PredefinedColors } from '@ionic/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothPopover, BluetoothPopoverOptions } from '@app/shared/bluetooth/bluetooth.popover';

export declare type BluetoothIconType = 'bluetooth'|'bluetooth_connected'|'bluetooth_disabled' | string;

export interface BluetoothIconState {
  id: string;
  enabled: boolean;
  loading: boolean;
  deviceFilter: FilterFn<BluetoothDevice>;
  connectedDevice: BluetoothDevice;
  deviceCheck: BluetoothDeviceCheckFn;
  matIcon: BluetoothIconType;
  color: PredefinedColors;
  autoConnect: boolean;
}

@Component({
  selector: 'app-ichthyometer-icon',
  templateUrl: './bluetooth.icon.html',
  styleUrls: [
    './bluetooth.icon.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BluetoothIcon<
  S extends BluetoothIconState = BluetoothIconState
>
  implements OnInit, OnDestroy {

  private _popoverOpened = false;
  protected readonly popoverController: PopoverController;
  protected settings: LocalSettingsService;
  protected readonly state = new RxState<S>();
  protected matIcon$ = this.state.select('matIcon');

  @Input() titleI18n: string = 'SHARED.BLUETOOTH.ICON_TITLE';
  @Input() selectedDeviceIcon: IconRef = {icon: 'information-circle'};
  @Input() settingsId = 'bluetooth';
  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set matIcon(value: BluetoothIconType) {
    this.state.set('matIcon', _ => value);
  }

  get matIcon(): BluetoothIconType {
    return this.state.get('matIcon');
  }

  @Input() set autoConnect(value: boolean) {
    this.state.set('autoConnect', _ => value);
  }

  get autoConnect(): boolean {
    return this.state.get('autoConnect');
  }

  @Input() set deviceFilter(value: FilterFn<BluetoothDevice>) {
    this.state.set('deviceFilter', _ => value);
  }

  get deviceFilter(): FilterFn<BluetoothDevice> {
    return this.state.get('deviceFilter');
  }

  @Input() set connectedDevice(value: BluetoothDevice) {
    this.state.set('connectedDevice', _ => value);
  }

  get connectedDevice(): BluetoothDevice {
    return this.state.get('connectedDevice');
  }

  @Input() set deviceCheck(value: BluetoothDeviceCheckFn) {
    this.state.set('deviceCheck', _ => value);
  }

  get deviceCheck(): BluetoothDeviceCheckFn {
    return this.state.get('deviceCheck');
  }

  get disabled(): boolean {
    return !this.enabled;
  }

  get enabled(): boolean {
    return this.state.get('enabled');
  }

  constructor(
    injector: Injector,
    protected bluetoothService: BluetoothService,
    @Optional() initialState?: Partial<S>
  ) {
    this.popoverController = injector.get(PopoverController);
    this.settings = injector.get(LocalSettingsService);
    this.state.set({
      connectedDevice: null,
      deviceFilter: null,
      ...initialState
    });

    this.state.connect('enabled', this.bluetoothService.onEnabledChanged);

    this.state.connect('matIcon', this.state.select(['enabled', 'connectedDevice'], s => s)
      .pipe(
        map(({enabled, connectedDevice}) => {
          let matIcon = 'bluetooth';
          let color:PredefinedColors;
          if (!enabled) {
            matIcon = 'bluetooth_disabled';
            color = 'medium';
          }
          if (connectedDevice) {
            matIcon = 'bluetooth_connected';
            color = 'tertiary';
          }
          this.state.set('color', _ => color);
          return matIcon;
        })));
  }

  ngOnInit() {
    // Default values
    this.autoConnect = toBoolean(this.autoConnect, false);

    this.restoreFromSettings();

  }

  ngOnDestroy() {
    this.state.ngOnDestroy();
  }

  async connect(device?: BluetoothDevice) {
    console.info('Auto connect')
  }

  async openPopover(event: Event) {
    if (this._popoverOpened || event.defaultPrevented) return; // Already opened

    event.preventDefault();
    this._popoverOpened = true;
    try {

      const popover = await this.popoverController.create({
        component: BluetoothPopover,
        componentProps: <BluetoothPopoverOptions>{
          titleI18n: this.titleI18n,
          deviceFilter: this.deviceFilter,
          selectedDevice: this.connectedDevice,
          selectedDeviceIcon: this.selectedDeviceIcon,
          checkAfterConnect: (device) => this.checkAfterConnect(device)
        },
        backdropDismiss: true,
        keyboardClose: true,
        event,
        translucent: true,
        cssClass: 'popover-large popover-bluetooth'
      });
      await popover.present();
      const {data: device, role} = await popover.onDidDismiss();
      if (device?.address && this.connectedDevice?.address !== device.address) {
        console.debug(`[bluetooth-icon] Selected device: ${device.address}`);
        this.connectedDevice = device;
      }
    }
    finally {
      this._popoverOpened = false;
    }
  }

  protected async restoreFromSettings() {

    const deviceKey = `${this.settingsId}.device`;
    const device: BluetoothDevice = this.settings.getProperty(deviceKey);

    if (device?.address) {
      this.connectedDevice = device;

      if (this.autoConnect) {
        await this.bluetoothService.connect(device);
      }
    }

  }
}
