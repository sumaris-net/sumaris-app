import { Injectable, Injector, OnDestroy } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDeviceMeta, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.icon';
import { filter, finalize, map } from 'rxjs/operators';
import { Ichthyometer, IchthyometerDevice } from '@app/shared/ichthyometer/ichthyometer.service';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { APP_LOGGING_SERVICE, ILogger, isNilOrBlank, isNotNilOrBlank, sleep, StartableService } from '@sumaris-net/ngx-components';
import { combineLatest, Observable } from 'rxjs';

interface GwaleenIchthyometerState {
  connected: boolean;
  enabled: boolean;
}

@Injectable()
export class GwaleenIchthyometer extends StartableService implements Ichthyometer, OnDestroy {

  static END_DELIMITER = "#";
  static PING_TIMEOUT_MS = 3000; // 3s timeout
  static PING_COMMAND = "a#";
  static PING_ACKNOWLEDGE = "%a:e#";
  static INFO_COMMAND = "b#";
  static INFO_TIMEOUT_MS = 3000; // 3s timeout
  static INFO_RESULT_PREFIX = "%b:";
  static VALUE_LENGTH_PREFIX = '%l,';

  protected readonly _logger: ILogger;
  protected readonly _state = new RxState<GwaleenIchthyometerState>();
  protected readonly bluetoothService: BluetoothService;

  readonly enabled$ = this._state.select('enabled')
  readonly connected$ = this._state.select('connected');
  readonly device: Partial<BluetoothDeviceWithMeta> & IchthyometerDevice;

  static readonly type: IchthyometerType = 'gwaleen';

  get id() {
    return this.device.name
  }
  get name() {
    return this.device.name
  }
  get class() {
    return this.device.class
  }
  get address() {
    return this.device.address
  }
  get uuid() {
    return this.device.uuid
  }
  get rssi() {
    return this.device.rssi
  }
  get meta(): BluetoothDeviceMeta {
    return this.device.meta;
  }

  constructor(
    private injector: Injector,
    device: IchthyometerDevice
  ) {
    super(injector.get(BluetoothService));
    this.bluetoothService = injector.get(BluetoothService);
    if (!this.bluetoothService) throw new Error('Missing BluetoothService provider');
    if (isNilOrBlank(device?.address)) throw new Error('Missing device address');

    this.device = {
      ...device,
      meta: {
        ...device.meta,
        type: GwaleenIchthyometer.type
      }
    };

    // Connected 'enabled' property to the bluetooth's enabled state AND connected state
    this._state.connect('enabled',  combineLatest([this.bluetoothService.enabled$, this.connected$]),
      (s, [enabled, connected]) => enabled && connected);

    // Logger
    this._logger = injector.get(APP_LOGGING_SERVICE)?.getLogger('gwaleen');
  }

  protected ngOnStart(opts?: any): Promise<any> {
    return Promise.resolve(undefined);
  }

  ngOnDestroy() {
    this.disconnectIfNeed();
    this._state.ngOnDestroy();
  }

  async isEnabled(): Promise<boolean> {
    return this._state.get('enabled');
  }

  connect(): Promise<boolean> {
    return this.connectIfNeed();
  }

  disconnect(): Promise<void> {
    return this.disconnectIfNeed();
  }

  async ping(): Promise<boolean|BluetoothDeviceWithMeta> {
    let connected = await this.connectIfNeed();
    if (!connected) return false; // Not connected

    const acknowledge = await this.doPing();

    // Continue: get model and version
    if (acknowledge) {
      const meta = await this.getModelAndVersion();

      // Update device with meta
      this.device.meta = {
        ...this.device.meta,
        ...meta
      };

      return this.device
    }

    return acknowledge;
  }

