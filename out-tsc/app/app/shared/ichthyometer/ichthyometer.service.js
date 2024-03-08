var IchthyometerService_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, Injector, Optional } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { GwaleenIchthyometer } from '@app/shared/ichthyometer/gwaleen/ichthyometer.gwaleen';
import { EMPTY, from, merge, Subject } from 'rxjs';
import { APP_LOGGING_SERVICE, AudioProvider, chainPromises, isEmptyArray, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, removeDuplicatesFromArray, StartableService, suggestFromArray } from '@sumaris-net/ngx-components';
import { catchError, debounceTime, filter, finalize, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';
import { AudioManagement } from '@ionic-native/audio-management/ngx';
import { Platform } from '@ionic/angular';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
let IchthyometerService = IchthyometerService_1 = class IchthyometerService extends StartableService {
    constructor(injector, platform, settings, bluetoothService, audioProvider, loggingService) {
        super(bluetoothService);
        this.injector = injector;
        this.platform = platform;
        this.settings = settings;
        this.bluetoothService = bluetoothService;
        this.audioProvider = audioProvider;
        this._cache = new Map();
        this._state = new RxState();
        this._restoring = false;
        this.enabled$ = this.bluetoothService.enabled$;
        this.ichthyometers$ = this._state.select('ichthyometers');
        if (this.isApp()) {
            this._logger = loggingService === null || loggingService === void 0 ? void 0 : loggingService.getLogger('ichthyometer');
            this.registerSettingsOptions();
        }
    }
    get ichthyometers() {
        return this._state.get('ichthyometers');
    }
    get knownDevices() {
        return this._state.get('knownDevices');
    }
    set knownDevices(value) {
        this._state.set('knownDevices', _ => value);
    }
    ngOnStart(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isApp())
                throw new Error('Ichthyometer service cannot start: no web implementation');
            console.info('[ichthyometer] Starting...');
            (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug('Starting...');
            // Make sure audio is on normal mode (and not silent mode)
            yield this.checkAudioMode();
            let canAutoStop = false;
            this.registerSubscription(this.bluetoothService.connectedDevices$
                .pipe(mergeMap(devices => this.getAll(devices)))
                .subscribe(ichthyometers => {
                // DEBUG
                //console.debug('[ichthyometer] Updated ichthyometers: ' + ichthyometers.map(d => d?.address).join(','));
                this._state.set('ichthyometers', _ => ichthyometers);
                if (isNotEmptyArray(ichthyometers)) {
                    canAutoStop = true;
                }
                else if (canAutoStop) {
                    console.debug('[ichthyometer] Not more ichthyometers: will stop...');
                    this.stop();
                }
            }));
            this.registerSubscription(this.ichthyometers$
                .pipe(filter(_ => !this._restoring), debounceTime(1000), filter(isNotEmptyArray) // Skip if no more devices (.g. auto disconnected)
            )
                // Save into settings
                .subscribe(devices => this.saveToSettings(devices)));
            yield this.restoreFromSettings();
        });
    }
    ngOnStop() {
        var _a;
        console.debug('[ichthyometer] Stopping...');
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug('Stopping...');
        // Reset state
        this._state.set({ ichthyometers: null, knownDevices: null });
        return super.ngOnStop();
    }
    ngOnDestroy() {
        console.debug('[ichthyometer] Destroying...');
        this.disconnectAll();
        this._state.ngOnDestroy();
    }
    isEnabled() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.bluetoothService.isEnabled();
        });
    }
    isConnected() {
        return isNotEmptyArray(this.ichthyometers);
    }
    checkAudioMode() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.audioProvider.setAudioMode(AudioManagement.AudioMode.NORMAL);
            }
            catch (err) {
                // Continue
            }
        });
    }
    watchLength() {
        // Wait service to be started (e.g. if all ichthyometer has been disconnected, then we should restart the service)
        if (!this.started) {
            return from(this.ready())
                .pipe(switchMap(() => this.watchLength())); // Loop
        }
        const stopSubject = new Subject();
        console.info('[ichthyometer] Watching length values...');
        return this.ichthyometers$
            .pipe(
        // DEBUG
        //tap(ichthyometers => console.debug(`[ichthyometer] Watching length values from ${ichthyometers?.length || 0} devices`)),
        filter(isNotEmptyArray), switchMap(ichthyometers => merge(...(ichthyometers.map(ichthyometer => ichthyometer.watchLength()
            .pipe(takeUntil(stopSubject), tap(({ value, unit }) => console.info(`[ichthyometer] Received value '${value} ${unit}' from device '${ichthyometer.address}'`)), catchError(err => {
            console.error(`[ichthyometer] Error while watching length values from device '${ichthyometer.address}': ${(err === null || err === void 0 ? void 0 : err.message) || ''}`);
            if ((err === null || err === void 0 ? void 0 : err.code) === BluetoothErrorCodes.BLUETOOTH_CONNECTION_ERROR) {
                this.bluetoothService.disconnect(ichthyometer);
            }
            else if ((err === null || err === void 0 ? void 0 : err.code) === BluetoothErrorCodes.BLUETOOTH_DISABLED) {
                this.stop();
            }
            return EMPTY;
        })))))), finalize(() => {
            console.info('[ichthyometer] Stop watching length values...');
            stopSubject.next();
        }));
    }
    disconnectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all(Array.from(this._cache.values())
                .map(instance => instance.disconnect()
                .catch(_ => { })));
        });
    }
    disconnect(device) {
        return __awaiter(this, void 0, void 0, function* () {
            yield device.disconnect();
        });
    }
    getAll(devices) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(devices))
                return [];
            console.debug(`[ichthyometer] Trying to find ichthyometers, from device(s): ${JSON.stringify(devices.map(d => d.address))}`);
            const instances = (yield Promise.all(devices.map((device) => __awaiter(this, void 0, void 0, function* () {
                try {
                    return this.get(device);
                }
                catch (err) {
                    console.error(`[ichthyometer] Cannot find an ichthyometer from device {${device === null || device === void 0 ? void 0 : device.address}}: ${(err === null || err === void 0 ? void 0 : err.message) || err}`);
                    return null; // Skip
                }
            }))))
                .filter(isNotNil);
            console.debug(`[ichthyometer] ${instances.length} ichthyometer(s) - device(s): ${JSON.stringify(instances.map(d => d.address))}`);
            return instances;
        });
    }
    get(device, type, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            type = ((_a = device === null || device === void 0 ? void 0 : device.meta) === null || _a === void 0 ? void 0 : _a.type) || type || IchthyometerService_1.DEFAULT_TYPE;
            if (!(device === null || device === void 0 ? void 0 : device.address))
                throw new Error('Missing device address');
            if (!type)
                throw new Error('Missing device type');
            // Check if exists from the cache
            if (!opts || opts.cache !== false) {
                const cacheKey = `${type}|${device.address}`;
                let target = this._cache.get(cacheKey);
                // Not found in cache
                if (!target) {
                    target = yield this.get(device, type, { cache: false });
                    this._cache.set(cacheKey, target);
                }
                return target;
            }
            console.debug(`[ichthyometer] Getting ${type} ichthyometer from device {${device.address}} ...`);
            // Not found in cache: create new instance
            return this.create(device, type);
        });
    }
    checkAfterConnect(device) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ichthyometer = yield this.get(device);
                const result = yield ichthyometer.ping();
                if (!result)
                    console.debug('[ichthyometer] Ping failed!');
                return result;
            }
            catch (err) {
                console.error('[ichthyometer] Error while send ping: ' + ((err === null || err === void 0 ? void 0 : err.message) || err), err);
                return false; // Continue
            }
        });
    }
    suggest(value, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('[ichthyometer] call suggest() with value: ' + value);
            if (value && typeof value === 'object' && isNotNilOrBlank(value.address))
                return { data: [value] };
            // Wait service started
            if (!this.started)
                yield this.ready();
            // Use completion from known devices list
            return suggestFromArray(this.knownDevices || [], value, filter);
        });
    }
    isApp() {
        return this.platform.is('cordova');
    }
    registerSettingsOptions() {
        const options = Object.values(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS)
            .map(definition => {
            // Replace the devices suggest function
            if (definition === ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES) {
                return Object.assign(Object.assign({}, ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES), { autocomplete: Object.assign(Object.assign({}, ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES.autocomplete), { suggestFn: (value, filter) => this.suggest(value, filter) }) });
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
    create(device, type) {
        switch (type) {
            case GwaleenIchthyometer.TYPE: {
                return new GwaleenIchthyometer(this.injector, device);
            }
        }
        throw new Error('Unknown ichthyometer type: ' + type);
    }
    restoreFromSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            this._restoring = true;
            try {
                yield this.settings.ready();
                console.info('[ichthyometer] Restoring ichthyometers from settings...');
                const devices = this.settings.getPropertyAsObjects(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES);
                // DEBUG
                //console.debug('[ichthyometer] Devices settings value: ' + JSON.stringify(devices));
                if (!Array.isArray(devices) || isEmptyArray(devices)) {
                    console.info(`[ichthyometer] No ichthyometers found in settings`);
                }
                else {
                    const now = Date.now();
                    console.info(`[ichthyometer] Restoring ${devices.length} ichthyometers...`);
                    const count = (yield chainPromises(devices.map(d => () => this.bluetoothService.connect(d)
                        .catch(_ => false /*continue*/))))
                        .filter(connected => connected)
                        .length;
                    console.info(`[ichthyometer] Restored ${count} ichthyometers in ${Date.now() - now}ms`);
                }
            }
            catch (err) {
                console.error('[ichthyometer] Error while restoring devices from settings: ' + (err === null || err === void 0 ? void 0 : err.message) || err, err);
            }
            finally {
                this._restoring = false;
            }
        });
    }
    saveToSettings(devices) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._restoring)
                return; // Skip
            const knownDevices = this.knownDevices || [];
            devices = (devices || [])
                .filter(isNotNil)
                // Serialize to JSON
                .map(device => ({ name: device.name, address: device.address, meta: device.meta }))
                // Append existing
                .concat(...knownDevices);
            // Remove duplicated devices (keep newer)
            devices = removeDuplicatesFromArray(devices, 'address');
            // No new device: skip (avoid to change settings)
            if (knownDevices.length === devices.length)
                return;
            this.knownDevices = devices;
            try {
                console.info(`[ichthyometer] Saving ${(devices === null || devices === void 0 ? void 0 : devices.length) || 0} devices into local settings`);
                // Apply settings
                if (isEmptyArray(devices)) {
                    this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES, null, { immediate: true });
                }
                else {
                    this.settings.setProperty(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.DEVICES, JSON.stringify(devices));
                }
            }
            catch (err) {
                console.error(`[ichthyometer] Failed to save devices into local settings: ${(err === null || err === void 0 ? void 0 : err.message) || ''}`);
                // Continue
            }
        });
    }
};
IchthyometerService.DEFAULT_TYPE = GwaleenIchthyometer.TYPE;
IchthyometerService = IchthyometerService_1 = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(5, Optional()),
    __param(5, Inject(APP_LOGGING_SERVICE)),
    __metadata("design:paramtypes", [Injector,
        Platform,
        LocalSettingsService,
        BluetoothService,
        AudioProvider, Object])
], IchthyometerService);
export { IchthyometerService };
//# sourceMappingURL=ichthyometer.service.js.map