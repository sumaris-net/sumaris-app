import { Directive, Inject, InjectionToken, Injector, OnDestroy } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDeviceMeta, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { Ichthyometer, IchthyometerDevice, IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.service';
import { filter, finalize, map, mergeMap } from 'rxjs/operators';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { APP_LOGGING_SERVICE, firstNotNilPromise, ILogger, isNilOrBlank, isNotNilOrBlank, StartableService, toNumber, WaitForOptions } from '@sumaris-net/ngx-components';
import { combineLatest, Observable, race, Subject, timer } from 'rxjs';
import { LengthMeterConversion, LengthUnitSymbol } from '@app/referential/services/model/model.enum';

interface GwaleenIchthyometerState {
  connected: boolean;
  enabled: boolean;
}
export const APP_ICHTYOMETER_DEVICE = new InjectionToken<IchthyometerDevice>('IchthyometerDevice');

@Directive()
export class GwaleenIchthyometer extends StartableService implements Ichthyometer, OnDestroy {

  static TYPE = <IchthyometerType>'gwaleen';

  static READ_TIMEOUT_MS = 1000; // 1s timeout
  static END_DELIMITER = "#";
  static PING_TIMEOUT_MS = 3000; // 3s timeout
  static PING_COMMAND = "a#";
  static PING_ACKNOWLEDGE = "%a:e#";
  static INFO_COMMAND = "b#";
  static INFO_TIMEOUT_MS = 4000; // 4s timeout
  static INFO_RESULT_PREFIX = "%b:";
  static VALUE_LENGTH_PREFIX = '%l,';

  protected readonly _logger: ILogger;
  protected readonly _state = new RxState<GwaleenIchthyometerState>();
  protected readonly _readSubject = new Subject<string>();
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
    @Inject(APP_ICHTYOMETER_DEVICE) device: IchthyometerDevice
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

  async connect(): Promise<boolean> {
    const connected = this.connectIfNeed({emitEvent: false});
    return connected;
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

      this.markAsConnected();

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

          // Length
          if (value?.startsWith(GwaleenIchthyometer.VALUE_LENGTH_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
            const numericalValue = value.substring(GwaleenIchthyometer.VALUE_LENGTH_PREFIX.length, value.length - 1);
            console.debug(`[gwaleen] Received numerical value '${numericalValue}' from device '${this.address}'`);
            return numericalValue;
          }

          // Any other value (e.g. ping ack)
          else if (isNotNilOrBlank(value)){
            this._readSubject.next(value);
          }
          return undefined;
        }),
        filter(isNotNilOrBlank),
        finalize(() => {
          console.info(`[gwaleen] Stop watching values from device '${this.address}'`);
        })
      );
  }

  watchLength(): Observable<{value: number; unit: LengthUnitSymbol}> {
    return this.watch()
      .pipe(
        filter(isNotNilOrBlank),
        map(strValue => {
          return {
            value: parseFloat(strValue),
            unit: 'mm'
          }
        })
      );
  }

  private async doPing(): Promise<boolean> {

    const now = Date.now();
    console.debug(`[gwaleen] Sending ping to {${this.device.address}}...`);
    this._logger?.debug('ping', `Sending ping to {${this.device.address}}...`);

    try {
      await this.write(GwaleenIchthyometer.PING_COMMAND);
      const value = await this.read({timeout: GwaleenIchthyometer.PING_TIMEOUT_MS});
      const acknowledge = value === GwaleenIchthyometer.PING_ACKNOWLEDGE;

      if (!acknowledge) {
        console.debug(`[gwaleen] Received invalid ping result: '${value}'`);
        this._logger?.debug('ping', `Received invalid ping result: '${value}'`);
      }

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
    let connected = await this.connectIfNeed({emitEvent: false});
    if (!connected) return; // Not connected

    const now = Date.now();
    console.debug(`[gwaleen] Asking info to {${this.device.address}}...`);
    this._logger?.debug('getInfo', `Asking info to {${this.device.address}}...`);

    const result = {model: undefined, version: undefined};
    try {
      await BluetoothSerial.write({address: this.device.address, value: GwaleenIchthyometer.INFO_COMMAND})

      const value = await this.read({timeout: GwaleenIchthyometer.INFO_TIMEOUT_MS});

      if (value?.startsWith(GwaleenIchthyometer.INFO_RESULT_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
        const parts = value.substring(GwaleenIchthyometer.INFO_RESULT_PREFIX.length, value.length - 1).split(',');
        result.model = parts[0];
        result.version = parts[1];
      }

      if (result?.model) {
        console.info(`[gwaleen] Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
        this._logger?.info('getInfo', `Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
      }
      else {
        console.warn(`[gwaleen] Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
        this._logger?.warn('getInfo', `Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
      }

    }
    catch (err) {
      console.error(`[gwaleen] Failed asking info to {${this.device.address}}: ${err?.message||''}`, err);
      this._logger?.error('getInfo', `Failed asking info to {${this.device.address}}: ${err?.message||''}`);
    }

    return result;
  }

  /* -- internal functions -- */

  private async connectIfNeed(opts?: {emitEvent?: boolean}): Promise<boolean> {
    let connected = await this.bluetoothService.isConnected(this.device);

    if (!connected) {
      connected = await this.bluetoothService.connect(this.device);
      if (!connected) return false;

      // Wait device is really connected (isConnected() should return true)
      connected = await this.bluetoothService.waitIsConnected(this.device);
    }

    // Update connected state
    if (!opts || opts.emitEvent !== false) {
      this.markAsConnected();
    }

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

  protected write(value: string): Promise<void> {
    return BluetoothSerial.write({address: this.device.address, value});
  }

  protected read(opts?: WaitForOptions): Promise<string> {
    return firstNotNilPromise(
      race([
        timer(0, 200)
          .pipe(
            mergeMap(() => BluetoothSerial.readUntil({ address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER })),
            map(({ value }) => value),
            filter(isNotNilOrBlank)
          ),
      this._readSubject.pipe(filter(isNotNilOrBlank))
    ]), {
        timeout: opts?.timeout || GwaleenIchthyometer.READ_TIMEOUT_MS,
        stop: this.stopSubject
      });
  }

  protected markAsConnected() {
    this._state.set('connected', _ => true);
  }
}
