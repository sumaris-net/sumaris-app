var GwaleenIchthyometer_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Directive, Inject, InjectionToken, Injector } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { debounceTime, filter, finalize, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { BluetoothSerial } from '@e-is/capacitor-bluetooth-serial';
import { APP_LOGGING_SERVICE, firstNotNilPromise, isNil, isNilOrBlank, isNotNilOrBlank, LocalSettingsService, StartableService } from '@sumaris-net/ngx-components';
import { combineLatest, EMPTY, from, merge, race, Subject, timer } from 'rxjs';
import { ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS } from '@app/shared/ichthyometer/ichthyometer.config';
import { BluetoothErrorCodes } from '@app/shared/bluetooth/bluetooth-serial.errors';
export const APP_ICHTYOMETER_DEVICE = new InjectionToken('IchthyometerDevice');
let GwaleenIchthyometer = GwaleenIchthyometer_1 = class GwaleenIchthyometer extends StartableService {
    constructor(injector, device) {
        var _a;
        super(injector.get(BluetoothService));
        this.injector = injector;
        this._state = new RxState();
        this._readSubject = new Subject();
        this.enabled$ = this._state.select('enabled');
        this.connected$ = this._state.select('connected');
        this.usageCount$ = this._state.select('usageCount');
        this.bluetoothService = injector.get(BluetoothService);
        this.settings = injector.get(LocalSettingsService);
        if (!this.bluetoothService)
            throw new Error('Missing BluetoothService provider');
        if (isNilOrBlank(device === null || device === void 0 ? void 0 : device.address))
            throw new Error('Missing device address');
        this.device = Object.assign(Object.assign({}, device), { meta: Object.assign(Object.assign({}, device.meta), { type: GwaleenIchthyometer_1.TYPE }) });
        // Connected 'enabled' property to the bluetooth's enabled state AND connected state
        this._state.connect('enabled', combineLatest([this.bluetoothService.enabled$, this.connected$]), (s, [enabled, connected]) => enabled && connected);
        // Auto disconnect
        this._state.hold(merge(from(this.settings.ready()), this.settings.onChange)
            .pipe(
        // Get auto disconnect idle time, from local settings
        map(_ => this.settings.getPropertyAsInt(ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS.AUTO_DISCONNECT_IDLE_TIME)), switchMap(autoDisconnectIdleTime => {
            if (autoDisconnectIdleTime <= 0)
                return EMPTY; // Auto-disconnect has been disabled
            // Watch the usage count
            return this.usageCount$
                .pipe(
            // DEBUG
            tap(usageCount => usageCount === 0 && this.started && console.debug(`[gwaleen] Start idle - Waiting ${autoDisconnectIdleTime}ms...`)), 
            // Wait the idle time
            debounceTime(autoDisconnectIdleTime), 
            // Then recheck usage
            filter(usageCount => usageCount === 0 && this.started), map(_ => {
                const usageDuration = Date.now() - (this.startTime || 0) - autoDisconnectIdleTime;
                return { usageDuration, autoDisconnectIdleTime };
            }));
        })), ({ usageDuration, autoDisconnectIdleTime }) => __awaiter(this, void 0, void 0, function* () {
            var _b;
            // DEBUG
            const logMessage = `Silently disconnecting device after ${autoDisconnectIdleTime}ms of inactivity - last usage duration: ${usageDuration}ms`;
            console.debug('[gwaleen] ' + logMessage);
            (_b = this._logger) === null || _b === void 0 ? void 0 : _b.debug(logMessage);
            // Stop, to make sure ready() will start (and then connect)
            yield this.stop();
        }));
        // Logger
        this._logger = (_a = injector.get(APP_LOGGING_SERVICE)) === null || _a === void 0 ? void 0 : _a.getLogger('gwaleen');
    }
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
    get meta() {
        return this.device.meta;
    }
    get usageCount() {
        return this._state.get('usageCount');
    }
    get startTime() {
        return this._state.get('startTime');
    }
    ngOnStart(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[gwaleen] Starting gwaleen ...');
            yield this.connect();
            this._state.set({ startTime: Date.now() });
            return Promise.resolve(undefined);
        });
    }
    ngOnStop() {
        const _super = Object.create(null, {
            ngOnStop: { get: () => super.ngOnStop }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[gwaleen] Stopping gwaleen ...');
            yield this.disconnect();
            this._state.set({ enabled: null, connected: null, usageCount: null, startTime: null });
            return _super.ngOnStop.call(this);
        });
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
    isEnabled() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._state.get('enabled');
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            const connected = this.connectIfNeed({ emitEvent: false });
            return connected;
        });
    }
    disconnect() {
        return this.disconnectIfNeed();
    }
    ping() {
        return __awaiter(this, void 0, void 0, function* () {
            const connected = yield this.connectIfNeed();
            if (!connected)
                return false; // Not connected
            const acknowledge = yield this.doPing();
            // Continue: get model and version
            if (acknowledge) {
                this.markAsConnected();
                const meta = yield this.getModelAndVersion();
                // Update device with meta
                this.device.meta = Object.assign(Object.assign({}, this.device.meta), meta);
                return this.device;
            }
            return acknowledge;
        });
    }
    watch(opts) {
        // Start if need
        if (!this.started) {
            // DEBUG
            //console.debug(`[gwaleen] Waiting to be started on device {${this.address}}...`)
            return from(this.ready())
                .pipe(switchMap(() => this.watch(Object.assign(Object.assign({}, opts), { checkConnection: false /*already checked*/ }))));
        }
        // Make sure the device is still connected (e.g. if disconnected on the device)
        if (!opts || opts.checkConnection !== false) {
            return from(this.connectIfNeed())
                .pipe(map((connected) => {
                if (!connected) {
                    console.error('[gwaleen] Failed to connect to the device');
                    // Stop the ichthyometer
                    this.stop();
                    // Propage a connection error to observable
                    throw { code: BluetoothErrorCodes.BLUETOOTH_CONNECTION_ERROR, message: 'Failed to connect to the device' };
                }
                return connected;
            }), switchMap(() => this.watch(Object.assign(Object.assign({}, opts), { checkConnection: false /*avoid infinite loop*/ }))));
        }
        this.incrementUsage();
        console.info(`[gwaleen] Watching values from device {${this.address}} (usageCount: ${this.usageCount})...`);
        return this.bluetoothService.watch(this.device, { delimiter: '#' })
            .pipe(map((value) => {
            // Length
            if ((value === null || value === void 0 ? void 0 : value.startsWith(GwaleenIchthyometer_1.VALUE_LENGTH_PREFIX)) && value.endsWith(GwaleenIchthyometer_1.END_DELIMITER)) {
                const numericalValue = value.substring(GwaleenIchthyometer_1.VALUE_LENGTH_PREFIX.length, value.length - 1);
                console.debug(`[gwaleen] Received numerical value '${numericalValue}' from device '${this.address}'`);
                return numericalValue;
            }
            // Any other value (e.g. ping ack)
            else if (isNotNilOrBlank(value)) {
                this._readSubject.next(value);
            }
            return undefined; // Will be excluded
        }), filter(isNotNilOrBlank), finalize(() => {
            this.decrementUsage();
            console.info(`[gwaleen] Stop watching values from device {${this.address}}. (usageCount: ${this.usageCount})`);
        }));
    }
    watchLength() {
        return this.watch()
            .pipe(filter(isNotNilOrBlank), map(strValue => ({
            value: parseFloat(strValue),
            unit: 'mm'
        })));
    }
    doPing() {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            {
                const logMessage = `Sending ping to {${this.address}}...`;
                console.debug('[gwaleen] ' + logMessage);
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug('ping', logMessage);
            }
            try {
                yield this.write(GwaleenIchthyometer_1.PING_COMMAND);
                const value = yield this.read({ timeout: GwaleenIchthyometer_1.PING_TIMEOUT_MS });
                const acknowledge = value === GwaleenIchthyometer_1.PING_ACKNOWLEDGE;
                if (!acknowledge) {
                    console.debug(`[gwaleen] Received invalid ping result: '${value}'`);
                    (_b = this._logger) === null || _b === void 0 ? void 0 : _b.debug('ping', `Received invalid ping result: '${value}'`);
                }
                if (!acknowledge) {
                    const logMessage = `Ping failed: timeout reached after ${GwaleenIchthyometer_1.PING_TIMEOUT_MS}ms`;
                    console.warn('[gwaleen] ' + logMessage);
                    (_c = this._logger) === null || _c === void 0 ? void 0 : _c.debug('ping', logMessage);
                }
                else {
                    const logMessage = `Sending ping to {${this.address}} [OK] in ${Date.now() - now}ms`;
                    console.info('[gwaleen] ' + logMessage);
                    (_d = this._logger) === null || _d === void 0 ? void 0 : _d.debug('ping', logMessage);
                }
                return acknowledge;
            }
            catch (err) {
                const logMessage = `Failed send ping to {${this.device.address}}: ${(err === null || err === void 0 ? void 0 : err.message) || ''}`;
                console.error('[gwaleen] ' + logMessage, err);
                (_e = this._logger) === null || _e === void 0 ? void 0 : _e.debug('ping', logMessage);
                throw err;
            }
        });
    }
    getModelAndVersion() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const connected = yield this.connectIfNeed({ emitEvent: false });
            if (!connected)
                return; // Not connected
            const now = Date.now();
            console.debug(`[gwaleen] Asking info to {${this.device.address}}...`);
            (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug('getInfo', `Asking info to {${this.device.address}}...`);
            const result = { model: undefined, version: undefined };
            try {
                yield BluetoothSerial.write({ address: this.device.address, value: GwaleenIchthyometer_1.INFO_COMMAND });
                const value = yield this.read({ timeout: GwaleenIchthyometer_1.INFO_TIMEOUT_MS });
                if ((value === null || value === void 0 ? void 0 : value.startsWith(GwaleenIchthyometer_1.INFO_RESULT_PREFIX)) && value.endsWith(GwaleenIchthyometer_1.END_DELIMITER)) {
                    const parts = value.substring(GwaleenIchthyometer_1.INFO_RESULT_PREFIX.length, value.length - 1).split(',');
                    result.model = parts[0];
                    result.version = parts[1];
                }
                if (result === null || result === void 0 ? void 0 : result.model) {
                    console.info(`[gwaleen] Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
                    (_b = this._logger) === null || _b === void 0 ? void 0 : _b.info('getInfo', `Asking info to {${this.device.address}} [OK] in ${Date.now() - now}ms - {model: '${result.model}', version: '${result.version}'}`);
                }
                else {
                    console.warn(`[gwaleen] Asking info failed: timeout reached after ${GwaleenIchthyometer_1.INFO_TIMEOUT_MS}ms`);
                    (_c = this._logger) === null || _c === void 0 ? void 0 : _c.warn('getInfo', `Asking info failed: timeout reached after ${GwaleenIchthyometer_1.INFO_TIMEOUT_MS}ms`);
                }
            }
            catch (err) {
                console.error(`[gwaleen] Failed asking info to {${this.device.address}}: ${(err === null || err === void 0 ? void 0 : err.message) || ''}`, err);
                (_d = this._logger) === null || _d === void 0 ? void 0 : _d.error('getInfo', `Failed asking info to {${this.device.address}}: ${(err === null || err === void 0 ? void 0 : err.message) || ''}`);
            }
            return result;
        });
    }
    /* -- internal functions -- */
    connectIfNeed(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const connected = yield this.bluetoothService.connectIfNeed(this.device, Object.assign(Object.assign({}, opts), { timeout: GwaleenIchthyometer_1.CONNECTION_TIMEOUT_MS }));
            // Update connected state
            if (!opts || opts.emitEvent !== false) {
                this._state.set('connected', _ => connected);
            }
            return connected;
        });
    }
    disconnectIfNeed(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bluetoothService.disconnect(this.device, opts);
            // Update connected state
            if (!opts || opts.emitEvent !== false) {
                this._state.set('connected', _ => false);
            }
        });
    }
    write(value) {
        return BluetoothSerial.write({ address: this.device.address, value });
    }
    read(opts) {
        return firstNotNilPromise(race([
            timer(0, 200)
                .pipe(mergeMap(() => BluetoothSerial.readUntil({ address: this.device.address, delimiter: GwaleenIchthyometer_1.END_DELIMITER })), map(({ value }) => value), filter(isNotNilOrBlank)),
            this._readSubject.pipe(filter(isNotNilOrBlank))
        ]), {
            timeout: (opts === null || opts === void 0 ? void 0 : opts.timeout) || GwaleenIchthyometer_1.READ_TIMEOUT_MS,
            stop: this.stopSubject
        });
    }
    markAsConnected() {
        this._state.set('connected', _ => true);
    }
    markAsDisconnected() {
        this._state.set('connected', _ => false);
    }
    incrementUsage() {
        this._state.set('usageCount', s => isNil(s.usageCount) ? 1 : s.usageCount + 1);
    }
    decrementUsage() {
        this._state.set('usageCount', s => Math.max(0, s.usageCount - 1));
    }
};
GwaleenIchthyometer.TYPE = 'gwaleen';
GwaleenIchthyometer.READ_TIMEOUT_MS = 1000; // 1s timeout
GwaleenIchthyometer.END_DELIMITER = '#';
GwaleenIchthyometer.PING_TIMEOUT_MS = 3000; // 3s timeout
GwaleenIchthyometer.PING_COMMAND = 'a#';
GwaleenIchthyometer.PING_ACKNOWLEDGE = '%a:e#';
GwaleenIchthyometer.INFO_COMMAND = 'b#';
GwaleenIchthyometer.INFO_TIMEOUT_MS = 4000; // 4s timeout
GwaleenIchthyometer.INFO_RESULT_PREFIX = '%b:';
GwaleenIchthyometer.VALUE_LENGTH_PREFIX = '%l,';
GwaleenIchthyometer.CONNECTION_TIMEOUT_MS = 2000; // 2s timeout
GwaleenIchthyometer = GwaleenIchthyometer_1 = __decorate([
    Directive(),
    __param(1, Inject(APP_ICHTYOMETER_DEVICE)),
    __metadata("design:paramtypes", [Injector, Object])
], GwaleenIchthyometer);
export { GwaleenIchthyometer };
//# sourceMappingURL=ichthyometer.gwaleen.js.map