import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';
import { BluetoothDeviceCheckFn, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { FilterFn, IconRef, isEmptyArray, sleep } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { bluetoothClassToMatIcon } from '@app/shared/bluetooth/bluetooth.utils';
import { map } from 'rxjs/operators';

export interface BluetoothPopoverOptions {
  debug?: boolean;
  titleI18n?: string;
  selectedDevice?: BluetoothDevice;
  deviceFilter?: FilterFn<BluetoothDevice>;
  selectedDeviceIcon?: IconRef;
  checkAfterConnect?: BluetoothDeviceCheckFn;
}

interface BluetoothPopoverState {
  loading: boolean;
  enabled: boolean;
  devices: BluetoothDevice[];
  selectedDevice: BluetoothDevice;
  connecting: boolean;
}

@Component({
  selector: 'app-bluetooth-popover',
  templateUrl: './bluetooth.popover.html',
  styleUrls: ['./bluetooth.popover.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState]
})
export class BluetoothPopover implements OnInit, BluetoothPopoverOptions {

  readonly enabled$ = this.state.select('enabled');
  readonly loading$ = this.state.select('loading');
  readonly devices$ = this.state.select('devices');
  readonly deviceCount$ = this.devices$.pipe(map(v => v.length));
  readonly selectedDevice$ = this.state.select('selectedDevice');
  readonly connecting$ = this.state.select('connecting');

  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set devices(value: BluetoothDevice[]) {
    this.state.set('devices', _ => value);
  }

  get devices(): BluetoothDevice[] {
    return this.state.get('devices');
  }

  @Input() set selectedDevice(value: BluetoothDevice) {
    this.state.set('selectedDevice', _ => value);
  }

  get selectedDevice(): BluetoothDevice {
    return this.state.get('selectedDevice');
  }

  get enabled(): boolean {
    return this.state.get('enabled');
  }

  get disabled(): boolean {
    return !this.enabled;
  }
  get connected(): boolean {
    return !!this.selectedDevice;
  }

  @Input() set connecting(value: boolean) {
    this.state.set('connecting', _ => value);
  }

  get connecting(): boolean {
    return this.state.get('connecting');
  }

  @Input() debug = false;
  @Input() titleI18n: string;
  @Input() deviceFilter: FilterFn<BluetoothDevice>;
  @Input() selectedDeviceIcon: IconRef = {icon: 'information-circle'};

  constructor(
    protected cd: ChangeDetectorRef,
    protected popoverController: PopoverController,
    protected service: BluetoothService,
    protected state: RxState<BluetoothPopoverState>) {

  }

  ngOnInit() {
    this.checkEnabledAndScan();
  }

  async checkEnabledAndScan() {

    let enabled: boolean;
    try {
      await this.service.ready();
      enabled = await this.service.isEnabled();
    }
    catch (err) {
      console.error(`[bluetooth-popover] Error while getting if bluetooth is enabled: ${err?.message||err}`, err);
      enabled = false; // Continue
    }
    this.state.set('enabled', _ => enabled);

    // If enabled
    if (enabled) {
      // Try to connect the selected device (if not already done)
      if (this.selectedDevice) {
        await this.connect(null, this.selectedDevice);
      }
      else {
        await this.scan();
        this.markAsConnecting();
      }
    }
    else {
      this.markAsConnecting();
      this.markAsLoaded();
    }
  }

  async toggleBluetooth() {
    if (this.enabled) {
      await this.disable();
    }
    else {
      const enabled = await this.enable();
      if (enabled) {
        // Start a scan
        await this.scan();
      }
    }
  }

  async enable() {
    const enabled = await this.service.enable();
    this.state.set('enabled', _ => enabled);
    return enabled;
  }

  async disable() {
    this.devices = [];
    await this.disconnect(this.selectedDevice, {addToDevices: false});

    const disabled = await this.service.disable();
    this.state.set('enabled', _ => !disabled);
  }

  async scan() {
    try {
      // Mark as loading
      this.markAsLoading();

      // Clear devices
      this.state.set('devices', _ => []);

      // Enable if need
      const enabled = await this.service.enable();
      if (!enabled) return;

      let devices = await this.service.scan();

      // Apply filter
      if (this.deviceFilter) {
        devices = devices.filter(this.deviceFilter);
      }

      // Apply result
      this.state.set('devices', _ => devices);
    }
    catch (err) {
      console.error('[bluetooth-popover] Error while scanning devices: ' + (err?.message || '') + ' ' + JSON.stringify(err));
    }
    finally {
      this.markAsLoaded();
    }
  }

  async connect(event: Event|undefined, device: BluetoothDevice, opts?: {dismiss?: boolean}): Promise<boolean> {
    if (event?.defaultPrevented) return false;
    event?.preventDefault();

    console.info(`[bluetooth-popover] New device selected: {${device.address}}`);

    let connected = false;
    try {
      this.state.set('selectedDevice', _ => device);

      // Connect
      this.markAsConnecting();
      connected = await this.service.connect(device);

      // Cannot connect
      if (!connected) return false;

      if (typeof this.checkAfterConnect !== 'function') {
        console.debug('[bluetooth-popover] Cannot check if connection is valid: input \'checkAfterConnect\' not set');
      }
      else {
        // Check connection is valid
        console.debug('[bluetooth-popover] Calling checkAfterConnect()...');
        try {
          connected = await this.checkAfterConnect(device);
          if (!connected) {
            console.warn('[bluetooth-popover] Not a valid device!');
          }
        }
        catch (e) {
          console.error('[bluetooth-popover] Failed during checkAfterConnect(): ' + (e?.message || e));
          connected = false;
        }
        if (!connected) return false;
      }

      this.cd.markForCheck();

      // Dismiss, if connected
      if (opts?.dismiss) {
        await sleep(500);
        this.dismiss(device);
      }

      return true;
    }
    catch (err) {
      console.error(err);
      return false;
    }
    finally {
      if (connected) {
        this.markAsConnected();
      }
      else {
        await this.disconnect(device);
      }
    }
  }

  async disconnect(device?: BluetoothDevice, opts?: {addToDevices: boolean}) {
    device = device || this.selectedDevice;
    if (device) {
      await this.service.disconnect(device);

      this.state.set('selectedDevice', _ => null);
      this.markAsConnecting();

      if (isEmptyArray(this.devices) && opts?.addToDevices !== false) {
        this.devices = [device];
      }
    }
  }

  dismiss(data?: any, role?: string) {
    this.popoverController.dismiss(data, role);
  }

  trackByFn(index: number, device: BluetoothDevice) {
    return device.address;
  }

  getDeviceMatIcon(device: BluetoothDevice) {
    return bluetoothClassToMatIcon(device?.class || 0);
  }


  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected markAsLoading() {
    this.state.set('loading', _ => true);
  }

  protected markAsLoaded() {
    this.state.set('loading', _ => false);
  }

  protected markAsConnecting() {
    this.state.set('connecting', _ => true);
  }

  protected markAsConnected() {
    this.state.set('connecting', _ => false);
  }
}
