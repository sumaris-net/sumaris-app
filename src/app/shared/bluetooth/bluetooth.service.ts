import { Inject, Injectable, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
import { APP_LOGGING_SERVICE, ILogger, ILoggingService, isNotEmptyArray, isNotNilOrBlank, StartableService } from '@sumaris-net/ngx-components';
import { BluetoothDevice, BluetoothReadResult, BluetoothSerial, BluetoothState } from '@e-is/capacitor-bluetooth-serial';
import { BehaviorSubject, from, fromEventPattern, Observable } from 'rxjs';
import { filter, finalize, map, switchMap } from 'rxjs/operators';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
import { PluginListenerHandle } from '@capacitor/core';

export {BluetoothDevice};

export declare type BluetoothEventType = 'onRead'|'onEnabledChanged';

export declare type BluetoothDeviceCheckFn = (device: BluetoothDevice) => Promise<boolean>;

@Injectable({providedIn: 'root'})
export class BluetoothService extends StartableService {

  private readonly _logger: ILogger;
  private _knownDevices: BluetoothDevice[] = [];

  onEnabledChanged = new BehaviorSubject<boolean>(false);

  constructor(protected platform: Platform,
              @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
              ) {
    super(platform);
    this._logger = loggingService?.getLogger('bluetooth');
  }

  protected async ngOnStart(opts?: any): Promise<any> {

    const enabled = await this.isEnabled();
    if (enabled) this.onEnabledChanged.next(enabled);

    await BluetoothSerial.startEnabledNotifications();

    this.registerSubscription(
      this.on<BluetoothState>('onEnabledChanged')
      .pipe(
        finalize(() => BluetoothSerial.stopEnabledNotifications())
      )
      .subscribe(({enabled}) => {
        if (this.onEnabledChanged.value !== enabled) {
          console.info(`[bluetooth] State changed to: ${enabled ? 'Enabled' : 'Disabled'}`)
          this.onEnabledChanged.next(enabled);
        }
      })
    );

    return Promise.resolve(undefined);
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
        this.registerDevice(device);
        console.debug(`[bluetooth] Connecting to {${device.address}} [OK]`);
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
    let wasConnected: boolean;
    let unregisterListener;
    return from(
      this.isConnected(device)
        .then(async (connected) => {
          wasConnected = connected;
          // Connect (if need)
          if (!connected) return this.connect(device);
        })
        // Start to listen notification
        .then(_ => BluetoothSerial.startNotifications({address: device.address, delimiter: options.delimiter}))
    )
      .pipe(
        switchMap(_ => fromEventPattern((handler) => {
          unregisterListener = BluetoothSerial.addListener('onRead', handler)
        })),
        map((res: BluetoothReadResult) => {
          let value = res.value;
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
    console.debug(`[bluetooth] Disconnecting ${this._knownDevices.length} devices...`);
    if (isNotEmptyArray(this._knownDevices)) {
      await Promise.all(
        this._knownDevices.map(d => {
          this.disconnect(d).catch(err => {/* continue */})
        })
      );
      this._knownDevices = []; // Clear devices list
    }
  }

  private registerDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    const index = this._knownDevices.findIndex(d => d.address === device.address);
    if (index === -1) {
      this._knownDevices.push(device);
    }
  }

  private unregisterDevice(device: BluetoothDevice) {
    if (!device.address) throw new Error('Missing device with address');
    const index = this._knownDevices.findIndex(d => d.address === device.address);
    if (index !== -1) {
      this._knownDevices.splice(index, 1);
    }
  }
}
