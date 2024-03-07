import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AppIconModule, SharedModule } from '@sumaris-net/ngx-components';
import { AppIchthyometerIcon } from '@app/shared/ichthyometer/ichthyometer.icon';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';
import { RxStateModule } from '@app/shared/rx-state.module';
let AppIchthyometerModule = class AppIchthyometerModule {
};
AppIchthyometerModule = __decorate([
    NgModule({
        imports: [
            SharedModule,
            RxStateModule,
            AppIconModule,
            AppBluetoothModule
        ],
        declarations: [
            AppIchthyometerIcon
        ],
        exports: [
            AppIchthyometerIcon
        ]
    })
], AppIchthyometerModule);
export { AppIchthyometerModule };
//# sourceMappingURL=ichthyometer.module.js.map