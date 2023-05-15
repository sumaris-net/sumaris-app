import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnDestroy, OnInit, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceCheckFn, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { map, mergeMap } from 'rxjs/operators';
import { from } from 'rxjs';
import { FilterFn, IconRef, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettings, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { PredefinedColors } from '@ionic/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothPopover, BluetoothPopoverOptions } from '@app/shared/bluetooth/bluetooth.popover';
import { underscore } from '@angular-devkit/core/src/utils/strings';

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

@Component({
  selector: 'app-bluetooth-icon',
  templateUrl: './bluetooth.icon.html',
  styleUrls: [
    './bluetooth.icon.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBluetoothIcon<
  S extends BluetoothIconState<D> = BluetoothIconState<any>,
  D extends BluetoothDevice = BluetoothDevice
>
  implements OnInit, OnDestroy {

  private _popoverOpened = false;
  private _forceDisabled = false;
  protected readonly cd: ChangeDetectorRef;
  protected readonly popoverController: PopoverController;
  protected readonly settings: LocalSettingsService;
  protected readonly state = new RxState<S>();
  protected readonly icon$ = this.state.select('icon');

  @Input() titleI18n: string = 'SHARED.BLUETOOTH.ICON_TITLE';
  @Input() selectedDeviceIcon: IconRef = {icon: 'information-circle'};
  @Input() settingsId = 'bluetooth';
  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set icon(value: IconRef) {
    this.state.set('icon', _ => value);
  }

  get icon(): IconRef {
    return this.state.get('icon');
  }

  @Input() set autoConnect(value: boolean) {
    this.state.set('autoConnect', _ => value);
  }

  get autoConnect(): boolean {
    return this.state.get('autoConnect');
  }

  @Input() set deviceFilter(value: FilterFn<D>) {
    this.state.set('deviceFilter', _ => value);
  }

  get deviceFilter(): FilterFn<D> {
    return this.state.get('deviceFilter');
  }

  @Input() set devices(value: D[]) {
    this.state.set('devices', _ => value);
  }

  get devices(): D[] {
    return this.state.get('devices');
  }

  @Input() set deviceCheck(value: BluetoothDeviceCheckFn) {
    this.state.set('deviceCheck', _ => value);
  }

  get deviceCheck(): BluetoothDeviceCheckFn {
    return this.state.get('deviceCheck');
  }

  @Input() set disabled(value: boolean) {
      this._forceDisabled = value;
      this.cd.markForCheck();
  }

  get disabled(): boolean {
    return this._forceDisabled;
  }

  get enabled(): boolean {
    return this.state.get('enabled');
  }

  constructor(
    injector: Injector,
    protected bluetoothService: BluetoothService
  ) {
    this.cd = injector.get(ChangeDetectorRef)
    this.popoverController = injector.get(PopoverController);
    this.settings = injector.get(LocalSettingsService);
    this.state.set(<Partial<S>>{
      connectedDevices: [],
      deviceFilter: null
    });

    this.state.connect('enabled', this.bluetoothService.enabled$);
    this.state.connect('devices', this.bluetoothService.connectedDevices$.pipe(
      map(devices => (devices || []).map(d => this.asDevice(d)))
    ));
    this.state.connect('connectedDevices', this.state.select(['enabled', 'devices'], s => s)
      .pipe(
        map(({enabled, devices}) => {
          console.info(`[bluetooth-icon] Devices changes to: ${devices?.map(d => d.address).join(',')}`)
          return enabled ? devices : null
        })
      ));

    this.state.hold(this.state.select(['enabled', 'connectedDevices'], s => s),
      state => this.updateView(state)
      );
  }

  ngOnInit() {
    // Default values
    this.autoConnect = toBoolean(this.autoConnect, false);

  }

  ngOnDestroy() {
    this.state.ngOnDestroy();
  }

  updateView(state: {enabled: boolean, connectedDevices: D[]}) {
    let matIcon: BluetoothIconType = 'bluetooth';
    let color:PredefinedColors;
    if (!state?.enabled) {
      matIcon = 'bluetooth_disabled';
      color = 'medium';
    }
    else if (isNotEmptyArray(state?.connectedDevices)) {
      matIcon = 'bluetooth_connected';
      color = 'primary';
    }

    const iconRef = {color, matIcon};
    console.debug('[bluetooth-icon] Updating view with icon: ' + JSON.stringify(iconRef));

    this.state.set('icon', _ => iconRef);
    this.cd.markForCheck();
  }

  asDevice(device: BluetoothDevice): D {
    return device as D;
  }

  async openPopover(event: Event) {
    if (this._popoverOpened || event.defaultPrevented) return; // Already opened

    event.preventDefault();
    this._popoverOpened = true;
    try {

      const connectedDevices = this.state.get('connectedDevices');

      const popover = await this.popoverController.create({
        component: BluetoothPopover,
        componentProps: <BluetoothPopoverOptions>{
          titleI18n: this.titleI18n,
          deviceFilter: this.deviceFilter,
          selectedDevices: connectedDevices,
          selectedDevicesIcon: this.selectedDeviceIcon,
          checkAfterConnect: (device) => this.checkAfterConnect(device)
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
