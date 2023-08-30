import { Inject, Injectable, Injector, OnDestroy, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { GwaleenIchthyometer } from '@app/shared/ichthyometer/gwaleen/ichthyometer.gwaleen';
import { EMPTY, merge, Observable, Subject, Subscription } from 'rxjs';
import { APP_LOGGING_SERVICE, AudioProvider, ILogger, ILoggingService, isEmptyArray, isNotEmptyArray, isNotNil, LocalSettingsService, sleep, StartableService } from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, finalize, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';
import { LengthUnitSymbol } from '@app/referential/services/model/model.enum';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import AudioMode = AudioManagement.AudioMode;


export declare type IchthyometerType = 'gwaleen';

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
  watchLength: () => Observable<{ value: number; unit: LengthUnitSymbol }>;
  isEnabled: () => Promise<boolean>;
  enabled$: Observable<boolean>;
  connected$: Observable<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
}

export interface IchthyometerServiceState {
  ichthyometers: Ichthyometer[];
}

@Injectable({providedIn: 'root'})
export class IchthyometerService extends StartableService implements OnDestroy {

  static DEFAULT_TYPE: IchthyometerType = GwaleenIchthyometer.TYPE;

  private readonly _logger: ILogger;
  private readonly _ichthyometers = new Map<string, Ichthyometer>();
  private readonly _ichthyometerSubscriptions = new Map<string, Subscription>();
  private readonly _state = new RxState<IchthyometerServiceState>();
  private _restoring = false;

  readonly enabled$ = this.bluetoothService.enabled$;
  readonly ichthyometers$ = this._state.select('ichthyometers');

  get ichthyometers() {
    return this._state.get('ichthyometers');
  }

  constructor(private injector: Injector,
              private settings: LocalSettingsService,
              private bluetoothService: BluetoothService,
              private audioProvider: AudioProvider,
              @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService) {
    super(bluetoothService);
    this._logger = loggingService.getLogger('ichthyometer')

  }

  protected async ngOnStart(opts?: any): Promise<any> {
    console.info('[ichthyometer] Starting...');

    this.registerSubscription(
      this.bluetoothService.connectedDevices$
        .pipe(
          mergeMap(devices => this.getAll(devices))
        )
        .subscribe(ichthyometers => this._state.set('ichthyometers', _ => ichthyometers))
      );

    this.registerSubscription(
      this.ichthyometers$
        .pipe(
          filter(_ => !this._restoring),
          debounceTime(1000)
        )
        .subscribe(devices => this.saveToSettings(devices))
      );

    await this.restoreFromSettings();
  }

  ngOnDestroy() {
    console.debug('[ichthyometer] Destroying...');
    this._ichthyometerSubscriptions.forEach(subscription  => subscription.unsubscribe());
    this._ichthyometerSubscriptions.clear();
    this._ichthyometers.forEach(ichthyometer => ichthyometer.disconnect());
    this._state.ngOnDestroy();
  }

  async isEnabled() {
    return this.bluetoothService.isEnabled();
  }

  async isConnected() {
    return isNotEmptyArray(this.ichthyometers);
  }

  async enableSound() {
    try {
      await this.audioProvider.setAudioMode(AudioMode.NORMAL);
    }
    catch(err) {
      /// Continue
    }
  }

