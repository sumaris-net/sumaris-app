import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { BluetoothService, removeByAddress } from '@app/shared/bluetooth/bluetooth.service';
import { chainPromises, isEmptyArray, isNotEmptyArray, isNotNil, removeDuplicatesFromArray, sleep } from '@sumaris-net/ngx-components';
import { RxState } from '@rx-angular/state';
import { bluetoothClassToMatIcon } from '@app/shared/bluetooth/bluetooth.utils';
import { map } from 'rxjs/operators';
let BluetoothPopover = class BluetoothPopover {
    constructor(cd, popoverController, service, state) {
        this.cd = cd;
        this.popoverController = popoverController;
        this.service = service;
        this.state = state;
        this.enabled$ = this.service.enabled$;
        this.loading$ = this.state.select('loading');
        this.devices$ = this.state.select('devices');
        this.deviceCount$ = this.devices$.pipe(map(v => v.length));
        this.connectedDevices$ = this.state.select('connectedDevices');
        this.connecting$ = this.state.select('connecting');
        this.debug = false;
        this.selectedDevicesIcon = { icon: 'information-circle' };
    }
    set devices(value) {
        this.state.set('devices', _ => value);
    }
    get devices() {
        return this.state.get('devices');
    }
    set connectedDevices(value) {
        this.state.set('connectedDevices', _ => value);
    }
    get connectedDevices() {
        return this.state.get('connectedDevices');
    }
    set connecting(value) {
        this.state.set('connecting', _ => value);
    }
    get connecting() {
        return this.state.get('connecting');
    }
    ngOnInit() {
        this.checkEnabledAndScan();
    }
    checkEnabledAndScan() {
        return __awaiter(this, void 0, void 0, function* () {
            let enabled;
            try {
                yield this.service.ready();
                enabled = yield this.service.enable();
            }
            catch (err) {
                console.error(`[bluetooth-popover] Error trying to enable bluetooth: ${(err === null || err === void 0 ? void 0 : err.message) || err}`, err);
                enabled = false; // Continue
            }
            // If enabled
            if (enabled) {
                this.state.set('enabled', _ => enabled);
                let connectedDevices = this.connectedDevices || [];
                let devices = this.devices || [];
                // Try to reconnect all connected devices
                if (isNotEmptyArray(connectedDevices)) {
                    this.markAsConnecting();
                    connectedDevices = (yield chainPromises(connectedDevices.map(d => () => this.connect(null, d, { dismiss: false })
                        .catch(_ => false)
                        .then(connected => {
                        if (connected) {
                            devices = removeByAddress(devices, d);
                            return d;
                        }
                        devices = removeDuplicatesFromArray([d, ...devices], 'address');
                        return null; // Will be excluded in the next filter()
                    })))).filter(isNotNil);
                    this.state.set({ enabled, devices, connectedDevices });
                    this.markAsConnected();
                    this.markAsLoaded();
                }
                else {
                    this.connectedDevices = [];
                    yield this.scan();
                    this.markAsConnecting();
                }
            }
            else {
                this.markAsConnecting();
                this.markAsLoaded();
            }
        });
    }
    toggleBluetooth() {
        return __awaiter(this, void 0, void 0, function* () {
            const enabled = yield this.service.isEnabled();
            if (enabled) {
                yield this.disable();
            }
            else {
                const enabled = yield this.enable();
                if (enabled) {
                    // Start a scan
                    yield this.scan();
                }
            }
        });
    }
    enable() {
        return __awaiter(this, void 0, void 0, function* () {
            const enabled = yield this.service.enable();
            this.state.set('enabled', _ => enabled);
            return enabled;
        });
    }
    disable() {
        return __awaiter(this, void 0, void 0, function* () {
            this.devices = [];
            yield this.disconnectAll({ addToDevices: false });
            const disabled = yield this.service.disable();
            this.state.set('enabled', _ => !disabled);
        });
    }
    scan() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Mark as loading
                this.markAsLoading();
                // Clear devices
                this.state.set('devices', _ => []);
                // Enable if need
                const enabled = yield this.service.enable();
                if (!enabled)
                    return;
                let devices = yield this.service.scan();
                // Apply filter
                if (this.deviceFilter) {
                    devices = (devices || []).filter(this.deviceFilter);
                }
                // Apply result
                this.state.set('devices', _ => devices);
            }
            catch (err) {
                console.error('[bluetooth-popover] Error while scanning devices: ' + ((err === null || err === void 0 ? void 0 : err.message) || '') + ' ' + JSON.stringify(err));
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    connect(event, device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return false;
            event === null || event === void 0 ? void 0 : event.preventDefault();
            console.info(`[bluetooth-popover] Connecting to: {${device.address}}`);
            let connected = false;
            try {
                // Add to connectedDevices
                this.state.set('connectedDevices', s => removeDuplicatesFromArray([...s.connectedDevices, device], 'address'));
                connected = yield this.service.isConnected(device);
                if (connected)
                    return true; // Already connected
                // Connect
                this.markAsConnecting();
                connected = yield this.service.connect(device);
                // Cannot connect
                if (!connected)
                    return false;
                if (typeof this.checkAfterConnect !== 'function') {
                    console.debug('[bluetooth-popover] Cannot check if connection is valid: input \'checkAfterConnect\' not set');
                }
                else {
                    // Check connection is valid
                    console.debug('[bluetooth-popover] Calling checkAfterConnect()...');
                    try {
                        const deviceOrConnected = yield this.checkAfterConnect(device);
                        connected = !!deviceOrConnected;
                        if (!connected) {
                            console.warn('[bluetooth-popover] Not a valid device!', deviceOrConnected);
                        }
                        else {
                            if (typeof deviceOrConnected === 'object') {
                                // Update device (with updated device received)
                                const device = deviceOrConnected;
                                this.state.set('connectedDevices', s => removeDuplicatesFromArray([device, ...s.connectedDevices], 'address'));
                            }
                            // Remove from available devices
                            this.state.set('devices', s => removeByAddress(s.devices, device));
                        }
                    }
                    catch (e) {
                        console.error('[bluetooth-popover] Failed during checkAfterConnect(): ' + ((e === null || e === void 0 ? void 0 : e.message) || e));
                        connected = false;
                    }
                }
                this.cd.markForCheck();
                // Dismiss, if connected
                if (!opts || opts.dismiss !== false) {
                    yield sleep(500);
                    this.dismiss(this.connectedDevices);
                }
                return true;
            }
            catch (err) {
                console.error(err);
                return false;
            }
            finally {
                if (connected) {
                    this.markAsConnected();
                }
                else {
                    yield this.disconnect(device);
                }
            }
        });
    }
    disconnectAll(opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const selectedDevices = (_a = this.connectedDevices) === null || _a === void 0 ? void 0 : _a.slice();
            if (isEmptyArray(selectedDevices))
                return; // Skip if empty
            yield chainPromises(selectedDevices.map(d => () => this.disconnect(d, { addToDevices: false })
                .catch(_ => { })));
            if ((opts === null || opts === void 0 ? void 0 : opts.addToDevices) !== false) {
                this.devices = selectedDevices;
            }
        });
    }
    disconnect(device, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(device === null || device === void 0 ? void 0 : device.address))
                throw new Error('Missing device');
            console.debug(`[bluetooth-popover] Disconnecting {${device.address}} ...`);
            yield this.service.disconnect(device);
            this.state.set('connectedDevices', s => removeByAddress(s.connectedDevices, device));
            if ((opts === null || opts === void 0 ? void 0 : opts.addToDevices) !== false) {
                this.state.set('devices', s => removeDuplicatesFromArray([device, ...s.devices], 'address'));
            }
            this.markAsConnecting();
        });
    }
    dismiss(data, role) {
        this.popoverController.dismiss(data, role);
    }
    trackByFn(index, device) {
        return device.address;
    }
    getDeviceMatIcon(device) {
        return bluetoothClassToMatIcon((device === null || device === void 0 ? void 0 : device.class) || 0);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    markAsLoading() {
        this.state.set('loading', _ => true);
    }
    markAsLoaded() {
        this.state.set('loading', _ => false);
    }
    markAsConnecting() {
        this.state.set('connecting', _ => true);
    }
    markAsConnected() {
        this.state.set('connecting', _ => false);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Function)
], BluetoothPopover.prototype, "checkAfterConnect", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], BluetoothPopover.prototype, "devices", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], BluetoothPopover.prototype, "connectedDevices", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BluetoothPopover.prototype, "connecting", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BluetoothPopover.prototype, "debug", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BluetoothPopover.prototype, "titleI18n", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BluetoothPopover.prototype, "deviceFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BluetoothPopover.prototype, "selectedDevicesIcon", void 0);
BluetoothPopover = __decorate([
    Component({
        selector: 'app-bluetooth-popover',
        templateUrl: './bluetooth.popover.html',
        styleUrls: ['./bluetooth.popover.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
        providers: [RxState]
    }),
    __metadata("design:paramtypes", [ChangeDetectorRef,
        PopoverController,
        BluetoothService,
        RxState])
], BluetoothPopover);
export { BluetoothPopover };
//# sourceMappingURL=bluetooth.popover.js.map