  watch(): Observable<string> {

    console.info(`[gwaleen] Start watching values from device '${this.address}'...`);

    return this.bluetoothService.watch(this.device, {delimiter: '#'})
      .pipe(
        map((value) => {

          // Length value
          if (value && value.startsWith(GwaleenIchthyometer.VALUE_LENGTH_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
            const numericalValue = value.substring(GwaleenIchthyometer.VALUE_LENGTH_PREFIX.length, value.length - 1);
            console.debug(`[gwaleen] Received value '${numericalValue}' from device '${this.address}'`);
            return numericalValue;
          }

          console.debug(`[gwaleen] Received unknown value '${value}'. Skip`);
          return undefined;
        }),
        filter(isNotNilOrBlank),
        finalize(() => {
          console.info(`[gwaleen] Stop watching values from device '${this.address}'`);
        })
      );
  }

  private async doPing(): Promise<boolean> {

    const now = Date.now();
    console.debug(`[gwaleen] Sending ping to {${this.device.address}}...`);
    this._logger?.debug('ping', `Sending ping to {${this.device.address}}...`);

    try {
      await BluetoothSerial.write({ address: this.device.address, value: GwaleenIchthyometer.PING_COMMAND })
      let acknowledge = false;

      // Define a timeout variable
      let timeout = false;
      setTimeout(() => timeout = !acknowledge,
        GwaleenIchthyometer.PING_TIMEOUT_MS
      );

      do {
        const { value } = await BluetoothSerial.readUntil({ address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER });
        acknowledge = value === GwaleenIchthyometer.PING_ACKNOWLEDGE;
        if (!acknowledge) {
          if (isNotNilOrBlank(value)) {
            console.debug(`[gwaleen] Received invalid ping result: '${value}'`);
            this._logger?.debug('ping', `Received invalid ping result: '${value}'`);
          }
          await sleep(200); // Wait 100ms before retry
        }
      } while (!acknowledge && !timeout);

      if (!acknowledge) {
        console.warn(`[gwaleen] Ping failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`);
        this._logger?.debug('ping', `Ping failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`);
      } else {
        console.info(`[gwaleen] Sending ping to {${this.device.address}} [OK] in ${Date.now() - now}ms`);
        this._logger?.debug('ping', `Sending ping to {${this.device.address}} [OK] in ${Date.now() - now}ms`);
      }

      return acknowledge;
    } catch (err) {
      console.error(`[gwaleen] Failed send ping to {${this.device.address}}: ${err?.message||''}`, err);
      this._logger?.debug('ping', `Failed send ping to {${this.device.address}}: ${err?.message||''}`);
      throw err;
    }
  }

  private async getModelAndVersion(): Promise<BluetoothDeviceMeta> {
    let connected = await this.connectIfNeed();
    if (!connected) return; // Not connected

    const now = Date.now();
    console.debug(`[gwaleen] Asking info to {${this.device.address}}...`);
    this._logger?.debug('getInfo', `Asking info to {${this.device.address}}...`);

    try {
      await BluetoothSerial.write({address: this.device.address, value: GwaleenIchthyometer.INFO_COMMAND})
      const result = {model: undefined, version: undefined};

      // Define a timeout variable
      let timeout = false;
      setTimeout(() => timeout = true,
        GwaleenIchthyometer.INFO_TIMEOUT_MS
      );

      do {
        let {value} = await BluetoothSerial.readUntil({address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER});

        if (value?.startsWith(GwaleenIchthyometer.INFO_RESULT_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
          const parts = value.substring(GwaleenIchthyometer.INFO_RESULT_PREFIX.length, value.length - 1).split(',');
          result.model = parts[0];
          result.version = parts[1];
        }
        else {
          if (isNotNilOrBlank(value)) console.debug('[gwaleen] Received invalid info result: ' + value);
          await sleep(200);
        }
      } while (!result.model && !result.version && !timeout);

      if (result) {
        console.info(`[gwaleen] Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
        this._logger?.info('getInfo', `Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
      }
      else {
        console.warn(`[gwaleen] Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
        this._logger?.warn('getInfo', `Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
      }

      return result;
    }
    catch (err) {
      console.error(`[gwaleen] Failed asking info to {${this.device.address}}: ${err?.message||''}`, err);
      this._logger?.error('getInfo', `Failed asking info to {${this.device.address}}: ${err?.message||''}`);
      throw err;
    }
  }

  /* -- internal functions -- */

  private async connectIfNeed(): Promise<boolean> {
    let connected = await this.bluetoothService.isConnected(this.device);

    if (!connected) {
      connected = await this.bluetoothService.connect(this.device);
      if (!connected) return false;

      // Wait device is really connected (isConnected() should return true)
      connected = await this.bluetoothService.waitIsConnected(this.device);
    }

    // Update connected state
    this._state.set('connected', _ => connected);

    return connected;
  }

  private async disconnectIfNeed(): Promise<void> {
    let connected = await this.bluetoothService.isConnected(this.device);

    if (connected) {
      await this.bluetoothService.disconnect(this.device);
      connected = false;
    }

    // Update connected state
    this._state.set('connected', _ => connected);
  }
}