  watchLength(): Observable<{value: number; unit: LengthUnitSymbol}> {

    if (!this.started) this.start();

    this.enableSound();

    const stopSubject = new Subject<void>();
    console.info('[ichthyometer] Start watching length values...');

    return this.ichthyometers$
      .pipe(
        filter(isNotEmptyArray),
        switchMap(ichthyometers => merge(
          ...(ichthyometers.map(ichthyometer => ichthyometer.watchLength()
            .pipe(
              takeUntil(stopSubject),
              tap(({value, unit}) => console.info(`[ichthyometer] Received value '${value} ${unit}' from device '${ichthyometer.address}'`)),
              catchError(err => {
                console.error(`[ichthyometer] Error while watching values from device '${ichthyometer.address}': ${err?.message||''}`);
                return EMPTY;
              })
            )))
        )),
        finalize(() => {
          console.info('[ichthyometer] Stop watching length values...');
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

  async getAll(devices: IchthyometerDevice[]): Promise<Ichthyometer[]> {
    if (isEmptyArray(devices)) return [];

    console.debug(`[ichthyometer] Getting ichthyometers from devices: ${devices.map(d => d.address).join(', ')}`);
    const instances = (await Promise.all(devices.map(async (device) => {
      try {
        return this.get(device);
      }
      catch (err) {
        console.error(`[ichthyometer] Cannot create ichthyometer from device {${device?.address}}: ${err?.message || err}`);
        return null; // Skip
      }
    })))
    .filter(isNotNil);

    console.debug(`[ichthyometer] ${instances.length} ichthyometers found: ${instances.map(d => d.address).join(', ')}`);

    return instances;
  }

  get(device: IchthyometerDevice, type?: IchthyometerType): Ichthyometer {
    type = device?.meta?.type || type || IchthyometerService.DEFAULT_TYPE;
    if (!device?.address) throw new Error('Missing device address');
    if (!type) throw new Error('Missing device type');

    console.debug(`[ichthyometer] Getting ${type} ichthyometer from device {${device.address}} ...`);

    // Check if exists from the cache map
    const cacheKey = `${type}|${device.address}`;
    let target = this._ichthyometers.get(cacheKey);

    // Not found in cache
    if (!target) {

      // Create new instance
      target = this.create(device, type);

      // Add to cache
      this._ichthyometers.set(cacheKey, target);

      // Add listener
      // const subscription = target.enabled$.subscribe(async (enabled) => {
      //     if (enabled) this.markAsEnabled();
      //     else await this.checkIfDisabled();
      //   });
      //
      // this._ichthyometerSubscriptions.set(cacheKey, subscription);
    }
    return target;
  }

  async checkAfterConnect(device: IchthyometerDevice) {
    try {
      const ichthyometer = this.get(device);
      const result = await ichthyometer.ping();
      if (!result) console.debug('[ichthyometer-icon] Ping failed!');
      return result;
    }
    catch (err) {
      console.error('[ichthyometer-icon] Error while send ping: ' + (err?.message || err), err);
      return false; // Continue
    }
  }

  /**
   * Create a new Ichthyometer instance, from the given type
   * @param device
   * @param type
   * @private
   */
  private create(device: IchthyometerDevice, type: IchthyometerType): Ichthyometer {
    switch (type) {
      case GwaleenIchthyometer.TYPE: {
        return new GwaleenIchthyometer(this.injector, device);
      }
    }
    throw new Error('Unknown type: ' + type);
  }

  protected async restoreFromSettings() {
    this._restoring = true;

    try {
      await this.settings.ready();

      console.info('[ichthyometer] Restoring ichthyometers from settings ...');
      const devicesStr = this.settings.getProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.ICHTHYOMETERS);
      console.info('[ichthyometer] Settings=' + devicesStr);
      const devices = devicesStr && (typeof devicesStr === 'string') ? JSON.parse(devicesStr) : devicesStr;

      if (isEmptyArray(devices)) {
        console.info(`[ichthyometer] No ichthyometers found in settings`);
      } else {
        const now = Date.now();
        console.info(`[ichthyometer] Restoring ${devices.length} ichthyometers...`);
        const count = (await Promise.all(devices.map(device => this.bluetoothService.connect(device)))).filter(connected => connected).length;
        console.info(`[ichthyometer] Restored ${count} ichthyometers in ${Date.now() - now}ms`);
      }
    }
    finally {
      this._restoring = false;
    }
  }

  protected async saveToSettings(ichthyometers?: Ichthyometer[]) {
    if (this._restoring) return; // Skip

    const devices = (ichthyometers || this.ichthyometers || [])
      .filter(isNotNil)
      .map(device => ({name: device.name, address: device.address, meta: device.meta}));

    try {
      const devicesStr = isNotEmptyArray(devices) ? JSON.stringify(devices) : null;
      console.info(`[ichthyometer] Saving ${devices?.length || 0} devices into local settings...`);
      this._logger?.info('saveToSettings', `Saving ${devices.length} devices into local settings: ${devicesStr}`);

      // Apply settings
      this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.ICHTHYOMETERS, devicesStr, {immediate: !!devices});
    } catch (err) {
      console.error(`[ichthyometer] Failed to save devices into local settings: ${err?.message||''}`);
      // Continue
    }
  }
}
