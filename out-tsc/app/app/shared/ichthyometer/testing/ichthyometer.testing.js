import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { BluetoothService } from '@app/shared/bluetooth/bluetooth.service';
import { sleep } from '@sumaris-net/ngx-components';
let IchthyometerTestingPage = class IchthyometerTestingPage {
    constructor(platform, bluetoothService, ichthyometerService, cd, _state) {
        this.platform = platform;
        this.bluetoothService = bluetoothService;
        this.ichthyometerService = ichthyometerService;
        this.cd = cd;
        this._state = _state;
        this.loading$ = this._state.select('loading');
        this.values$ = this._state.select('values');
        this._state.set({
            loading: false,
            values: []
        });
        this._state.connect('values', this.ichthyometerService.watchLength(), (s, value) => ([...(s.values || []), value]));
    }
    disconnectAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ichthyometerService.disconnectAll();
            yield sleep(1000);
            yield this.ichthyometerService.restart();
        });
    }
    disconnect(item) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ichthyometerService.disconnect(item);
        });
    }
};
IchthyometerTestingPage = __decorate([
    Component({
        selector: 'app-ichthyometer-testing',
        templateUrl: './ichthyometer.testing.html',
        styleUrls: [
            './ichthyometer.testing.scss'
        ],
        providers: [RxState],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Platform,
        BluetoothService,
        IchthyometerService,
        ChangeDetectorRef,
        RxState])
], IchthyometerTestingPage);
export { IchthyometerTestingPage };
//# sourceMappingURL=ichthyometer.testing.js.map