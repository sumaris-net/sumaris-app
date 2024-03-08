import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
let BluetoothTestingPage = class BluetoothTestingPage {
    constructor(platform, bluetoothService, cd) {
        this.platform = platform;
        this.bluetoothService = bluetoothService;
        this.cd = cd;
    }
    disconnectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bluetoothService.disconnectAll();
        });
    }
    disconnect(item) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bluetoothService.disconnect(item);
        });
    }
};
BluetoothTestingPage = __decorate([
    Component({
        selector: 'app-bluetooth-testing',
        templateUrl: './bluetooth.testing.html',
        styleUrls: [
            './bluetooth.testing.scss'
        ],
        providers: [RxState],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Platform,
        BluetoothService,
        ChangeDetectorRef])
], BluetoothTestingPage);
export { BluetoothTestingPage };
//# sourceMappingURL=bluetooth.testing.js.map