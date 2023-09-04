import { Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  APP_LOGGING_SERVICE,
  chainPromises,
  ILogger,
  ILoggingService,
  isEmptyArray,
  isNotNilOrBlank,
  LoadResult,
  removeDuplicatesFromArray,
  StartableService,
  suggestFromArray,
  SuggestService
} from '@sumaris-net/ngx-components';
import { BluetoothDevice, BluetoothReadResult, BluetoothSerial, BluetoothState } from '@e-is/capacitor-bluetooth-serial';
import { EMPTY, from, fromEventPattern, Observable } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
import { PluginListenerHandle } from '@capacitor/core';
import { RxState } from '@rx-angular/state';

export {BluetoothDevice};

export declare type BluetoothEventType = 'onRead'|'onEnabledChanged';

export declare interface BluetoothDeviceMeta {
  model?: string;
  version?: string;
  [key: string]: any;
}

export interface BluetoothDeviceWithMeta extends BluetoothDevice {
  meta?: BluetoothDeviceMeta;
}

export declare type BluetoothDeviceCheckFn<D extends BluetoothDevice = BluetoothDevice> = (device: D) => Promise<boolean|D>;

interface BluetoothServiceState extends BluetoothState {
  connectedDevices: BluetoothDevice[];
}

export function removeByAddress<T extends {address: string}>(devices: T[], device: T): T[] {
  if (!device?.address) return devices; // skip
  return devices?.reduce((res, d) => {
    return (d.address !== device.address) ? res.concat(d) : res;
  }, []);
}

@Injectable({providedIn: 'root'})
export class BluetoothService extends StartableService implements OnDestroy, SuggestService<BluetoothDevice, any> {

  private readonly _logger: ILogger;
  private readonly _state = new RxState<BluetoothServiceState>();

  readonly enabled$ = this._state.select('enabled');
  readonly connectedDevices$ = this._state.select('connectedDevices');

  get connectedDevices(): BluetoothDevice[] {
    return this._state.get('connectedDevices');
  }

  constructor(protected platform: Platform,
              @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
              ) {
    super(platform);
    this._state.set({connectedDevices: []});
    this._logger = loggingService?.getLogger('bluetooth');
  }

  protected async ngOnStart(opts?: any): Promise<any> {

    console.debug('[bluetooth] Starting service...');
    const enabled = await this.isEnabled();
    if (enabled) {
      console.info(`[bluetooth] Enabled changed: {enabled: ${enabled}}`)
      this._state.set('enabled', _ => enabled);
    }

    try {
    await BluetoothSerial.startEnabledNotifications();

    this._state.connect('enabled', this.on<BluetoothState>('onEnabledChanged')
      .pipe(
        finalize(() => BluetoothSerial.stopEnabledNotifications())
      ),
      (_, {enabled}) => {
        console.info(`[bluetooth] State changed: {enabled: ${enabled}}`)
        if (!enabled) {
          this.disconnectAll();
        }
        return enabled;
      });
    }
    catch(err) {
      console.error(`[bluetooth] Cannot start enable notifications: ${err?.message || err}`, err);
      // Continue, because if Android API <= 28, it can fail
    }

    // Because a pause will disconnect all devices, we should reconnect on resume
    this.registerSubscription(
      this.platform.resume.subscribe(async ()  => {
        if (await this.isEnabled()) {
          await this.reconnectAll();
        }
      })
    );

    return Promise.resolve(undefined);
  }

