import { Inject, Injectable, Injector, OnDestroy, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { IchthyometerType } from '@app/shared/ichthyometer/ichthyometer.icon';
import { GwaleenIchthyometer } from '@app/shared/ichthyometer/ichthyometer.gwaleen';
import { EMPTY, from, merge, Observable, of, Subject, Subscription } from 'rxjs';
import { APP_LOGGING_SERVICE, ILogger, ILoggingService, isEmptyArray, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, sleep, StartableService } from '@sumaris-net/ngx-components';
import { mergeMap, switchMap } from 'rxjs/operators';
import { catchError, debounceTime, filter, finalize, map, takeUntil, tap } from 'rxjs/operators';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';

export interface IchthyometerDevice extends BluetoothDevice {
  name: string;
  address: string;
  meta?: {
    type?: IchthyometerType;
    [key: string]: any;
  }
}
export interface Ichthyometer extends IchthyometerDevice {

  ping: () => Promise<boolean|BluetoothDeviceWithMeta>;
  watch: () => Observable<string>;
  isEnabled: () => Promise<boolean>;
  enabled$: Observable<boolean>;
  connected$: Observable<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
}

export interface IchthyometerServiceState {
  enabled: boolean;
  connectedDevices: Ichthyometer[];
}

@Injectable({providedIn: 'root'})
export class IchthyometerService extends StartableService implements OnDestroy {

  private readonly _logger: ILogger;
  private readonly _ichthyometers = new Map<string, Ichthyometer>();
  private readonly _ichthyometerSubscriptions = new Map<string, Subscription>();
  private readonly _state = new RxState<IchthyometerServiceState>();

  readonly enabled$ = this._state.select('enabled');
  readonly connectedDevices$ = this._state.select('connectedDevices');

  get enabled(): boolean {
    return this._state.get('enabled');
  }

  get connectedDevices() {
    return this._state.get('connectedDevices');
  }

  constructor(private injector: Injector,
              private settings: LocalSettingsService,
              private bluetoothService: BluetoothService,
              @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService) {
    super(bluetoothService);
    this._logger = loggingService.getLogger('ichthyometer')

    // Initial state
    this._state.set({
      enabled: false
    });
  }

  protected async ngOnStart(opts?: any): Promise<any> {

    console.info('[ichthyometer] Starting...');
    const enabled = await this.bluetoothService.isEnabled();
    if (enabled) {
      this._state.set('enabled', _ => enabled);
    }

    await this.restoreFromSettings();

    this.registerSubscription(
      this.bluetoothService.connectedDevices$
        .pipe(debounceTime(500))
        .subscribe(devices => {
          console.debug('[ichthyometer] connectedDevices changed to ' + JSON.stringify(devices));
          const instances = (devices || []).map(d => this.get(d, 'gwaleen'));
          this._state.set('connectedDevices', _ => instances);
        })
      );

    this.registerSubscription(
      this.connectedDevices$
        .pipe(debounceTime(5000))
        .subscribe(devices => this.saveToSettings(devices))
      );

    return Promise.resolve(undefined);
  }

  ngOnDestroy() {
    console.debug('[ichthyometer] Destroying...');
    this._ichthyometerSubscriptions.forEach(subscription  => subscription.unsubscribe());
    this._ichthyometerSubscriptions.clear();
    this._ichthyometers.forEach(ichthyometer => ichthyometer.disconnect());
    this._state.ngOnDestroy();
  }

  async isEnabled() {
    return this._state.get('enabled');
  }

  async isConnected() {
    return isNotEmptyArray(this.connectedDevices);
  }

  watch(): Observable<string> {
    if (!this.started) this.start();

    const stopSubject = new Subject<void>();
    console.info('[ichthyometer] Start watching values...');

    return this.connectedDevices$
      .pipe(
        filter(isNotEmptyArray),
        switchMap(devices => merge(
          ...(devices.map(device => device.watch()
            .pipe(
              takeUntil(stopSubject),
              tap(value => console.info(`[ichthyometer] Received value '${value}' from device '${device.address}'`)),
              catchError(err => {
                console.error(`[ichthyometer] Error while watching values from device '${device.address}': ${err?.message||''}`);
                return EMPTY;
              })
          )))
        )),
        finalize(() => {
          console.info('[ichthyometer] Stop watching values...');
          stopSubject.next();
        })
      );
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this._ichthyometers.values())
        .map(instance => instance.disconnect())
    );
    await sleep(1000);

    await this.restart();
  }

  async disconnect(device: Ichthyometer): Promise<void> {
    await device.disconnect();
  }

  get(device: IchthyometerDevice, type?: IchthyometerType): Ichthyometer {
    console.debug('[ichthyometer] Calling get() with args: ' + JSON.stringify(arguments));
    if (!device?.address) throw new Error('Missing device address');
    type = type || device?.meta?.type;
    if (!type) throw new Error('Missing type');

    // Check if exists from the cache map
    const cacheKey = `${type}|${device.address}`;
    let target = this._ichthyometers.get(cacheKey);

    // Already exists in cache: use it
    if (target) return target;

    // Create new instance
    target = this.create(device, type);

    // Add to cache
    this._ichthyometers.set(cacheKey, target);

    // Mark as enabled
    this.markAsEnabled();

    // Add listener
    const subscription = target.enabled$.subscribe(async (enabled) => {
        if (enabled) this.markAsEnabled();
        else await this.checkIfDisabled();
      });
    this._ichthyometerSubscriptions.set(cacheKey, subscription);

    // Update state
    //this._state.set('devices', _ => Array.from(this._ichthyometers.values()));

    return target;
  }

  /**
   * Create a new Ichthyometer instance, from the given type
   * @param device
   * @param type
   * @private
   */
  private create(device: IchthyometerDevice, type: IchthyometerType): Ichthyometer {
    switch (type) {
      case 'gwaleen': {
        return new GwaleenIchthyometer(this.injector, device);
      }
    }
    throw new Error('Unknown type: ' + type);
  }

  private markAsEnabled() {
    if (!this.enabled) {
      this._state.set('enabled', _ => true);
    }
  }

  private async checkIfDisabled() {
    // Get all enabled states
    const disabled = (await Promise.all(Array.from(this._ichthyometers.values())
        .map(instance => instance.isEnabled())))
      // Make sure all are disabled
      .every(enabled => !enabled);
    if (disabled) {
      this._state.set('enabled', _ => false);
    }
  }

  protected async restoreFromSettings() {
    console.info('[ichthyometer] Restoring devices from settings ...');

    const devicesPropertyValue = this.settings.getProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.ICHTHYOMETERS);
    const devices = devicesPropertyValue && (typeof devicesPropertyValue === 'string') ? JSON.parse(devicesPropertyValue) : devicesPropertyValue;

    if (isNotEmptyArray(devices)) {
      await Promise.all(devices.map(async (device) => {
        console.info(`[ichthyometer] Restoring device '${device.address}'...`);
        try {
          const instance = this.get(device);
          if (instance) {
            const connected = await instance.connect();
            console.error(`[ichthyometer] Device '${device.address}' ${connected ? 'is connected' : 'not found'}`);
          }
        }
        catch (err) {
          console.error(`[ichthyometer] Failed to restore device '${device.address}': ${err?.message||''}`);
        }
      }));
    }
  }

  protected async saveToSettings(devices: Ichthyometer[]) {
    devices = devices || this.connectedDevices;

    const deviceList = (devices || [])
      .filter(isNotNil)
      .map(device => ({name: device.name, address: device.address, meta: {type: device.meta?.type}}));

    try {
      console.info(`[ichthyometer] Saving ${deviceList.length} devices into local settings...`);
      this._logger?.info('saveToSettings', `Saving ${deviceList.length} devices into local settings: ${JSON.stringify(deviceList)}`);

      // Apply settings
      this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.ICHTHYOMETERS, isNotEmptyArray(deviceList) ? JSON.stringify(deviceList) : null);
    } catch (err) {
      console.error(`[ichthyometer] Failed to save devices into local settings: ${err?.message||''}`);
      // Continue
    }
  }
}
