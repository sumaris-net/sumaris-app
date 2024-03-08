import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Inject, Injectable, Optional } from '@angular/core';
import { Platform } from '@ionic/angular';
import { APP_LOGGING_SERVICE, chainPromises, isEmptyArray, isNotNilOrBlank, sleep, StartableService, } from '@sumaris-net/ngx-components';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { EMPTY, from, fromEventPattern } from 'rxjs';
import { catchError, filter, finalize, map, mergeMap, switchMap, takeUntil } from 'rxjs/operators';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
import { RxState } from '@rx-angular/state';
export function removeByAddress(devices, device) {
    if (!(device === null || device === void 0 ? void 0 : device.address))
        return devices; // skip
    return devices === null || devices === void 0 ? void 0 : devices.reduce((res, d) => (d.address !== device.address) ? res.concat(d) : res, []);
}
let BluetoothService = class BluetoothService extends StartableService {
    constructor(platform, loggingService) {
        super(platform);
        this.platform = platform;
        this._state = new RxState();
        this.enabled$ = this._state.select('enabled');
        this.connecting$ = this._state.select('connecting');
        this.connectedDevices$ = this._state.select('connectedDevices');
        this._state.set({ enabled: null });
        this._logger = loggingService === null || loggingService === void 0 ? void 0 : loggingService.getLogger('bluetooth');
    }
    get connectedDevices() {
        return this._state.get('connectedDevices');
    }
    get enabled() {
        return this._state.get('enabled') || false;
    }
    isApp() {
        return this.platform.is('cordova');
    }
    ngOnStart(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[bluetooth] Starting service...');
            const enabled = yield this.isEnabled();
            console.info(`[bluetooth] Init state with: {enabled: ${enabled}}`);
            this._state.set({ enabled, connectedDevices: null, connecting: false });
            // Listen enabled state
            if (this.isApp()) {
                console.debug('[bluetooth] Listening enable notifications...');
                try {
                    yield BluetoothSerial.startEnabledNotifications();
                    this._state.connect('enabled', this.on('onEnabledChanged')
                        .pipe(finalize(() => BluetoothSerial.stopEnabledNotifications())), (_, { enabled }) => {
                        console.info(`[bluetooth] State changed: {enabled: ${enabled}}`);
                        if (!enabled) {
                            this.disconnectAll();
                        }
                        return enabled;
                    });
                }
                catch (err) {
                    console.error(`[bluetooth] Error while trying to listen enable notifications: ${(err === null || err === void 0 ? void 0 : err.message) || err}`, err);
                    // Continue, because Android API <= 28 can fail
                }
            }
            // Because a pause will disconnect all devices, we should reconnect on resume
            this.registerSubscription(this.platform.resume.subscribe(() => __awaiter(this, void 0, void 0, function* () {
                if (yield this.isEnabled()) {
                    yield this.reconnectAll();
                }
            })));
            return Promise.resolve(undefined);
        });
    }
    ngOnStop() {
        this._state.set({ enabled: null, connectedDevices: null, connecting: false });
        return super.ngOnStop();
    }
    ngOnDestroy() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[bluetooth] Destroying...');
            // Will stop listeners (see use of stopSubject in the on() function)
            if (this.started) {
                yield this.stop();
            }
            this._state.ngOnDestroy();
        });
    }
    /**
     * Register to an event
     *
     * @param eventType
     */
    on(eventType) {
        let listenerHandle;
        return fromEventPattern((handler) => __awaiter(this, void 0, void 0, function* () {
            listenerHandle = yield BluetoothSerial.addListener(eventType, handler);
        }))
            .pipe(takeUntil(this.stopSubject), map(data => data), finalize(() => listenerHandle === null || listenerHandle === void 0 ? void 0 : listenerHandle.remove()));
    }
    isEnabled() {
        return __awaiter(this, void 0, void 0, function* () {
            const { enabled } = yield BluetoothSerial.isEnabled();
            return enabled;
        });
    }
    isDisabled() {
        return __awaiter(this, void 0, void 0, function* () {
            return !(yield this.isEnabled());
        });
    }
    enable() {
        return __awaiter(this, void 0, void 0, function* () {
            let enabled = yield this.isEnabled();
            if (!enabled) {
                console.debug(`[bluetooth] Enabling ...`);
                enabled = (yield BluetoothSerial.enable()).enabled;
                console.debug(`[bluetooth] ${enabled ? 'Enabled' : 'Disabled'}`);
                if (enabled)
                    this._state.set('enabled', () => enabled);
            }
            else {
                // Update the state to enabled, in case bluetooth has been enabled but not using this service
                this._state.set('enabled', () => enabled);
            }
            return enabled;
        });
    }
    disable() {
        return __awaiter(this, void 0, void 0, function* () {
            let enabled = yield this.isEnabled();
            if (enabled) {
                console.debug(`[bluetooth] Disabling ...`);
                enabled = (yield BluetoothSerial.disable()).enabled;
                console.debug(`[bluetooth] ${enabled ? 'Enabled' : 'Disabled'}`);
                if (!enabled)
                    this._state.set('enabled', () => enabled);
            }
            return !enabled;
        });
    }
    scan(opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const enabled = yield this.isEnabled();
            if (!enabled) {
                // Try to enable bluetooth
                if (!opts || opts.autoEnabled !== false) {
                    console.debug(`[bluetooth] Trying to enable, before scanning...`);
                    // Enable, then loop
                    return this.enable()
                        .then(_ => this.scan({ autoEnabled: false }));
                }
                throw { code: BluetoothErrorCodes.BLUETOOTH_DISABLED, message: 'SHARED.BLUETOOTH.ERROR.DISABLED' };
            }
            console.debug(`[bluetooth] Scan devices...`);
            try {
                const { devices } = yield BluetoothSerial.scan();
                const logMessage = `Found ${(devices === null || devices === void 0 ? void 0 : devices.length) || 0} device(s): ${(devices || []).map(d => d.address).join(', ')}`;
                console.debug(`[bluetooth] ${logMessage}`);
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug('scan', logMessage);
                return devices;
            }
            catch (err) {
                const logMessage = `Error while scanning: ${(err === null || err === void 0 ? void 0 : err.message) || err}`;
                console.debug(`[bluetooth] ${logMessage}`);
                (_b = this._logger) === null || _b === void 0 ? void 0 : _b.error('scan', logMessage);
            }
        });
    }
    isConnected(device) {
        return __awaiter(this, void 0, void 0, function* () {
            const { connected } = (yield BluetoothSerial.isConnected({ address: device.address }));
            return connected;
        });
    }
    /**
     * Wait device to get really connected (isConnected() should return true)
     *
     * @param device
     * @param opts
     */
    waitIsConnected(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeout = (opts === null || opts === void 0 ? void 0 : opts.timeout) || 1000; // 1s by default
            let connected = false;
            // Start a timeout
            let timeoutReached = false;
            setTimeout(() => timeoutReached = !connected && true, timeout);
            do {
                connected = yield this.isConnected(device);
                if (!connected)
                    yield sleep(200);
            } while (!connected || timeoutReached);
            // Fail (timeout reached)
            if (timeoutReached) {
                console.error(`[bluetooth] Device {${device.address}} not connected, after ${timeout}ms`);
                return false;
            }
            return true;
        });
    }
    connect(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const connected = yield this.isConnected(device);
            if (connected) {
                console.debug(`[bluetooth] Connecting to {${device.address}}: skipped (already connected)`);
                this.registerDevice(device);
                return true;
            }
            else {
                if (!opts || opts.markAsConnecting !== false) {
                    this.markAsConnecting();
                }
                try {
                    console.info(`[bluetooth] Connecting to {${device.address}}...`);
                    yield BluetoothSerial.connect({ address: device.address });
                    console.info(`[bluetooth] Connecting to {${device.address}} [OK]`);
                    this.registerDevice(device);
                    return true;
                }
                catch (err) {
                    console.debug(`[bluetooth] Failed to connect to {${device.address}}`, err);
                    return false;
                }
                finally {
                    if (!opts || opts.markAsConnecting !== false) {
                        this.markAsNotConnecting();
                    }
                }
            }
        });
    }
    connectIfNeed(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let connected = yield this.isConnected(device);
            if (!connected) {
                this.markAsConnecting();
                try {
                    connected = yield this.connect(device, { markAsConnecting: false });
                    // Wait device is really connected (will wait isConnected() to return true)
                    if (connected && (opts === null || opts === void 0 ? void 0 : opts.timeout)) {
                        connected = yield this.waitIsConnected(device, opts);
                    }
                    // Update connected state
                    if (!opts || opts.emitEvent !== false) {
                        if (connected)
                            this.registerDevice(device);
                        else
                            this.unregisterDevice(device);
                    }
                }
                finally {
                    this.markAsNotConnecting();
                }
            }
            return connected;
        });
    }
    disconnect(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connected = yield this.isConnected(device);
                if (connected) {
                    console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
                    yield BluetoothSerial.disconnect({ address: device.address });
                }
            }
            finally {
                if (!opts || opts.emitEvent !== false) {
                    this.unregisterDevice(device);
                }
            }
        });
    }
    watch(device, options) {
        let listenerHandle;
        let wasConnected;
        console.info(`[bluetooth] Start watching values from device '${device.address}'...`);
        return from(this.isConnected(device))
            .pipe(mergeMap((connected) => __awaiter(this, void 0, void 0, function* () {
            console.info(`[bluetooth] Will start watch device '${device.address}' (${connected ? 'Connected' : 'Disconnected'})...`);
            wasConnected = connected;
            // Connect (if need)
            if (connected)
                return true;
            return this.connect(device);
        })), 
        // Filter if connection succeed
        filter(connected => connected === true), 
        // Start to listen notification
        mergeMap(_ => from(BluetoothSerial.startNotifications({ address: device.address, delimiter: options.delimiter }))), catchError(err => {
            console.error(`[bluetooth] Error while connecting a bluetooth device: ${(err === null || err === void 0 ? void 0 : err.message) || ''}, before watching it`, err);
            return EMPTY;
        }), switchMap(_ => fromEventPattern((handler) => __awaiter(this, void 0, void 0, function* () {
            listenerHandle = yield BluetoothSerial.addListener('onRead', handler);
        }))), map((res) => {
            const value = res === null || res === void 0 ? void 0 : res.value;
            console.debug(`[bluetooth] Read a value: ${value}`);
            return value;
        }), filter(isNotNilOrBlank), finalize(() => __awaiter(this, void 0, void 0, function* () {
            console.debug(`[bluetooth] Stop watching values from {${device.address}}`);
            listenerHandle === null || listenerHandle === void 0 ? void 0 : listenerHandle.remove();
            yield BluetoothSerial.stopNotifications({ address: device.address });
            // Disconnect (if connect() was call here)
            if (!wasConnected) {
                console.debug(`[bluetooth] Disconnecting device {${device.address}}, after watch end`);
                yield this.disconnect(device);
            }
        })));
    }
    disconnectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.connectedDevices;
            if (isEmptyArray(devices))
                return; // Skip
            console.debug(`[bluetooth] Disconnecting ${devices.length} devices...`);
            yield chainPromises(devices.map(d => () => this.disconnect(d).catch(err => { })));
        });
    }
    reconnectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const devices = this.connectedDevices;
            if (isEmptyArray(devices))
                return; // Skip
            try {
                this.markAsConnecting();
                // Reconnect one by one
                yield chainPromises(devices.map(d => () => __awaiter(this, void 0, void 0, function* () {
                    const connected = yield this.connect(d, { markAsConnecting: false }).catch(_ => false);
                    // Forget the device, if reconnection failed
                    if (!connected)
                        this.unregisterDevice(d);
                })));
            }
            finally {
                this.markAsNotConnecting();
            }
        });
    }
    disconnectIfNeed(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const connected = yield this.isConnected(device);
                if (connected) {
                    console.debug(`[bluetooth] Disconnecting to {${device.address}}...`, device);
                    yield BluetoothSerial.disconnect({ address: device.address });
                }
            }
            finally {
                if (!opts || opts.emitEvent !== false) {
                    this.unregisterDevice(device);
                }
            }
        });
    }
    /* -- internal functions -- */
    registerDevice(device) {
        if (!device.address)
            throw new Error('Missing device with address');
        // Add to list, if not exists yet
        this._state.set('connectedDevices', s => {
            const index = (s.connectedDevices || []).findIndex(d => d.address === device.address);
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
    unregisterDevice(device) {
        if (!device.address)
            throw new Error('Missing device with address');
        this._state.set('connectedDevices', s => removeByAddress(s.connectedDevices, device));
    }
    markAsConnecting() {
        this._state.set('connecting', () => true);
    }
    markAsNotConnecting() {
        this._state.set('connecting', () => false);
    }
};
BluetoothService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(1, Optional()),
    __param(1, Inject(APP_LOGGING_SERVICE)),
    __metadata("design:paramtypes", [Platform, Object])
], BluetoothService);
export { BluetoothService };
//# sourceMappingURL=bluetooth.service.js.map