import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';
import { BluetoothDeviceCheckFn, BluetoothDeviceWithMeta, BluetoothService, removeByAddress } from '@app/shared/bluetooth/bluetooth.service';
import {
  chainPromises,
  FilterFn,
  IconRef,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  removeDuplicatesFromArray,
  sleep,
} from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { bluetoothClassToMatIcon } from '@app/shared/bluetooth/bluetooth.utils';
import { map } from 'rxjs/operators';

export interface BluetoothPopoverOptions {
  debug?: boolean;
  titleI18n?: string;
  connectedDevices?: BluetoothDeviceWithMeta[];
  deviceFilter?: FilterFn<BluetoothDevice>;
  selectedDevicesIcon?: IconRef;
  checkAfterConnect?: BluetoothDeviceCheckFn;
}

interface BluetoothPopoverState {
  loading: boolean;
  enabled: boolean;
  devices: BluetoothDeviceWithMeta[];
  connectedDevices: BluetoothDeviceWithMeta[];
  connecting: boolean;
}

@Component({
  selector: 'app-bluetooth-popover',
  templateUrl: './bluetooth.popover.html',
  styleUrls: ['./bluetooth.popover.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState],
})
export class BluetoothPopover implements OnInit, BluetoothPopoverOptions {
  readonly enabled$ = this.service.enabled$;
  readonly loading$ = this.state.select('loading');
  readonly devices$ = this.state.select('devices');
  readonly deviceCount$ = this.devices$.pipe(map((v) => v.length));
  readonly connectedDevices$ = this.state.select('connectedDevices');
  readonly connecting$ = this.state.select('connecting');

  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set devices(value: BluetoothDevice[]) {
    this.state.set('devices', (_) => value);
  }

  get devices(): BluetoothDevice[] {
    return this.state.get('devices');
  }

  @Input() set connectedDevices(value: BluetoothDevice[]) {
    this.state.set('connectedDevices', (_) => value);
  }

  get connectedDevices(): BluetoothDevice[] {
    return this.state.get('connectedDevices');
  }

  @Input() set connecting(value: boolean) {
    this.state.set('connecting', (_) => value);
  }

  get connecting(): boolean {
    return this.state.get('connecting');
  }

  @Input() debug = false;
  @Input() titleI18n: string;
  @Input() deviceFilter: FilterFn<BluetoothDevice>;
  @Input() selectedDevicesIcon: IconRef = { icon: 'information-circle' };

  constructor(
    protected cd: ChangeDetectorRef,
    protected popoverController: PopoverController,
    protected service: BluetoothService,
    protected state: RxState<BluetoothPopoverState>
  ) {}

  ngOnInit() {
    this.checkEnabledAndScan();
  }

  async checkEnabledAndScan() {
    let enabled: boolean;
    try {
      await this.service.ready();
      enabled = await this.service.enable();
    } catch (err) {
      console.error(`[bluetooth-popover] Error trying to enable bluetooth: ${err?.message || err}`, err);
      enabled = false; // Continue
    }

    // If enabled
    if (enabled) {
      this.state.set('enabled', (_) => enabled);
      let connectedDevices = this.connectedDevices || [];
      let devices = this.devices || [];

      // Try to reconnect all connected devices
      if (isNotEmptyArray(connectedDevices)) {
        this.markAsConnecting();
        connectedDevices = (
          await chainPromises(
            connectedDevices.map(
              (d) => () =>
                this.connect(null, d, { dismiss: false })
                  .catch((_) => false)
                  .then((connected) => {
                    if (connected) {
                      devices = removeByAddress(devices, d);
                      return d;
                    }
                    devices = removeDuplicatesFromArray([d, ...devices], 'address');
                    return null; // Will be excluded in the next filter()
                  })
            )
          )
        ).filter(isNotNil);
        this.state.set({ enabled, devices, connectedDevices });
        this.markAsConnected();
        this.markAsLoaded();
      } else {
        this.connectedDevices = [];
        await this.scan();
        this.markAsConnecting();
      }
    } else {
      this.markAsConnecting();
      this.markAsLoaded();
    }
  }

  async toggleBluetooth() {
    const enabled = await this.service.isEnabled();
    if (enabled) {
      await this.disable();
    } else {
      const enabled = await this.enable();
      if (enabled) {
        // Start a scan
        await this.scan();
      }
    }
  }

  async enable() {
    const enabled = await this.service.enable();
    this.state.set('enabled', (_) => enabled);
    return enabled;
  }

  async disable() {
    this.devices = [];
    await this.disconnectAll({ addToDevices: false });

    const disabled = await this.service.disable();
    this.state.set('enabled', (_) => !disabled);
  }

  async scan() {
    try {
      // Mark as loading
      this.markAsLoading();

      // Clear devices
      this.state.set('devices', (_) => []);

      // Enable if need
      const enabled = await this.service.enable();
      if (!enabled) return;

      let devices = await this.service.scan();

      // Apply filter
      if (this.deviceFilter) {
        devices = (devices || []).filter(this.deviceFilter);
      }

      // Apply result
      this.state.set('devices', (_) => devices);
    } catch (err) {
      console.error('[bluetooth-popover] Error while scanning devices: ' + (err?.message || '') + ' ' + JSON.stringify(err));
    } finally {
      this.markAsLoaded();
    }
  }

  async connect(event: Event | undefined, device: BluetoothDeviceWithMeta, opts?: { dismiss?: boolean }): Promise<boolean> {
    if (event?.defaultPrevented) return false;
    event?.preventDefault();

    console.info(`[bluetooth-popover] Connecting to: {${device.address}}`);

    let connected = false;
    try {
      // Add to connectedDevices
      this.state.set('connectedDevices', (s) => removeDuplicatesFromArray([...s.connectedDevices, device], 'address'));

      connected = await this.service.isConnected(device);
      if (connected) return true; // Already connected

      // Connect
      this.markAsConnecting();
      connected = await this.service.connect(device);

      // Cannot connect
      if (!connected) return false;

      if (typeof this.checkAfterConnect !== 'function') {
        console.debug("[bluetooth-popover] Cannot check if connection is valid: input 'checkAfterConnect' not set");
      } else {
        // Check connection is valid
        console.debug('[bluetooth-popover] Calling checkAfterConnect()...');
        try {
          const deviceOrConnected = await this.checkAfterConnect(device);
          connected = !!deviceOrConnected;
          if (!connected) {
            console.warn('[bluetooth-popover] Not a valid device!', deviceOrConnected);
          } else {
            if (typeof deviceOrConnected === 'object') {
              // Update device (with updated device received)
              const device: BluetoothDevice = deviceOrConnected;
              this.state.set('connectedDevices', (s) => removeDuplicatesFromArray([device, ...s.connectedDevices], 'address'));
            }
            // Remove from available devices
            this.state.set('devices', (s) => removeByAddress(s.devices, device));
          }
        } catch (e) {
          console.error('[bluetooth-popover] Failed during checkAfterConnect(): ' + (e?.message || e));
          connected = false;
        }
      }

      this.cd.markForCheck();

      // Dismiss, if connected
      if (!opts || opts.dismiss !== false) {
        await sleep(500);
        this.dismiss(this.connectedDevices);
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      if (connected) {
        this.markAsConnected();
      } else {
        await this.disconnect(device);
      }
    }
  }

  async disconnectAll(opts?: { addToDevices: boolean }) {
    const selectedDevices = this.connectedDevices?.slice();
    if (isEmptyArray(selectedDevices)) return; // Skip if empty

    await chainPromises(
      selectedDevices.map(
        (d) => () =>
          this.disconnect(d, { addToDevices: false }).catch((_) => {
            /*continue*/
          })
      )
    );

    if (opts?.addToDevices !== false) {
      this.devices = selectedDevices;
    }
  }

  async disconnect(device: BluetoothDevice, opts?: { addToDevices: boolean }) {
    if (!device?.address) throw new Error('Missing device');

    console.debug(`[bluetooth-popover] Disconnecting {${device.address}} ...`);

    await this.service.disconnect(device);

    this.state.set('connectedDevices', (s) => removeByAddress(s.connectedDevices, device));

    if (opts?.addToDevices !== false) {
      this.state.set('devices', (s) => removeDuplicatesFromArray([device, ...s.devices], 'address'));
    }

    this.markAsConnecting();
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
    this.state.set('loading', (_) => true);
  }

  protected markAsLoaded() {
    this.state.set('loading', (_) => false);
  }

  protected markAsConnecting() {
    this.state.set('connecting', (_) => true);
  }

  protected markAsConnected() {
    this.state.set('connecting', (_) => false);
  }
}
