import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { BluetoothDevice, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { RxState } from '@rx-angular/state';
import { Subscription } from 'rxjs';
import { Platform } from '@ionic/angular';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';

interface IchthyometerTestingState {
  loading: boolean;
  enabled: boolean;
  devices: BluetoothDevice[];
  connectedDevice: BluetoothDevice;
  connectedIchthyometer: Ichthyometer;
  items: string[];
}

@Component({
  selector: 'app-ichthyometer-testing',
  templateUrl: './ichthyometer.testing.html',
  styleUrls: [
    './ichthyometer.testing.scss'
  ],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IchthyometerTestingPage {

  readonly $devices = this._state.select('devices');
  readonly $enabled = this._state.select('enabled');
  readonly $items = this._state.select('items');
  readonly $connectedDevice = this._state.select('connectedDevice');
  readonly $loading = this._state.select('loading');

  private _subscription: Subscription;

  get connectedDevice(): BluetoothDevice {
    return this._state.get('connectedDevice');
  }

  get isConnected(): boolean {
    return !!this.connectedDevice;
  }

  constructor(
    protected platform: Platform,
    protected bluetoothService: BluetoothService,
    protected ichthyometerService: IchthyometerService,
    private cd: ChangeDetectorRef,
    private _state: RxState<IchthyometerTestingState>
  ) {
    this._state.set({
      loading: false,
      items: [],
      connectedDevice: null
    });

    this.bluetoothService.ready().then(async () => {
      const enabled = await this.bluetoothService.isEnabled();
      this._state.set('enabled', _ => enabled);


    });
  }

  async enable() {
    const enabled = await this.bluetoothService.enable();
    this._state.set('enabled', _ => enabled);
  }

  async disable() {
    this.disconnect();

    const disabled = await this.bluetoothService.disable();
    this._state.set('enabled', _ => !disabled);
  }

  async scan() {
    try {
      this._state.set('loading', _ => true);
      this._state.set('devices', _ => []);

      const enabled = await this.bluetoothService.enable();

      if (!enabled) {
        console.debug('[ichthyometer-test] Bluetooth is disabled!');
        return;
      }

      console.debug('[ichthyometer-test] Scan devices...');
      const devices = await this.bluetoothService.scan();

      console.debug(`[ichthyometer-test] Found ${devices?.length || 0} devices...`);

      this._state.set('devices', _ => devices);
    }
    catch (err) {
      console.error('[ichthyometer-test] Error while getting bluetooth device: ' + (err?.message || '') + ' ' + JSON.stringify(err));
    }
    finally {
      this._state.set('loading', _ => false);
    }
  }

  async connect(device: BluetoothDevice) {
    this.disconnect();

    try {
      await this.bluetoothService.connect(device);
      this._state.set('connectedDevice', _ => device);

      const ichthyometer = this.ichthyometerService.get(device, 'gwaleen');
      this._state.set('connectedIchthyometer', _ => ichthyometer);

      this._subscription = ichthyometer.watch()
        .subscribe(value => {
          this._state.set('items', s => [...(s.items || []), value]);
        });

      this._subscription.add(async () => {
        await this.bluetoothService.disconnect(device);
        this._state.set('connectedDevice', _ => null);
        this._state.set('items', _ => []);
      });

      this.cd.markForCheck();
    }
    catch (err) {
      console.error(err);
    }
  }

  disconnect() {
    if (this._subscription) {
      this._subscription.unsubscribe();
      this._subscription = null;
    }
  }
}
