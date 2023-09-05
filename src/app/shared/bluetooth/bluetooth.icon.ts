import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Injector, Input, OnInit, Optional, Output } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceCheckFn, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { distinctUntilKeyChanged, map } from 'rxjs/operators';
import { equals, FilterFn, IconRef, isEmptyArray, toBoolean } from '@sumaris-net/ngx-components';
import { PredefinedColors } from '@ionic/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothPopover, BluetoothPopoverOptions } from '@app/shared/bluetooth/bluetooth.popover';

export declare type BluetoothIconType = 'bluetooth'|'bluetooth_connected'|'bluetooth_disabled' | string;

export interface BluetoothIconState<D extends BluetoothDevice = BluetoothDevice> {
  id: string;
  enabled: boolean;
  loading: boolean;
  deviceFilter: FilterFn<D>;
  deviceCheck: BluetoothDeviceCheckFn;
  devices: D[];
  connectedDevices: D[];
  icon: IconRef;
  color: PredefinedColors;
  autoConnect: boolean;
}


export const APP_BLUETOOTH_ICON_DEFAULT_STATE = new InjectionToken<Partial<BluetoothIconState<any>>>('BluetoothIconState');

@Component({
  selector: 'app-bluetooth-icon',
  templateUrl: './bluetooth.icon.html',
  providers: [
    {provide: APP_BLUETOOTH_ICON_DEFAULT_STATE, useValue: {matIcon: 'bluetooth'}},
    RxState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBluetoothIcon<
  S extends BluetoothIconState<D> = BluetoothIconState<any>,
  D extends BluetoothDevice = BluetoothDevice
>
  implements OnInit {

  private _popoverOpened = false;
  private _forceDisabled = false;

  protected readonly cd: ChangeDetectorRef;
  protected readonly popoverController: PopoverController;
  protected readonly icon$ = this._state.select('icon');
  protected readonly enabled$ = this._state.select('enabled');

  @Input() title: string = 'SHARED.BLUETOOTH.TITLE';
  @Input() selectedDeviceIcon: IconRef = {icon: 'information-circle'};
  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set icon(value: IconRef) {
    this._state.set('icon', _ => value);
  }

  get icon(): IconRef {
    return this._state.get('icon');
  }

  @Input() set autoConnect(value: boolean) {
    this._state.set('autoConnect', _ => value);
  }

  get autoConnect(): boolean {
    return this._state.get('autoConnect');
  }

  @Input() set deviceFilter(value: FilterFn<D>) {
    this._state.set('deviceFilter', _ => value);
  }

  get deviceFilter(): FilterFn<D> {
    return this._state.get('deviceFilter');
  }

  @Input() set devices(value: D[]) {
    this._state.set('devices', _ => value);
  }

  get devices(): D[] {
    return this._state.get('devices');
  }

  @Input() set deviceCheck(value: BluetoothDeviceCheckFn) {
    this._state.set('deviceCheck', _ => value);
  }

  get deviceCheck(): BluetoothDeviceCheckFn {
    return this._state.get('deviceCheck');
  }

  @Input() set disabled(value: boolean) {
      this._forceDisabled = value;
      this.cd.markForCheck();
  }

  get disabled(): boolean {
    return this._forceDisabled;
  }

  get enabled(): boolean {
    return this._state.get('enabled');
  }

  constructor(
    injector: Injector,
    protected bluetoothService: BluetoothService,
    protected _state: RxState<S>,
    @Optional() @Inject(APP_BLUETOOTH_ICON_DEFAULT_STATE) state: Partial<S>
  ) {
    this.cd = injector.get(ChangeDetectorRef)
    this.popoverController = injector.get(PopoverController);
    this._state.set(<Partial<S>>{
      icon: {matIcon: 'bluetooth'},
      ...state
    });
  }

  ngOnInit() {
    // Default values
    this.autoConnect = toBoolean(this.autoConnect, false);
    this.deviceFilter = this.deviceFilter || ((device) => !!device.address);

    // Enabled state
    this._state.connect('enabled', this.bluetoothService.enabled$);

    // Devices
    this._state.connect('devices', this.bluetoothService.connectedDevices$.pipe(
      map(devices => (devices || []).map(d => this.asDevice(d))))
    );

    // Connected devices
    this._state.connect('connectedDevices', this._state.select(['enabled', 'devices', 'deviceFilter'], s => s)
      .pipe(
        map(({enabled, devices, deviceFilter}) => {

          // If disabled: no devices
          if (!enabled) return [];

          // No filter function: all devices
          if (typeof deviceFilter !== 'function') return devices || [];

          // Filtering devices
          console.debug(`[bluetooth-icon] Filtering devices: [${devices?.map(d => d.address).join(', ')}]`);
          return (devices || []).filter(d => deviceFilter(d));
        })
      ));

    // Refresh icon, when enabled or connected devices changed
    this._state.hold(this._state.select(['enabled', 'connectedDevices'], s => s),
      state => this.updateView(state)
    );
  }

  updateView(state: {enabled: boolean, connectedDevices: D[]}) {
    console.debug('[bluetooth-icon] Updating view: ' + JSON.stringify(state));
    let oldIcon = this.icon;

    let matIcon: BluetoothIconType;
    let color:PredefinedColors;

    // Disabled
    if (!state?.enabled) {
      matIcon = 'bluetooth_disabled';
      color = 'medium';
    }

    // Enabled, no devices
    else if (isEmptyArray(state?.connectedDevices)) {
      matIcon = 'bluetooth';
      color = 'primary';
    }

    // Enabled + connected
    else {
      matIcon = 'bluetooth_connected';
      color = 'primary';
    }

    const newIcon = {color, matIcon};

    if (!equals(oldIcon, newIcon)) {
      console.debug('[bluetooth-icon] Changing icon to: ' + JSON.stringify(newIcon));
      this._state.set('icon', () => newIcon);
    }
  }

  asDevice(device: BluetoothDevice): D {
    return device as D;
  }

  async openPopover(event: Event) {
    if (this._popoverOpened || event.defaultPrevented) return; // Already opened

    event.preventDefault();
    this._popoverOpened = true;
    try {

      const connectedDevices = this._state.get('connectedDevices');

      const checkAfterConnectFn = typeof this.checkAfterConnect === 'function' ? (device) => this.checkAfterConnect(device) : undefined;
      const popover = await this.popoverController.create({
        component: BluetoothPopover,
        componentProps: <BluetoothPopoverOptions>{
          titleI18n: this.title,
          deviceFilter: this.deviceFilter,
          connectedDevices: connectedDevices,
          selectedDevicesIcon: this.selectedDeviceIcon,
          checkAfterConnect: checkAfterConnectFn
        },
        backdropDismiss: true,
        keyboardClose: true,
        event,
        translucent: true,
        cssClass: 'popover-large popover-bluetooth'
      });
      await popover.present();
      const {data, role} = await popover.onDidDismiss();

      const devices = data ? (Array.isArray(data) ? data : [data]) : undefined;
      if (devices) this.devices = devices;
    }
    finally {
      this._popoverOpened = false;
    }
  }

}
