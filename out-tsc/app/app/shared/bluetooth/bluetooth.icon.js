import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, InjectionToken, Injector, Input, Optional, Output } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { distinctUntilKeyChanged, map } from 'rxjs/operators';
import { equals, isEmptyArray, isNil, toBoolean } from '@sumaris-net/ngx-components';
import { PopoverController } from '@ionic/angular';
import { BluetoothPopover } from '@app/shared/bluetooth/bluetooth.popover';
import { timer } from 'rxjs';
export class BluetoothMatIconRef {
}
export const APP_BLUETOOTH_ICON_DEFAULT_STATE = new InjectionToken('BluetoothIconState');
let AppBluetoothIcon = class AppBluetoothIcon {
    constructor(injector, bluetoothService, _state, state) {
        this.bluetoothService = bluetoothService;
        this._state = _state;
        this._popoverOpened = false;
        this._forceDisabled = false;
        this.icon$ = this._state.select('icon');
        this.title = 'SHARED.BLUETOOTH.TITLE';
        this.selectedDeviceIcon = { icon: 'information-circle' };
        this.connectedDevicesChanges = this._state.$.pipe(distinctUntilKeyChanged('connectedDevices'), map(s => s.connectedDevices));
        this.badgeSize = 'small';
        this.badgePosition = 'above after';
        this.badgeHidden = false;
        this.cd = injector.get(ChangeDetectorRef);
        this.popoverController = injector.get(PopoverController);
        this._state.set(Object.assign({ icon: { matIcon: 'bluetooth', badge: null } }, state));
    }
    set icon(value) {
        this._state.set('icon', _ => value);
    }
    get icon() {
        return this._state.get('icon');
    }
    set autoConnect(value) {
        this._state.set('autoConnect', _ => value);
    }
    get autoConnect() {
        return this._state.get('autoConnect');
    }
    set deviceFilter(value) {
        this._state.set('deviceFilter', _ => value);
    }
    get deviceFilter() {
        return this._state.get('deviceFilter');
    }
    set devices(value) {
        this._state.set('devices', _ => value);
    }
    get devices() {
        return this._state.get('devices');
    }
    set deviceCheck(value) {
        this._state.set('deviceCheck', _ => value);
    }
    get deviceCheck() {
        return this._state.get('deviceCheck');
    }
    set disabled(value) {
        this._forceDisabled = value;
        this.cd.markForCheck();
    }
    get disabled() {
        return this._forceDisabled;
    }
    get enabled() {
        return this._state.get('enabled');
    }
    ngOnInit() {
        // Default values
        this.autoConnect = toBoolean(this.autoConnect, false);
        this.deviceFilter = this.deviceFilter || ((device) => !!device.address);
        // Enabled state
        this._state.connect('enabled', this.bluetoothService.enabled$);
        this._state.connect('connecting', this.bluetoothService.connecting$);
        // Devices
        this._state.connect('devices', this.bluetoothService.connectedDevices$.pipe(map(devices => devices === null ? null : devices.map(d => this.asDevice(d)))));
        // Connected devices
        this._state.connect('connectedDevices', this._state.select(['enabled', 'devices', 'deviceFilter'], s => s)
            .pipe(map(({ enabled, devices, deviceFilter }) => {
            // DEBUG
            //console.debug(`[bluetooth-icon] Receiving state changes: ${JSON.stringify({enabled, devices})}`);
            // If disabled: no devices
            if (!enabled || !devices)
                return null;
            // No filter function: all devices
            if (typeof deviceFilter !== 'function')
                return devices;
            // DEBUG
            //console.debug(`[bluetooth-icon] Filtering devices: [${devices?.map(d => d.address).join(', ')}]`);
            // Filtering devices
            return devices.filter(d => deviceFilter(d));
        })));
        // Refresh icon, when enabled or connected devices changed
        this._state.hold(this._state.select(['enabled', 'connectedDevices', 'connecting'], s => s), s => this.updateView(s));
    }
    updateView(state) {
        state = state || { enabled: null, connectedDevices: null, connecting: null };
        // DEBUG
        //console.debug('[bluetooth-icon] Updating view: ' + JSON.stringify(state));
        let matIcon;
        let color;
        let badge;
        let badgeIcon;
        let badgeMatIcon;
        let badgeColor;
        let badgeBlink = false;
        let badgeFill = 'solid';
        // Starting
        if (isNil(state.enabled)) {
            matIcon = 'bluetooth_disabled';
            color = 'light';
            badge = '…';
            badgeColor = 'accent';
            badgeBlink = true;
        }
        // Disabled
        else if (state.enabled !== true) {
            matIcon = 'bluetooth_disabled';
            color = 'light';
            badge = '';
        }
        // Enabled, connecting (or waiting devices)
        else if (this.bluetoothService.starting || state.connecting) {
            matIcon = 'bluetooth';
            color = 'tertiary';
            badge = '…';
            badgeColor = 'accent';
            badgeBlink = true;
        }
        // Enabled, never had a devices
        else if (isNil(state.connectedDevices)) {
            matIcon = 'bluetooth';
            color = 'tertiary';
        }
        // Enabled, no devices anymore (but had some)
        else if (isEmptyArray(state.connectedDevices)) {
            matIcon = 'bluetooth';
            color = 'tertiary';
            badgeIcon = 'alert';
            badgeColor = 'danger';
            badgeFill = 'clear';
        }
        // Enabled, has connected devices
        else {
            matIcon = 'bluetooth_connected';
            color = 'tertiary';
            badgeColor = 'success';
            badge = state.connectedDevices.length;
        }
        // Set icon
        const icon = { color, matIcon, badge, badgeIcon, badgeColor, badgeFill, badgeMatIcon };
        if (!equals(this.icon, icon)) {
            // DEBUG
            //console.debug('[bluetooth-icon] Changing icon to: ' + JSON.stringify(icon));
            this._state.set('icon', () => icon);
        }
        // Blink animation
        if (badgeBlink)
            this.startBlinkAnimation();
        else
            this.stopBlinkAnimation();
    }
    asDevice(device) {
        return device;
    }
    openPopover(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._popoverOpened || event.defaultPrevented)
                return; // Already opened
            event.preventDefault();
            this._popoverOpened = true;
            try {
                const connectedDevices = this._state.get('connectedDevices');
                const checkAfterConnectFn = typeof this.checkAfterConnect === 'function' ? (device) => this.checkAfterConnect(device) : undefined;
                const popover = yield this.popoverController.create({
                    component: BluetoothPopover,
                    componentProps: {
                        titleI18n: this.title,
                        deviceFilter: this.deviceFilter,
                        connectedDevices,
                        selectedDevicesIcon: this.selectedDeviceIcon,
                        checkAfterConnect: checkAfterConnectFn
                    },
                    backdropDismiss: true,
                    keyboardClose: true,
                    event,
                    translucent: true,
                    cssClass: 'popover-large popover-bluetooth'
                });
                yield popover.present();
                const { data, role } = yield popover.onDidDismiss();
                const devices = data ? (Array.isArray(data) ? data : [data]) : undefined;
                if (devices)
                    this.devices = devices;
            }
            finally {
                this._popoverOpened = false;
            }
        });
    }
    startBlinkAnimation() {
        if (!this._blinkSubscription && !this.badgeHidden) {
            this._blinkSubscription = timer(500, 500)
                .subscribe(() => {
                this.badgeHidden = !this.badgeHidden;
                this.cd.markForCheck();
            });
            this._blinkSubscription.add(() => {
                this._blinkSubscription = null;
                // Restore initial value (before timer)
                if (this.badgeHidden) {
                    this.badgeHidden = false;
                    this.cd.markForCheck();
                }
            });
        }
    }
    stopBlinkAnimation() {
        var _a;
        (_a = this._blinkSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBluetoothIcon.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBluetoothIcon.prototype, "selectedDeviceIcon", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], AppBluetoothIcon.prototype, "checkAfterConnect", void 0);
