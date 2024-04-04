import { Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
// import { setTimeout } from '@rx-angular/cdk/zone-less/browser';

import {
  APP_LOGGING_SERVICE,
  chainPromises,
  ILogger,
  ILoggingService,
  isEmptyArray,
  isNotNilOrBlank,
  sleep,
  StartableService,
} from '@sumaris-net/ngx-components';
import { BluetoothDevice, BluetoothReadResult, BluetoothSerial, BluetoothState } from '@e-is/capacitor-bluetooth-serial';
import { EMPTY, from, fromEventPattern, Observable } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
import { PluginListenerHandle } from '@capacitor/core';
import { RxState } from '@rx-angular/state';

export { BluetoothDevice };

export declare type BluetoothEventType = 'onRead' | 'onEnabledChanged';

export declare interface BluetoothDeviceMeta {
  model?: string;
  version?: string;
  [key: string]: any;
}

export interface BluetoothDeviceWithMeta extends BluetoothDevice {
  meta?: BluetoothDeviceMeta;
}

export declare type BluetoothDeviceCheckFn<D extends BluetoothDevice = BluetoothDevice> = (device: D) => Promise<boolean | D>;

interface BluetoothServiceState extends BluetoothState {
  connecting: boolean;
  connectedDevices: BluetoothDevice[];
}

export function removeByAddress<T extends { address: string }>(devices: T[], device: T): T[] {
  if (!device?.address) return devices; // skip
  return devices?.reduce((res, d) => (d.address !== device.address ? res.concat(d) : res), []);
}

@Injectable({ providedIn: 'root' })
export class BluetoothService extends StartableService implements OnDestroy {
  private readonly _logger: ILogger;
  private readonly _state = new RxState<BluetoothServiceState>();

  readonly enabled$ = this._state.select('enabled');
  readonly connecting$ = this._state.select('connecting');
  readonly connectedDevices$ = this._state.select('connectedDevices');

  get connectedDevices(): BluetoothDevice[] {
    return this._state.get('connectedDevices');
  }

  get enabled(): boolean {
    return this._state.get('enabled') || false;
  }

  constructor(
    private platform: Platform,
    @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
  ) {
    super(platform);
    this._state.set({ enabled: null });
    this._logger = loggingService?.getLogger('bluetooth');
  }

  protected isApp() {
    return this.platform.is('cordova');
  }

  protected async ngOnStart(opts?: any): Promise<any> {
    console.debug('[bluetooth] Starting service...');
    const enabled = await this.isEnabled();

    console.info(`[bluetooth] Init state with: {enabled: ${enabled}}`);
    this._state.set({ enabled, connectedDevices: null, connecting: false });

    // Listen enabled state
    if (this.isApp()) {
      console.debug('[bluetooth] Listening enable notifications...');

      try {
        await BluetoothSerial.startEnabledNotifications();

        this._state.connect(
          'enabled',
          this.on<BluetoothState>('onEnabledChanged').pipe(finalize(() => BluetoothSerial.stopEnabledNotifications())),
          (_, { enabled }) => {
            console.info(`[bluetooth] State changed: {enabled: ${enabled}}`);
            if (!enabled) {
              this.disconnectAll();
            }
            return enabled;
          }
        );
      } catch (err) {
        console.error(`[bluetooth] Error while trying to listen enable notifications: ${err?.message || err}`, err);
        // Continue, because Android API <= 28 can fail
      }
    }

    // Because a pause will disconnect all devices, we should reconnect on resume
    this.registerSubscription(
      this.platform.resume.subscribe(async () => {
        if (await this.isEnabled()) {
          await this.reconnectAll();
        }
      })
    );

    return Promise.resolve(undefined);
  }

  protected ngOnStop() {
    this._state.set({ enabled: null, connectedDevices: null, connecting: false });

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

  /**
   * Register to an event
   *
   * @param eventType
   */
  on<T = any>(eventType: BluetoothEventType): Observable<T> {
    let listenerHandle: PluginListenerHandle;
    return fromEventPattern(async (handler) => {
      listenerHandle = await BluetoothSerial.addListener(eventType as any, handler);
    }).pipe(
      takeUntil(this.stopSubject),
      map((data) => data as unknown as T),
      finalize(() => listenerHandle?.remove())
    );
  }

  async isEnabled(): Promise<boolean> {
    const { enabled } = await BluetoothSerial.isEnabled();
    return enabled;
  }

  async isDisabled(): Promise<boolean> {
    return !(await this.isEnabled());
  }

  async enable(): Promise<boolean> {
    let enabled = await this.isEnabled();
    if (!enabled) {
      console.debug(`[bluetooth] Enabling ...`);
      enabled = (await BluetoothSerial.enable()).enabled;
      console.debug(`[bluetooth] ${enabled ? 'Enabled' : 'Disabled'}`);
      if (enabled) this._state.set('enabled', () => enabled);
    } else {
      // Update the state to enabled, in case bluetooth has been enabled but not using this service
      this._state.set('enabled', () => enabled);
    }

    return enabled;
  }

  async disable(): Promise<boolean> {
    let enabled = await this.isEnabled();
    if (enabled) {
      console.debug(`[bluetooth] Disabling ...`);
      enabled = (await BluetoothSerial.disable()).enabled;
      console.debug(`[bluetooth] ${enabled ? 'Enabled' : 'Disabled'}`);
      if (!enabled) this._state.set('enabled', () => enabled);
    }

    return !enabled;
  }

  async scan(opts?: { autoEnabled?: boolean }): Promise<BluetoothDevice[]> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      // Try to enable bluetooth
      if (!opts || opts.autoEnabled !== false) {
        console.debug(`[bluetooth] Trying to enable, before scanning...`);
        // Enable, then loop
        return this.enable().then(() => this.scan({ autoEnabled: false }));
      }

      throw { code: BluetoothErrorCodes.BLUETOOTH_DISABLED, message: 'SHARED.BLUETOOTH.ERROR.DISABLED' };
    }

    console.debug(`[bluetooth] Scan devices...`);
    try {
      const { devices } = await BluetoothSerial.scan();

      const logMessage = `Found ${devices?.length || 0} device(s): ${(devices || []).map((d) => d.address).join(', ')}`;
      console.debug(`[bluetooth] ${logMessage}`);
      this._logger?.debug('scan', logMessage);

      return devices;
    } catch (err) {
      const logMessage = `Error while scanning: ${err?.message || err}`;
      console.debug(`[bluetooth] ${logMessage}`);
      this._logger?.error('scan', logMessage);
    }
  }

  async isConnected(device: BluetoothDevice): Promise<boolean> {
    const { connected } = await BluetoothSerial.isConnected({ address: device.address });
    return connected;
  }

  /**
   * Wait device to get really connected (isConnected() should return true)
   *
   * @param device
   * @param opts
   */
  async waitIsConnected(device: BluetoothDevice, opts?: { timeout?: number }): Promise<boolean> {
    const timeout = opts?.timeout || 1000; // 1s by default
    let connected = false;

    // Start a timeout
    let timeoutReached = false;
    setTimeout(() => (timeoutReached = !connected && true), timeout);

    do {
      connected = await this.isConnected(device);
      if (!connected) await sleep(200);
    } while (!connected || timeoutReached);

    // Fail (timeout reached)
    if (timeoutReached) {
      console.error(`[bluetooth] Device {${device.address}} not connected, after ${timeout}ms`);
      return false;
    }

    return true;
  }

  async connect(device: BluetoothDevice, opts?: { markAsConnecting?: boolean }): Promise<boolean> {
    const connected = await this.isConnected(device);
    if (connected) {
      console.debug(`[bluetooth] Connecting to {${device.address}}: skipped (already connected)`);

      this.registerDevice(device);
      return true;
    } else {
      if (!opts || opts.markAsConnecting !== false) {
        this.markAsConnecting();
      }

      try {
        console.info(`[bluetooth] Connecting to {${device.address}}...`);
        await BluetoothSerial.connect({ address: device.address });
        console.info(`[bluetooth] Connecting to {${device.address}} [OK]`);

        this.registerDevice(device);
        return true;
      } catch (err) {
        console.debug(`[bluetooth] Failed to connect to {${device.address}}`, err);
        return false;
      } finally {
        if (!opts || opts.markAsConnecting !== false) {
          this.markAsNotConnecting();
        }
      }
    }
  }

  async connectIfNeed(device: BluetoothDevice, opts?: { timeout?: number; emitEvent?: boolean }): Promise<boolean> {
    let connected = await this.isConnected(device);

    if (!connected) {
      this.markAsConnecting();

      try {
        connected = await this.connect(device, { markAsConnecting: false });

        // Wait device is really connected (will wait isConnected() to return true)
        if (connected && opts?.timeout) {
          connected = await this.waitIsConnected(device, opts);
        }

        // Update connected state
        if (!opts || opts.emitEvent !== false) {
          if (connected) this.registerDevice(device);
          else this.unregisterDevice(device);
        }
      } finally {
        this.markAsNotConnecting();
      }
    }

    return connected;
  }

  async disconnect(device: BluetoothDevice, opts?: { emitEvent?: boolean }) {
    try {
      const connected = await this.isConnected(device);
      if (connected) {
        console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
        await BluetoothSerial.disconnect({ address: device.address });
      }
    } finally {
      if (!opts || opts.emitEvent !== false) {
        this.unregisterDevice(device);
      }
    }
  }

  watch(device: BluetoothDevice, options: { delimiter: string }): Observable<string> {
    let listenerHandle;
    let wasConnected: boolean;

    console.info(`[bluetooth] Start watching values from device '${device.address}'...`);

    return from(this.isConnected(device)).pipe(
      mergeMap(async (connected) => {
        console.info(`[bluetooth] Will start watch device '${device.address}' (${connected ? 'Connected' : 'Disconnected'})...`);
        wasConnected = connected;
        // Connect (if need)
        if (connected) return true;

        return this.connect(device);
      }),
      // Filter if connection succeed
      filter((connected) => connected === true),
      // Start to listen notification
      mergeMap(() => from(BluetoothSerial.startNotifications({ address: device.address, delimiter: options.delimiter }))),
      catchError((err) => {
        console.error(`[bluetooth] Error while connecting a bluetooth device: ${err?.message || ''}, before watching it`, err);
        return EMPTY;
      }),
      switchMap(() =>
        fromEventPattern<BluetoothReadResult>(async (handler) => {
          listenerHandle = await BluetoothSerial.addListener('onRead', handler);
        })
      ),
      map((res: BluetoothReadResult) => {
        const value = res?.value;
        console.debug(`[bluetooth] Read a value: ${value}`);
        return value;
      }),
      filter(isNotNilOrBlank),
      finalize(async () => {
        console.debug(`[bluetooth] Stop watching values from {${device.address}}`);
        listenerHandle?.remove();
        await BluetoothSerial.stopNotifications({ address: device.address });

        // Disconnect (if connect() was call here)
        if (!wasConnected) {
          console.debug(`[bluetooth] Disconnecting device {${device.address}}, after watch end`);
          await this.disconnect(device);
        }
      })
    );
  }

  async disconnectAll() {
    const devices = this.connectedDevices;
    if (isEmptyArray(devices)) return; // Skip

    console.debug(`[bluetooth] Disconnecting ${devices.length} devices...`);
    await chainPromises(
      devices.map(
        (d) => () =>
          this.disconnect(d).catch((err) => {
            /* continue */
          })
      )
    );
  }

  async reconnectAll() {
    const devices = this.connectedDevices;
    if (isEmptyArray(devices)) return; // Skip

    try {
      this.markAsConnecting();

      // Reconnect one by one
      await chainPromises(
        devices.map((d) => async () => {
          const connected = await this.connect(d, { markAsConnecting: false }).catch(() => false);
          // Forget the device, if reconnection failed
          if (!connected) this.unregisterDevice(d);
        })
      );
    } finally {
      this.markAsNotConnecting();
    }
  }

  async disconnectIfNeed(device: BluetoothDevice, opts?: { emitEvent?: boolean }) {
    try {
      const connected = await this.isConnected(device);
      if (connected) {
        console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
        await BluetoothSerial.disconnect({ address: device.address });
      }
    } finally {
      if (!opts || opts.emitEvent !== false) {
        this.unregisterDevice(device);
      }
    }
  }

  /* -- internal functions -- */

  private registerDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    // Add to list, if not exists yet
    this._state.set('connectedDevices', (s) => {
      const index = (s.connectedDevices || []).findIndex((d) => d.address === device.address);
      // Already exists: update
      if (index !== -1) {
        console.debug(`[bluetooth] Updating connected device {${device.address}}`);
        const connectedDevices = s.connectedDevices.slice(); // Create a copy
        connectedDevices[index] = device;
        return connectedDevices;
      }

      // Add to list
      console.debug(`[bluetooth] Register new connected device {${device.address}}`);
      return (s.connectedDevices || []).concat(device);
    });
  }

  private unregisterDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    this._state.set('connectedDevices', (s) => removeByAddress(s.connectedDevices, device));
  }

  private markAsConnecting() {
    this._state.set('connecting', () => true);
  }
  private markAsNotConnecting() {
    this._state.set('connecting', () => false);
  }
}
