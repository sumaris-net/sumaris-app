import { Directive, Inject, InjectionToken, Injector, OnDestroy } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDeviceMeta, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { Ichthyometer, IchthyometerDevice, IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.service';
import { debounceTime, filter, finalize, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import {
  APP_LOGGING_SERVICE,
  firstNotNilPromise,
  ILogger,
  isNil,
  isNilOrBlank,
  isNotNilOrBlank,
  LocalSettingsService,
  StartableService,
  WaitForOptions,
} from '@sumaris-net/ngx-components';
import { combineLatest, EMPTY, from, merge, Observable, race, Subject, timer } from 'rxjs';
import { LengthUnitSymbol } from '@app/referential/services/model/model.enum';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';

interface GwaleenIchthyometerState {
  startTime: number;
  connected: boolean;
  enabled: boolean;
  usageCount: number;
}
export const APP_ICHTYOMETER_DEVICE = new InjectionToken<IchthyometerDevice>('IchthyometerDevice');

@Directive()
export class GwaleenIchthyometer extends StartableService implements Ichthyometer, OnDestroy {
  static TYPE = <IchthyometerType>'gwaleen';

  static READ_TIMEOUT_MS = 1000; // 1s timeout
  static END_DELIMITER = '#';
  static PING_TIMEOUT_MS = 3000; // 3s timeout
  static PING_COMMAND = 'a#';
  static PING_ACKNOWLEDGE = '%a:e#';
  static INFO_COMMAND = 'b#';
  static INFO_TIMEOUT_MS = 4000; // 4s timeout
  static INFO_RESULT_PREFIX = '%b:';
  static VALUE_LENGTH_PREFIX = '%l,';
  static CONNECTION_TIMEOUT_MS = 2000; // 2s timeout

  protected readonly _logger: ILogger;
  protected readonly _state = new RxState<GwaleenIchthyometerState>();
  protected readonly _readSubject = new Subject<string>();
  protected readonly bluetoothService: BluetoothService;
  protected readonly settings: LocalSettingsService;

  readonly enabled$ = this._state.select('enabled');
  readonly connected$ = this._state.select('connected');
  readonly usageCount$ = this._state.select('usageCount');
  readonly device: Partial<BluetoothDeviceWithMeta> & IchthyometerDevice;

  get id() {
    return this.device.name;
  }
  get name() {
    return this.device.name;
  }
  get class() {
    return this.device.class;
  }
  get address() {
    return this.device.address;
  }
  get uuid() {
    return this.device.uuid;
  }
  get rssi() {
    return this.device.rssi;
  }
  get meta(): BluetoothDeviceMeta {
    return this.device.meta;
  }

  get usageCount(): number {
    return this._state.get('usageCount');
  }

  get startTime(): number {
    return this._state.get('startTime');
  }

  constructor(
    private injector: Injector,
    @Inject(APP_ICHTYOMETER_DEVICE) device: IchthyometerDevice
  ) {
    super(injector.get(BluetoothService));
    this.bluetoothService = injector.get(BluetoothService);
    this.settings = injector.get(LocalSettingsService);
    if (!this.bluetoothService) throw new Error('Missing BluetoothService provider');
    if (isNilOrBlank(device?.address)) throw new Error('Missing device address');

    this.device = {
      ...device,
      meta: {
        ...device.meta,
        type: GwaleenIchthyometer.TYPE,
      },
    };

    // Connected 'enabled' property to the bluetooth's enabled state AND connected state
    this._state.connect(
      'enabled',
      combineLatest([this.bluetoothService.enabled$, this.connected$]),
      (s, [enabled, connected]) => enabled && connected
    );

    // Auto disconnect
    this._state.hold(
      merge(from(this.settings.ready()), this.settings.onChange).pipe(
        // Get auto disconnect idle time, from local settings
        map((_) => this.settings.getPropertyAsInt(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.AUTO_DISCONNECT_IDLE_TIME)),
        switchMap((autoDisconnectIdleTime) => {
          if (autoDisconnectIdleTime <= 0) return EMPTY; // Auto-disconnect has been disabled

          // Watch the usage count
          return this.usageCount$.pipe(
            // DEBUG
            tap((usageCount) => usageCount === 0 && this.started && console.debug(`[gwaleen] Start idle - Waiting ${autoDisconnectIdleTime}ms...`)),
            // Wait the idle time
            debounceTime(autoDisconnectIdleTime),
            // Then recheck usage
            filter((usageCount) => usageCount === 0 && this.started),
            map((_) => {
              const usageDuration = Date.now() - (this.startTime || 0) - autoDisconnectIdleTime;
              return { usageDuration, autoDisconnectIdleTime };
            })
          );
        })
      ),
      async ({ usageDuration, autoDisconnectIdleTime }) => {
        // DEBUG
        const logMessage = `Silently disconnecting device after ${autoDisconnectIdleTime}ms of inactivity - last usage duration: ${usageDuration}ms`;
        console.debug('[gwaleen] ' + logMessage);
        this._logger?.debug(logMessage);

        // Stop, to make sure ready() will start (and then connect)
        await this.stop();
      }
    );

    // Logger
    this._logger = injector.get(APP_LOGGING_SERVICE)?.getLogger('gwaleen');
  }

  protected async ngOnStart(opts?: any): Promise<any> {
    console.debug('[gwaleen] Starting gwaleen ...');

    await this.connect();

    this._state.set({ startTime: Date.now() });

    return Promise.resolve(undefined);
  }

  protected async ngOnStop(): Promise<void> {
    console.debug('[gwaleen] Stopping gwaleen ...');

    await this.disconnect();

    this._state.set({ enabled: null, connected: null, usageCount: null, startTime: null });

    return super.ngOnStop();
  }

  async ngOnDestroy() {
    console.debug('[bluetooth] Destroying...');

    // Will stop listeners (see use of stopSubject in the on() function)
    if (this.started) {
      await this.stop();
    }

    this._state.ngOnDestroy();
  }

  async isEnabled(): Promise<boolean> {
    return this._state.get('enabled');
  }

  async connect(): Promise<boolean> {
    const connected = this.connectIfNeed({ emitEvent: false });
    return connected;
  }

  disconnect(): Promise<void> {
    return this.disconnectIfNeed();
  }

  async ping(): Promise<boolean | BluetoothDeviceWithMeta> {
    const connected = await this.connectIfNeed();
    if (!connected) return false; // Not connected

    const acknowledge = await this.doPing();

    // Continue: get model and version
    if (acknowledge) {
      this.markAsConnected();

      const meta = await this.getModelAndVersion();

      // Update device with meta
      this.device.meta = {
        ...this.device.meta,
        ...meta,
      };

      return this.device;
    }

    return acknowledge;
  }

  watch(opts?: { checkConnection?: boolean }): Observable<string> {
    // Start if need
    if (!this.started) {
      // DEBUG
      //console.debug(`[gwaleen] Waiting to be started on device {${this.address}}...`)

      return from(this.ready()).pipe(switchMap(() => this.watch({ ...opts, checkConnection: false /*already checked*/ })));
    }

    // Make sure the device is still connected (e.g. if disconnected on the device)
    if (!opts || opts.checkConnection !== false) {
      return from(this.connectIfNeed()).pipe(
        map((connected) => {
          if (!connected) {
            console.error('[gwaleen] Failed to connect to the device');

            // Stop the ichthyometer
            this.stop();

            // Propage a connection error to observable
            throw { code: BluetoothErrorCodes.BLUETOOTH_CONNECTION_ERROR, message: 'Failed to connect to the device' };
          }
          return connected;
        }),
        switchMap(() => this.watch({ ...opts, checkConnection: false /*avoid infinite loop*/ }))
      );
    }

    this.incrementUsage();
    console.info(`[gwaleen] Watching values from device {${this.address}} (usageCount: ${this.usageCount})...`);

    return this.bluetoothService.watch(this.device, { delimiter: '#' }).pipe(
      map((value) => {
        // Length
        if (value?.startsWith(GwaleenIchthyometer.VALUE_LENGTH_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
          const numericalValue = value.substring(GwaleenIchthyometer.VALUE_LENGTH_PREFIX.length, value.length - 1);
          console.debug(`[gwaleen] Received numerical value '${numericalValue}' from device '${this.address}'`);
          return numericalValue;
        }

        // Any other value (e.g. ping ack)
        else if (isNotNilOrBlank(value)) {
          this._readSubject.next(value);
        }
        return undefined; // Will be excluded
      }),
      filter(isNotNilOrBlank),
      finalize(() => {
        this.decrementUsage();
        console.info(`[gwaleen] Stop watching values from device {${this.address}}. (usageCount: ${this.usageCount})`);
      })
    );
  }

  watchLength(): Observable<{ value: number; unit: LengthUnitSymbol }> {
    return this.watch().pipe(
      filter(isNotNilOrBlank),
      map((strValue) => ({
        value: parseFloat(strValue),
        unit: 'mm',
      }))
    );
  }

  private async doPing(): Promise<boolean> {
    const now = Date.now();
    {
      const logMessage = `Sending ping to {${this.address}}...`;
      console.debug('[gwaleen] ' + logMessage);
      this._logger?.debug('ping', logMessage);
    }

    try {
      await this.write(GwaleenIchthyometer.PING_COMMAND);
      const value = await this.read({ timeout: GwaleenIchthyometer.PING_TIMEOUT_MS });
      const acknowledge = value === GwaleenIchthyometer.PING_ACKNOWLEDGE;

      if (!acknowledge) {
        console.debug(`[gwaleen] Received invalid ping result: '${value}'`);
        this._logger?.debug('ping', `Received invalid ping result: '${value}'`);
      }

      if (!acknowledge) {
        const logMessage = `Ping failed: timeout reached after ${GwaleenIchthyometer.PING_TIMEOUT_MS}ms`;
        console.warn('[gwaleen] ' + logMessage);
        this._logger?.debug('ping', logMessage);
      } else {
        const logMessage = `Sending ping to {${this.address}} [OK] in ${Date.now() - now}ms`;
        console.info('[gwaleen] ' + logMessage);
        this._logger?.debug('ping', logMessage);
      }

      return acknowledge;
    } catch (err) {
      const logMessage = `Failed send ping to {${this.device.address}}: ${err?.message || ''}`;
      console.error('[gwaleen] ' + logMessage, err);
      this._logger?.debug('ping', logMessage);
      throw err;
    }
  }

  private async getModelAndVersion(): Promise<BluetoothDeviceMeta> {
    const connected = await this.connectIfNeed({ emitEvent: false });
    if (!connected) return; // Not connected

    const now = Date.now();
    console.debug(`[gwaleen] Asking info to {${this.device.address}}...`);
    this._logger?.debug('getInfo', `Asking info to {${this.device.address}}...`);

    const result = { model: undefined, version: undefined };
    try {
      await BluetoothSerial.write({ address: this.device.address, value: GwaleenIchthyometer.INFO_COMMAND });

      const value = await this.read({ timeout: GwaleenIchthyometer.INFO_TIMEOUT_MS });

      if (value?.startsWith(GwaleenIchthyometer.INFO_RESULT_PREFIX) && value.endsWith(GwaleenIchthyometer.END_DELIMITER)) {
        const parts = value.substring(GwaleenIchthyometer.INFO_RESULT_PREFIX.length, value.length - 1).split(',');
        result.model = parts[0];
        result.version = parts[1];
      }

      if (result?.model) {
        console.info(
          `[gwaleen] Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`
        );
        this._logger?.info(
          'getInfo',
          `Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`
        );
      } else {
        console.warn(`[gwaleen] Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
        this._logger?.warn('getInfo', `Asking info failed: timeout reached after ${GwaleenIchthyometer.INFO_TIMEOUT_MS}ms`);
      }
    } catch (err) {
      console.error(`[gwaleen] Failed asking info to {${this.device.address}}: ${err?.message || ''}`, err);
      this._logger?.error('getInfo', `Failed asking info to {${this.device.address}}: ${err?.message || ''}`);
    }

    return result;
  }

  /* -- internal functions -- */

  private async connectIfNeed(opts?: { emitEvent?: boolean }): Promise<boolean> {
    const connected = await this.bluetoothService.connectIfNeed(this.device, { ...opts, timeout: GwaleenIchthyometer.CONNECTION_TIMEOUT_MS });

    // Update connected state
    if (!opts || opts.emitEvent !== false) {
      this._state.set('connected', (_) => connected);
    }

    return connected;
  }

  private async disconnectIfNeed(opts?: { emitEvent?: boolean }): Promise<void> {
    await this.bluetoothService.disconnect(this.device, opts);

    // Update connected state
    if (!opts || opts.emitEvent !== false) {
      this._state.set('connected', (_) => false);
    }
  }

  protected write(value: string): Promise<void> {
    return BluetoothSerial.write({ address: this.device.address, value });
  }

  protected read(opts?: WaitForOptions): Promise<string> {
    return firstNotNilPromise(
      race([
        timer(0, 200).pipe(
          mergeMap(() => BluetoothSerial.readUntil({ address: this.device.address, delimiter: GwaleenIchthyometer.END_DELIMITER })),
          map(({ value }) => value),
          filter(isNotNilOrBlank)
        ),
        this._readSubject.pipe(filter(isNotNilOrBlank)),
      ]),
      {
        timeout: opts?.timeout || GwaleenIchthyometer.READ_TIMEOUT_MS,
        stop: this.stopSubject,
      }
    );
  }

  protected markAsConnected() {
    this._state.set('connected', () => true);
  }

  protected markAsDisconnected() {
    this._state.set('connected', () => false);
  }

  protected incrementUsage() {
    this._state.set('usageCount', (s) => (isNil(s.usageCount) ? 1 : s.usageCount + 1));
  }

  protected decrementUsage() {
    this._state.set('usageCount', (s) => Math.max(0, s.usageCount - 1));
  }
}
