import { Inject, Injectable, Injector, OnDestroy, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothDevice, BluetoothDeviceWithMeta, BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { GwaleenIchthyometer } from '@app/shared/ichthyometer/gwaleen/ichthyometer.gwaleen';
import { EMPTY, from, merge, Observable, Subject } from 'rxjs';
import {
  APP_LOGGING_SERVICE,
  AudioProvider,
  chainPromises,
  ILogger,
  ILoggingService,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  LoadResult,
  LocalSettingsService,
  removeDuplicatesFromArray,
  StartableService,
  suggestFromArray,
  SuggestService,
} from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, finalize, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';
import { LengthUnitSymbol } from '@app/referential/services/model/model.enum';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { Platform } from '@ionic/angular';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';

export declare type IchthyometerType = 'gwaleen';

export interface IchthyometerDevice extends BluetoothDevice {
  name: string;
  address: string;
  meta?: {
    type?: IchthyometerType;
    [key: string]: any;
  };
}
export interface Ichthyometer extends IchthyometerDevice, OnDestroy {
  ping: () => Promise<boolean | BluetoothDeviceWithMeta>;
  watchLength: () => Observable<{ value: number; unit: LengthUnitSymbol }>;
  isEnabled: () => Promise<boolean>;
  enabled$: Observable<boolean>;
  connected$: Observable<boolean>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
}

export interface IchthyometerServiceState {
  ichthyometers: Ichthyometer[];
  knownDevices: IchthyometerDevice[];
}

@Injectable({ providedIn: 'root' })
export class IchthyometerService extends StartableService implements OnDestroy, SuggestService<IchthyometerDevice, any> {
  static DEFAULT_TYPE: IchthyometerType = GwaleenIchthyometer.TYPE;

  private readonly _logger: ILogger;
  private readonly _cache = new Map<string, Ichthyometer>();
  private readonly _state = new RxState<IchthyometerServiceState>();
  private _restoring = false;

  readonly enabled$ = this.bluetoothService.enabled$;
  readonly ichthyometers$ = this._state.select('ichthyometers');

  get ichthyometers() {
    return this._state.get('ichthyometers');
  }

  get knownDevices() {
    return this._state.get('knownDevices');
  }

  set knownDevices(value: IchthyometerDevice[]) {
    this._state.set('knownDevices', () => value);
  }

  constructor(
    private injector: Injector,
    private platform: Platform,
    private settings: LocalSettingsService,
    private bluetoothService: BluetoothService,
    private audioProvider: AudioProvider,
    @Optional() @Inject(APP_LOGGING_SERVICE) loggingService?: ILoggingService
  ) {
    super(bluetoothService);

    if (this.isApp()) {
      this._logger = loggingService?.getLogger('ichthyometer');
      this.registerSettingsOptions();
    }
  }

  protected async ngOnStart(opts?: any): Promise<any> {
    if (!this.isApp()) throw new Error('Ichthyometer service cannot start: no web implementation');

    console.info('[ichthyometer] Starting...');
    this._logger?.debug('Starting...');

    // Make sure audio is on normal mode (and not silent mode)
    await this.checkAudioMode();

    let canAutoStop = false;
    this.registerSubscription(
      this.bluetoothService.connectedDevices$.pipe(mergeMap((devices) => this.getAll(devices))).subscribe((ichthyometers) => {
        // DEBUG
        //console.debug('[ichthyometer] Updated ichthyometers: ' + ichthyometers.map(d => d?.address).join(','));

        this._state.set('ichthyometers', () => ichthyometers);
        if (isNotEmptyArray(ichthyometers)) {
          canAutoStop = true;
        } else if (canAutoStop) {
          console.debug('[ichthyometer] Not more ichthyometers: will stop...');
          this.stop();
        }
      })
    );

    this.registerSubscription(
      this.ichthyometers$
        .pipe(
          filter(() => !this._restoring),
          debounceTime(1000),
          filter(isNotEmptyArray) // Skip if no more devices (.g. auto disconnected)
        )
        // Save into settings
        .subscribe((devices) => this.saveToSettings(devices))
    );

    await this.restoreFromSettings();
  }

  protected ngOnStop(): Promise<void> | void {
    console.debug('[ichthyometer] Stopping...');
    this._logger?.debug('Stopping...');

    // Reset state
    this._state.set({ ichthyometers: null, knownDevices: null });

    return super.ngOnStop();
  }

  ngOnDestroy() {
    console.debug('[ichthyometer] Destroying...');
    this.disconnectAll();
    this._state.ngOnDestroy();
  }

  async isEnabled() {
    return this.bluetoothService.isEnabled();
  }

  isConnected() {
    return isNotEmptyArray(this.ichthyometers);
  }

  async checkAudioMode() {
    try {
      await this.audioProvider.setAudioMode(AudioManagement.AudioMode.NORMAL);
    } catch (err) {
      // Continue
    }
  }

  watchLength(): Observable<{ value: number; unit: LengthUnitSymbol }> {
    // Wait service to be started (e.g. if all ichthyometer has been disconnected, then we should restart the service)
    if (!this.started) {
      return from(this.ready()).pipe(switchMap(() => this.watchLength())); // Loop
    }

    const stopSubject = new Subject<void>();
    console.info('[ichthyometer] Watching length values...');

    return this.ichthyometers$.pipe(
      // DEBUG
      //tap(ichthyometers => console.debug(`[ichthyometer] Watching length values from ${ichthyometers?.length || 0} devices`)),
      filter(isNotEmptyArray),
      switchMap((ichthyometers) =>
        merge(
          ...ichthyometers.map((ichthyometer) =>
            ichthyometer.watchLength().pipe(
              takeUntil(stopSubject),
              tap(({ value, unit }) => console.info(`[ichthyometer] Received value '${value} ${unit}' from device '${ichthyometer.address}'`)),
              catchError((err) => {
                console.error(`[ichthyometer] Error while watching length values from device '${ichthyometer.address}': ${err?.message || ''}`);
                if (err?.code === BluetoothErrorCodes.BLUETOOTH_CONNECTION_ERROR) {
                  this.bluetoothService.disconnect(ichthyometer);
                } else if (err?.code === BluetoothErrorCodes.BLUETOOTH_DISABLED) {
                  this.stop();
                }
                return EMPTY;
              })
            )
          )
        )
      ),
      finalize(() => {
        console.info('[ichthyometer] Stop watching length values...');
        stopSubject.next();
      })
    );
  }

  async disconnectAll(): Promise<void> {
    await Promise.all(
      Array.from(this._cache.values()).map((instance) =>
        instance.disconnect().catch((_) => {
          /*continue*/
        })
      )
    );
  }

  async disconnect(device: Ichthyometer): Promise<void> {
    await device.disconnect();
  }

  async getAll(devices: IchthyometerDevice[]): Promise<Ichthyometer[]> {
    if (isEmptyArray(devices)) return [];

    console.debug(`[ichthyometer] Trying to find ichthyometers, from device(s): ${JSON.stringify(devices.map((d) => d.address))}`);
    const instances = (
      await Promise.all(
        devices.map(async (device) => {
          try {
            return this.get(device);
          } catch (err) {
            console.error(`[ichthyometer] Cannot find an ichthyometer from device {${device?.address}}: ${err?.message || err}`);
            return null; // Skip
          }
        })
      )
    ).filter(isNotNil);

    console.debug(`[ichthyometer] ${instances.length} ichthyometer(s) - device(s): ${JSON.stringify(instances.map((d) => d.address))}`);

    return instances;
  }

  async get(device: IchthyometerDevice, type?: IchthyometerType, opts?: { cache?: boolean }): Promise<Ichthyometer> {
    type = device?.meta?.type || type || IchthyometerService.DEFAULT_TYPE;
    if (!device?.address) throw new Error('Missing device address');
    if (!type) throw new Error('Missing device type');

    // Check if exists from the cache
    if (!opts || opts.cache !== false) {
      const cacheKey = `${type}|${device.address}`;
      let target = this._cache.get(cacheKey);

      // Not found in cache
      if (!target) {
        target = await this.get(device, type, { cache: false });
        this._cache.set(cacheKey, target);
      }
      return target;
    }

    console.debug(`[ichthyometer] Getting ${type} ichthyometer from device {${device.address}} ...`);

    // Not found in cache: create new instance
    return this.create(device, type);
  }

  async checkAfterConnect(device: IchthyometerDevice) {
    try {
      const ichthyometer = await this.get(device);
      const result = await ichthyometer.ping();
      if (!result) console.debug('[ichthyometer] Ping failed!');
      return result;
    } catch (err) {
      console.error('[ichthyometer] Error while send ping: ' + (err?.message || err), err);
      return false; // Continue
    }
  }

  async suggest(value: any, filter: any): Promise<LoadResult<BluetoothDevice>> {
    console.info('[ichthyometer] call suggest() with value: ' + value);

    if (value && typeof value === 'object' && isNotNilOrBlank(value.address)) return { data: [value] };

    // Wait service started
    if (!this.started) await this.ready();

    // Use completion from known devices list
    return suggestFromArray(this.knownDevices || [], value, filter);
  }

  private isApp(): boolean {
    return this.platform.is('cordova');
  }

  private registerSettingsOptions() {
    const options = Object.values(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS).map((definition) => {
      // Replace the devices suggest function
      if (definition === ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES) {
        return {
          ...ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES,
          autocomplete: {
            ...ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES.autocomplete,
            suggestFn: (value, filter) => this.suggest(value, filter),
          },
        };
      }

      return definition;
    });

    this.settings.registerOptions(options);
  }

  /**
   * Create a new Ichthyometer instance, from the given type
   *
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
    throw new Error('Unknown ichthyometer type: ' + type);
  }

  protected async restoreFromSettings() {
    this._restoring = true;

    try {
      await this.settings.ready();

      console.info('[ichthyometer] Restoring ichthyometers from settings...');
      const devices = this.settings.getPropertyAsObjects(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES);

      // DEBUG
      //console.debug('[ichthyometer] Devices settings value: ' + JSON.stringify(devices));

      if (!Array.isArray(devices) || isEmptyArray(devices)) {
        console.info(`[ichthyometer] No ichthyometers found in settings`);
      } else {
        const now = Date.now();
        console.info(`[ichthyometer] Restoring ${devices.length} ichthyometers...`);
        const count = (await chainPromises(devices.map((d) => () => this.bluetoothService.connect(d).catch(() => false /*continue*/)))).filter(
          (connected) => connected
        ).length;
        console.info(`[ichthyometer] Restored ${count} ichthyometers in ${Date.now() - now}ms`);
      }
    } catch (err) {
      console.error('[ichthyometer] Error while restoring devices from settings: ' + err?.message || err, err);
    } finally {
      this._restoring = false;
    }
  }

  protected async saveToSettings(devices?: IchthyometerDevice[]) {
    if (this._restoring) return; // Skip

    const knownDevices = this.knownDevices || [];

    devices = (devices || [])
      .filter(isNotNil)
      // Serialize to JSON
      .map((device) => <IchthyometerDevice>{ name: device.name, address: device.address, meta: device.meta })
      // Append existing
      .concat(...knownDevices);

    // Remove duplicated devices (keep newer)
    devices = removeDuplicatesFromArray(devices, 'address');

    // No new device: skip (avoid to change settings)
    if (knownDevices.length === devices.length) return;

    this.knownDevices = devices;

    try {
      console.info(`[ichthyometer] Saving ${devices?.length || 0} devices into local settings`);

      // Apply settings
      if (isEmptyArray(devices)) {
        this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES, null, { immediate: true });
      } else {
        this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES, JSON.stringify(devices));
      }
    } catch (err) {
      console.error(`[ichthyometer] Failed to save devices into local settings: ${err?.message || ''}`);
      // Continue
    }
  }
}
