import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  InjectionToken,
  Injector,
  Input,
  OnInit,
  Optional,
  Output,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceCheckFn, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { distinctUntilKeyChanged, map } from 'rxjs/operators';
import { equals, FilterFn, IconRef, isEmptyArray, isNil, MatBadgeFill, toBoolean } from '@sumaris-net/ngx-components';
import { PopoverController } from '@ionic/angular';
import { BluetoothPopover, BluetoothPopoverOptions } from '@app/shared/bluetooth/bluetooth.popover';
import { MatBadgePosition, MatBadgeSize } from '@angular/material/badge';
import { AppColors } from '@app/shared/colors.utils';
import { Subscription, timer } from 'rxjs';

export declare type BluetoothIconType = 'bluetooth' | 'bluetooth_connected' | 'bluetooth_disabled' | string;

export class BluetoothMatIconRef {
  color: AppColors;
  matIcon: string;
  badge?: string | number;
  badgeIcon?: string;
  badgeMatIcon?: string;
  badgeColor?: AppColors;
  badgeFill?: MatBadgeFill;
}

export interface BluetoothIconState<D extends BluetoothDevice = BluetoothDevice> {
  id: string;
  enabled: boolean;
  connecting: boolean;
  deviceFilter: FilterFn<D>;
  deviceCheck: BluetoothDeviceCheckFn;
  devices: D[];
  connectedDevices: D[];
  icon: BluetoothMatIconRef;
  autoConnect: boolean;
}

export const APP_BLUETOOTH_ICON_DEFAULT_STATE = new InjectionToken<Partial<BluetoothIconState<any>>>('BluetoothIconState');

