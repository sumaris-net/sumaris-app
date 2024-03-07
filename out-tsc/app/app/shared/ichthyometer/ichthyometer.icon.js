import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
let AppIchthyometerIcon = class AppIchthyometerIcon {
    constructor(ichthyometerService) {
        this.ichthyometerService = ichthyometerService;
        this.title = 'SHARED.ICHTHYOMETER.TITLE';
        this.selectedDeviceIcon = { matIcon: 'straighten' };
    }
    ngOnInit() {
        const ichthyometerService = this.ichthyometerService;
        this.checkAfterConnect = this.checkAfterConnect || ((device) => ichthyometerService.checkAfterConnect(device));
        // Auto start the service
        this.ichthyometerService.ready();
    }
    deviceFilter(device) {
        return !!device.address;
    }
    onConnectedDevicesChanges(devices) {
        // Check if there is some connected devices, and if to restart the ichthyometerService service
        if (isNotEmptyArray(devices) && !this.ichthyometerService.started) {
            // Restart the service (can have been stopped if devices all have been disconnected)
            this.ichthyometerService.ready();
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppIchthyometerIcon.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppIchthyometerIcon.prototype, "type", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppIchthyometerIcon.prototype, "selectedDeviceIcon", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], AppIchthyometerIcon.prototype, "checkAfterConnect", void 0);
AppIchthyometerIcon = __decorate([
    Component({
        selector: 'app-ichthyometer-icon',
        templateUrl: './ichthyometer.icon.html',
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [IchthyometerService])
], AppIchthyometerIcon);
export { AppIchthyometerIcon };
//# sourceMappingURL=ichthyometer.icon.js.map