  protected ngOnStop() {
    this._state.set({connectedDevices: [], enabled: null});

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

  async suggest(value: any, filter: any): Promise<LoadResult<BluetoothDevice>> {
    console.info('[bluetooth] call suggest() with value: ' + value);

    if (typeof value === 'object') return {data: [value]};

    try {
      if (!this.started) await this.ready();

      const devices = await this.scan();

      return suggestFromArray(devices, value, filter);
    }
    catch (err) {
      if (err?.code === BluetoothErrorCodes.BLUETOOTH_DISABLED) {
        return {data: [], total: 0};
      }
      throw err;
    }
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
    })
      .pipe(
        takeUntil(this.stopSubject),
        map(data => data as unknown as T),
        finalize(() => listenerHandle.remove()),
      )
  }

  async isEnabled(): Promise<boolean> {
    const {enabled} = await BluetoothSerial.isEnabled();
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

  async scan(opts?: {autoEnabled?: boolean}): Promise<BluetoothDevice[]> {

    const enabled = await this.isEnabled();
    if (!enabled) {
      // Try to enable bluetooth
      if (!opts || opts.autoEnabled !== false) {
        console.debug(`[bluetooth] Trying to enable, before scanning...`);
        // Enable, then loop
        return this.enable().then(_ => this.scan({autoEnabled: false}));
      }

      throw { code: BluetoothErrorCodes.BLUETOOTH_DISABLED, message: 'SHARED.BLUETOOTH.ERROR.DISABLED'};
    }

    console.debug(`[bluetooth] Scan devices...`);
    try {
      const { devices } = await BluetoothSerial.scan();

      const logMessage = `Found ${devices?.length || 0} device(s): ${(devices || []).map(d => d.address).join(', ')}`;
      console.debug(`[bluetooth] ${logMessage}`);
      this._logger?.debug('scan', logMessage);

      return devices;
    }
    catch(err) {
      const logMessage = `Error while scanning: ${err?.message || err}`;
      console.debug(`[bluetooth] ${logMessage}`);
      this._logger?.error('scan', logMessage);
    }

  }

  async isConnected(device: BluetoothDevice): Promise<boolean> {
    const {connected} = (await BluetoothSerial.isConnected({address: device.address}));
    return connected;
  }

  /**
   * Wait device to get really connected (isConnected() should return true)
   * @param device
   * @param opts
   */
  async waitIsConnected(device: BluetoothDevice, opts?: {timeout: number}): Promise<boolean> {
    const timeout = opts?.timeout || 1000; // 1s by default
    let connected = false;

    // Start a timeout
    let timeoutReached = false;
    setTimeout(() => timeoutReached = !connected && true, timeout);

    do {
      connected = await this.isConnected(device);
    } while(!connected || timeoutReached);

    // Fail (timeout reached)
    if (timeoutReached) {
      console.error(`[bluetooth] Device {${device.address}} not connected, after ${timeout}ms`);
      return false;
    }

    return true;
  }

  async connect(device: BluetoothDevice): Promise<boolean> {
    const connected = await this.isConnected(device);
    if (connected) {
      console.debug(`[bluetooth] Connecting to {${device.address}}: skipped (already connected)`);

      this.registerDevice(device);
      return true;
    }
    else {
      try {
        console.info(`[bluetooth] Connecting to {${device.address}}...`);
        await BluetoothSerial.connect({address: device.address});
        console.info(`[bluetooth] Connecting to {${device.address}} [OK]`);

        this.registerDevice(device);
        return true;
      }
      catch(err) {
        console.debug(`[bluetooth] Failed to connect to {${device.address}}`, err);
        return false;
      }
    }
  }

  async disconnect(device: BluetoothDevice) {
    try {
      const connected = await this.isConnected(device);
      if (connected) {
        console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
        await BluetoothSerial.disconnect({address: device.address});
      }
    }
    finally {
      this.unregisterDevice(device);
    }
  }

  watch(device: BluetoothDevice, options : {delimiter: string}): Observable<string> {
    let listenerHandle;
    let wasConnected: boolean;

    console.info(`[bluetooth] Start watching values from device '${device.address}'...`);

    return from(this.isConnected(device))
      .pipe(
        mergeMap(async (connected) => {
          console.info(`[bluetooth] Will start watch device '${device.address}' (${connected ? 'Connected' : 'Disconnected'})...`);
          wasConnected = connected;
          // Connect (if need)
          if (connected) return true;

          return this.connect(device);
        }),
        // Filter if connection succeed
        filter(connected => connected === true),
        // Start to listen notification
        mergeMap(_ => from(BluetoothSerial.startNotifications({address: device.address, delimiter: options.delimiter}))),
        catchError(err => {
          console.error(`[bluetooth] Error while connecting a bluetooth device: ${err?.message||''}, before watching it`, err);
          return EMPTY;
        }),
        switchMap(_ => fromEventPattern<BluetoothReadResult>(async (handler) => {
          listenerHandle = await BluetoothSerial.addListener('onRead', handler);
        })),
        map((res: BluetoothReadResult) => {
          let value = res?.value;
          console.debug(`[bluetooth] Read a value: ${value}`);
          return value;
        }),
        filter(isNotNilOrBlank),
        finalize(async () => {
          console.debug(`[bluetooth] Stop watching values from {${device.address}}`);
          listenerHandle.remove();
          await BluetoothSerial.stopNotifications({address: device.address});

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
    await chainPromises(devices.map(d => () =>
      this.disconnect(d).catch(err => {/* continue */})
    ));
  }

  async reconnectAll() {
    const devices = this.connectedDevices;
    if (isEmptyArray(devices)) return; // Skip

    // Reconnect one by one
    await chainPromises(devices.map(d => async () => {
      const connected = await this.connect(d).catch(_ => false);
      // Forget the device, if reconnection failed
      if (!connected) this.unregisterDevice(d);
    }));
  }

  private registerDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    // Add to list, if not exists yet
    this._state.set('connectedDevices', s => {
      const index = s.connectedDevices.findIndex(d => d.address === device.address);
      // Already exists: update
      if (index !== -1) {
        console.debug(`[bluetooth] Updating connected device {${device.address}}`);
        const connectedDevices = s.connectedDevices.slice(); // Copy
        connectedDevices[index] = device;
        return connectedDevices;
      }

      // Add to list
      console.debug(`[bluetooth] Register new connected device {${device.address}}`);
      return (s.connectedDevices||[]).concat(device);
    });
  }

  private unregisterDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    this._state.set('connectedDevices', s => removeByAddress(s.connectedDevices, device));
  }
}
