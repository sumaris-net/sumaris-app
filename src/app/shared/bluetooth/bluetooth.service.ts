import { Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
import {
  APP_LOGGING_SERVICE,
  ILogger,
  ILoggingService,
  isNotEmptyArray,
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
    this._state.set({connectedDevices: [], enabled: false});
    this._logger = loggingService?.getLogger('bluetooth');
  }

  protected async ngOnStart(opts?: any): Promise<any> {

    const enabled = await this.isEnabled();
    this._state.set('enabled', _ => enabled);

    await BluetoothSerial.startEnabledNotifications();

    this._state.connect('enabled', this.on<BluetoothState>('onEnabledChanged')
      .pipe(
        finalize(() => BluetoothSerial.stopEnabledNotifications())
      ),
      (_, {enabled}) => {
        console.info(`[bluetooth] State changed to: ${enabled ? 'Enabled' : 'Disabled'}`)
        return enabled;
      });

    return Promise.resolve(undefined);
  }

  protected ngOnStop() {
    this._state.set({connectedDevices: [], enabled: false});

    return super.ngOnStop();
  }

  async ngOnDestroy() {
    console.debug('[bluetooth] Destroying...');
    if (this.started) {
      // Will stop listeners (see use of stopSubject in the on() function)
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
    return fromEventPattern((handler) => {
      listenerHandle = BluetoothSerial.addListener(eventType as any, handler);
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

  isDisabled(): Promise<boolean> {
    return this.isEnabled().then(enabled => !enabled);
  }

  async enable(): Promise<boolean> {
    let enabled = await this.isEnabled();
    if (!enabled) {
      console.debug(`[bluetooth] Enabling ...`);
      enabled = (await BluetoothSerial.enable()).enabled;
      console.debug(`[bluetooth] ${enabled ? 'Enabled' : 'Disabled'}`);
    }

    return enabled;
  }

  async disable(): Promise<boolean> {
    let disabled = await this.isDisabled();
    if (!disabled) {
      console.debug(`[bluetooth] Disabling ...`);
      disabled = !(await BluetoothSerial.disable()).enabled;
      console.debug(`[bluetooth] ${disabled ? 'Disabled' : 'Enabled'}`);
    }

    return disabled;
  }

  async scan(): Promise<BluetoothDevice[]> {

    const enabled = await this.isEnabled();
    if (!enabled) throw { code: BluetoothErrorCodes.BLUETOOTH_DISABLED, message: 'SHARED.BLUETOOTH.ERROR.DISABLED'};

    console.debug(`[bluetooth] Scan devices...`);
    const { devices } = await BluetoothSerial.scan();

    console.debug(`Found ${devices?.length || 0} devices:`, devices);
    this._logger?.debug('scan', `Found ${devices?.length || 0} devices: ${(devices || []).map(d => d.address).join(', ')}`);

    return devices;
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
      this.registerDevice(device);
      console.debug(`[bluetooth] Connecting to {${device.address}}. Skipped (already connected)`);
      return true;
    }
    else {
      try {
        console.debug(`[bluetooth] Connecting to {${device.address}}...`);
        await BluetoothSerial.connect({address: device.address});
        console.debug(`[bluetooth] Connecting to {${device.address}} [OK]`);
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
    const connected = await this.isConnected(device);
    if (connected) {
      console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
      await BluetoothSerial.disconnect({address: device.address});
    }
    this.unregisterDevice(device);
  }

  watch(device: BluetoothDevice, options : {delimiter: string}): Observable<string> {
    let unregisterListener;
    let wasConnected: boolean;

    console.info(`[bluetooth] Start watching values from device '${device.address}'...`);

    return from(this.isConnected(device))
      .pipe(
        mergeMap(async (connected) => {
          console.info(`[bluetooth] Will start watch device '${device.address}' (${connected ? 'Connected' : 'Disconnected'})...`);
          wasConnected = connected;
          // Connect (if need)
          if (!connected) return from(this.connect(device));
        }),
        // Start to listen notification
        mergeMap(_ => from(BluetoothSerial.startNotifications({address: device.address, delimiter: options.delimiter}))),
        catchError(err => {
          console.error(`[bluetooth] Error while connecting a bluetooth device: ${err?.message||''}, before watching it`, err);
          return EMPTY
        }),
        switchMap(_ => fromEventPattern<BluetoothReadResult>((handler) => {
          unregisterListener = BluetoothSerial.addListener('onRead', handler)
        })),
        map((res: BluetoothReadResult) => {
          let value = res?.value;
          console.debug(`[bluetooth] Read a value: ${value}`);
          return value;
        }),
        filter(isNotNilOrBlank),
        finalize(async () => {
          console.debug(`[bluetooth] Stop listening {${device.address}}`);
          unregisterListener();
          await BluetoothSerial.stopNotifications({address: device.address});
          // Disconnect (if connect() was call here)
          if (!wasConnected) await this.disconnect(device);
        })
      );
  }

  async disconnectAll() {
    const knownDevices = this.connectedDevices;
    if (isNotEmptyArray(knownDevices)) {
      console.debug(`[bluetooth] Disconnecting ${knownDevices.length} devices...`);
      await Promise.all(
        this.connectedDevices.map(d => {
          this.disconnect(d).catch(err => {/* continue */})
        })
      );
      this._state.set('connectedDevices', _ => []); // Clear devices list
    }
  }

  private registerDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    // Add to list, if not exists yet
    this._state.set('connectedDevices', s => removeDuplicatesFromArray([device, ...s.connectedDevices], 'address'));
  }

  private unregisterDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    this._state.set('connectedDevices', s => {
      const index = s.connectedDevices?.findIndex(d => d.address === device.address) || -1;
      if (index !== -1) {
        const copy = [...s.connectedDevices];
        copy.splice(index, 1);
        return copy;
      }
      return s.connectedDevices;
    });
  }
}