@Component({
  selector: 'app-bluetooth-icon',
  templateUrl: './bluetooth.icon.html',
  providers: [{ provide: APP_BLUETOOTH_ICON_DEFAULT_STATE, useValue: { matIcon: 'bluetooth' } }, RxState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBluetoothIcon<S extends BluetoothIconState<D> = BluetoothIconState<any>, D extends BluetoothDevice = BluetoothDevice>
  implements OnInit
{
  private _popoverOpened = false;
  private _forceDisabled = false;
  private _blinkSubscription: Subscription;

  protected readonly cd: ChangeDetectorRef;
  protected readonly popoverController: PopoverController;
  protected readonly icon$ = this._state.select('icon');

  @Input() title = 'SHARED.BLUETOOTH.TITLE';
  @Input() selectedDeviceIcon: IconRef = { icon: 'information-circle' };
  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set icon(value: BluetoothMatIconRef) {
    this._state.set('icon', (_) => value);
  }

  get icon(): BluetoothMatIconRef {
    return this._state.get('icon');
  }

  @Input() set autoConnect(value: boolean) {
    this._state.set('autoConnect', (_) => value);
  }

  get autoConnect(): boolean {
    return this._state.get('autoConnect');
  }

  @Input() set deviceFilter(value: FilterFn<D>) {
    this._state.set('deviceFilter', (_) => value);
  }

  get deviceFilter(): FilterFn<D> {
    return this._state.get('deviceFilter');
  }

  @Input() set devices(value: D[]) {
    this._state.set('devices', (_) => value);
  }

  get devices(): D[] {
    return this._state.get('devices');
  }

  @Input() set deviceCheck(value: BluetoothDeviceCheckFn) {
    this._state.set('deviceCheck', (_) => value);
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

  @Output() connectedDevicesChanges = this._state.$.pipe(
    distinctUntilKeyChanged('connectedDevices'),
    map((s) => s.connectedDevices)
  );

  @Input() badgeSize: MatBadgeSize = 'small';
  @Input() badgePosition: MatBadgePosition = 'above after';
  @Input() badgeHidden = false;

  constructor(
    injector: Injector,
    protected bluetoothService: BluetoothService,
    protected _state: RxState<S>,
    @Optional() @Inject(APP_BLUETOOTH_ICON_DEFAULT_STATE) state: Partial<S>
  ) {
    this.cd = injector.get(ChangeDetectorRef);
    this.popoverController = injector.get(PopoverController);
    this._state.set(<Partial<S>>{
      icon: { matIcon: 'bluetooth', badge: null },
      ...state,
    });
  }

  ngOnInit() {
    // Default values
    this.autoConnect = toBoolean(this.autoConnect, false);
    this.deviceFilter = this.deviceFilter || ((device) => !!device.address);

    // Enabled state
    this._state.connect('enabled', this.bluetoothService.enabled$);
    this._state.connect('connecting', this.bluetoothService.connecting$);

    // Devices
    this._state.connect(
      'devices',
      this.bluetoothService.connectedDevices$.pipe(map((devices) => (devices === null ? null : devices.map((d) => this.asDevice(d)))))
    );

    // Connected devices
    this._state.connect(
      'connectedDevices',
      this._state
        .select(['enabled', 'devices', 'deviceFilter'], (s) => s)
        .pipe(
          map(({ enabled, devices, deviceFilter }) => {
            // DEBUG
            //console.debug(`[bluetooth-icon] Receiving state changes: ${JSON.stringify({enabled, devices})}`);

            // If disabled: no devices
            if (!enabled || !devices) return null;

            // No filter function: all devices
            if (typeof deviceFilter !== 'function') return devices;

            // DEBUG
            //console.debug(`[bluetooth-icon] Filtering devices: [${devices?.map(d => d.address).join(', ')}]`);

            // Filtering devices
            return devices.filter((d) => deviceFilter(d));
          })
        )
    );

    // Refresh icon, when enabled or connected devices changed
    this._state.hold(
      this._state.select(['enabled', 'connectedDevices', 'connecting'], (s) => s),
      (s) => this.updateView(s)
    );
  }

  updateView(state: { enabled: boolean | null; connectedDevices: D[] | null; connecting: boolean | null }) {
    state = state || { enabled: null, connectedDevices: null, connecting: null };

    // DEBUG
    //console.debug('[bluetooth-icon] Updating view: ' + JSON.stringify(state));

    let matIcon: BluetoothIconType;
    let color: AppColors;
    let badge: string | number;
    let badgeIcon: string;
    let badgeMatIcon: string;
    let badgeColor: AppColors;
    let badgeBlink = false;
    let badgeFill: MatBadgeFill = 'solid';

    // Starting
    if (isNil(state.enabled)) {
      matIcon = 'bluetooth_disabled';
      color = 'light';
      badge = '…';
      badgeColor = 'accent';
      badgeBlink = true;
    }

    // Disabled
    else if (state.enabled !== true) {
      matIcon = 'bluetooth_disabled';
      color = 'light';
      badge = '';
    }

    // Enabled, connecting (or waiting devices)
    else if (this.bluetoothService.starting || state.connecting) {
      matIcon = 'bluetooth';
      color = 'tertiary';
      badge = '…';
      badgeColor = 'accent';
      badgeBlink = true;
    }

    // Enabled, never had a devices
    else if (isNil(state.connectedDevices)) {
      matIcon = 'bluetooth';
      color = 'tertiary';
    }

    // Enabled, no devices anymore (but had some)
    else if (isEmptyArray(state.connectedDevices)) {
      matIcon = 'bluetooth';
      color = 'tertiary';
      badgeIcon = 'alert';
      badgeColor = 'danger';
      badgeFill = 'clear';
    }

    // Enabled, has connected devices
    else {
      matIcon = 'bluetooth_connected';
      color = 'tertiary';
      badgeColor = 'success';
      badge = state.connectedDevices.length;
    }

    // Set icon
    const icon = { color, matIcon, badge, badgeIcon, badgeColor, badgeFill, badgeMatIcon };
    if (!equals(this.icon, icon)) {
      // DEBUG
      //console.debug('[bluetooth-icon] Changing icon to: ' + JSON.stringify(icon));

      this._state.set('icon', () => icon);
    }

    // Blink animation
    if (badgeBlink) this.startBlinkAnimation();
    else this.stopBlinkAnimation();
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
          connectedDevices,
          selectedDevicesIcon: this.selectedDeviceIcon,
          checkAfterConnect: checkAfterConnectFn,
        },
        backdropDismiss: true,
        keyboardClose: true,
        event,
        translucent: true,
        cssClass: 'popover-large popover-bluetooth',
      });
      await popover.present();
      const { data, role } = await popover.onDidDismiss();

      const devices = data ? (Array.isArray(data) ? data : [data]) : undefined;
      if (devices) this.devices = devices;
    } finally {
      this._popoverOpened = false;
    }
  }

  private startBlinkAnimation() {
    if (!this._blinkSubscription && !this.badgeHidden) {
      this._blinkSubscription = timer(500, 500).subscribe(() => {
        this.badgeHidden = !this.badgeHidden;
        this.cd.markForCheck();
      });
      this._blinkSubscription.add(() => {
        this._blinkSubscription = null;
        // Restore initial value (before timer)
        if (this.badgeHidden) {
          this.badgeHidden = false;
          this.cd.markForCheck();
        }
      });
    }
  }

  private stopBlinkAnimation() {
    this._blinkSubscription?.unsubscribe();
  }
}
