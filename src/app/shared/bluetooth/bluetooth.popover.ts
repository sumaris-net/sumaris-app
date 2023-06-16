import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothDevice } from '@e-is/capacitor-bluetooth-serial';
import { BluetoothDeviceCheckFn, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { FilterFn, IconRef, isEmptyArray, isNotEmptyArray, isNotNil, removeDuplicatesFromArray, sleep } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { bluetoothClassToMatIcon } from '@app/shared/bluetooth/bluetooth.utils';
import { map } from 'rxjs/operators';


export interface BluetoothPopoverOptions {
  debug?: boolean;
  titleI18n?: string;
  selectedDevices?: BluetoothDeviceWithMeta[];
  deviceFilter?: FilterFn<BluetoothDevice>;
  selectedDevicesIcon?: IconRef;
  checkAfterConnect?: BluetoothDeviceCheckFn;
}

interface BluetoothPopoverState {
  loading: boolean;
  enabled: boolean;
  devices: BluetoothDeviceWithMeta[];
  selectedDevices: BluetoothDeviceWithMeta[];
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
  readonly selectedDevices$ = this.state.select('selectedDevices');
  readonly connecting$ = this.state.select('connecting');

  @Input() checkAfterConnect: BluetoothDeviceCheckFn;

  @Input() set devices(value: BluetoothDevice[]) {
    this.state.set('devices', _ => value);
  }

  get devices(): BluetoothDevice[] {
    return this.state.get('devices');
  }

  @Input() set selectedDevices(value: BluetoothDevice[]) {
    this.state.set('selectedDevices', _ => value);
  }

  get selectedDevices(): BluetoothDevice[] {
    return this.state.get('selectedDevices');
  }

  get enabled(): boolean {
    return this.state.get('enabled');
  }

  get disabled(): boolean {
    return !this.enabled;
  }
  get connected(): boolean {
    return !!this.selectedDevices;
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
  @Input() selectedDevicesIcon: IconRef = {icon: 'information-circle'};

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
      let selectedDevices = this.selectedDevices;
      if (isNotEmptyArray(selectedDevices)) {
        let notConnectedDevices = [];
        this.markAsConnecting();
        const connectedDevices = (await Promise.all(selectedDevices.map(d => this.connect(null, d)
          .then(connected => {
            if (connected) return d;
            notConnectedDevices.push(d)
            return null; // Will be excluded in the next filter()
          })
          .catch(err => null)
        ))).filter(isNotNil);
        this.state.set(s => ({
          selectedDevices: connectedDevices,
          devices: notConnectedDevices
        }));
        this.markAsConnected();
        this.markAsLoaded();
      }
      else {
        this.state.set('selectedDevices', _ => []);
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
    await this.disconnectAll({addToDevices: false});

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

  async connect(event: Event|undefined, device: BluetoothDeviceWithMeta, opts?: {dismiss?: boolean}): Promise<boolean> {
    if (event?.defaultPrevented) return false;
    event?.preventDefault();

    console.info(`[bluetooth-popover] New device selected: {${device.address}}`);

    let connected = false;
    try {
      // Add to selected devices
      this.state.set('selectedDevices', s => removeDuplicatesFromArray([...s.selectedDevices, device], 'address'));

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
          const deviceOrConnected = await this.checkAfterConnect(device);
          connected = !!deviceOrConnected;
          if (!connected) {
            console.warn('[bluetooth-popover] Not a valid device!');
          }
          else {
            if (typeof deviceOrConnected === 'object') {
              // Update device (with updated device received)
              this.state.set('selectedDevices', s => removeDuplicatesFromArray([deviceOrConnected, ...s.selectedDevices], 'address'));
            }
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
        this.dismiss(this.selectedDevices);
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

  async disconnectAll(opts?: {addToDevices: boolean}) {
    const selectedDevices = this.selectedDevices || [];
    await Promise.all(selectedDevices.map(device => this.service.disconnect(device)));

    if (isEmptyArray(this.devices) && opts?.addToDevices !== false) {
      this.devices = selectedDevices;
    }
  }

  async disconnect(device: BluetoothDevice, opts?: {addToDevices: boolean}) {
    if (!device) throw new Error('Missing device');
    await this.service.disconnect(device);

    this.state.set('selectedDevices', s => {
      let index = (s.selectedDevices || []).findIndex(d => d.address === device.address);
      if (index !== -1) {
        const result = s.selectedDevices.slice();
        result.splice(index, 1);
        return result;
      }
      return s.selectedDevices || [];
    });
    this.markAsConnecting();

    if (isEmptyArray(this.devices) && opts?.addToDevices !== false) {
      this.devices = [device];
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