__decorate([
    Input(),
    __metadata("design:type", BluetoothMatIconRef),
    __metadata("design:paramtypes", [BluetoothMatIconRef])
], AppBluetoothIcon.prototype, "icon", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AppBluetoothIcon.prototype, "autoConnect", null);
__decorate([
    Input(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function])
], AppBluetoothIcon.prototype, "deviceFilter", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], AppBluetoothIcon.prototype, "devices", null);
__decorate([
    Input(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Function])
], AppBluetoothIcon.prototype, "deviceCheck", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AppBluetoothIcon.prototype, "disabled", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], AppBluetoothIcon.prototype, "connectedDevicesChanges", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppBluetoothIcon.prototype, "badgeSize", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppBluetoothIcon.prototype, "badgePosition", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBluetoothIcon.prototype, "badgeHidden", void 0);
AppBluetoothIcon = __decorate([
    Component({
        selector: 'app-bluetooth-icon',
        templateUrl: './bluetooth.icon.html',
        providers: [
            { provide: APP_BLUETOOTH_ICON_DEFAULT_STATE, useValue: { matIcon: 'bluetooth' } },
            RxState
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(3, Optional()),
    __param(3, Inject(APP_BLUETOOTH_ICON_DEFAULT_STATE)),
    __metadata("design:paramtypes", [Injector,
        BluetoothService,
        RxState, Object])
], AppBluetoothIcon);
export { AppBluetoothIcon };
//# sourceMappingURL=bluetooth.icon.js.map