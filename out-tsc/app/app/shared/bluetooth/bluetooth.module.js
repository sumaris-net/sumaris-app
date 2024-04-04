import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { AppIconModule, SharedModule } from '@sumaris-net/ngx-components';
import { AppBluetoothIcon } from './bluetooth.icon';
import { TranslateModule } from '@ngx-translate/core';
import { BluetoothPopover } from '@app/shared/bluetooth/bluetooth.popover';
import { RxStateModule } from '@app/shared/rx-state.module';
let AppBluetoothModule = class AppBluetoothModule {
};
AppBluetoothModule = __decorate([
    NgModule({
        imports: [
            SharedModule,
            TranslateModule.forChild(),
            RxStateModule,
            AppIconModule
        ],
        declarations: [
            AppBluetoothIcon,
            BluetoothPopover
        ],
        exports: [
            TranslateModule,
            AppBluetoothIcon,
            BluetoothPopover
        ]
    })
], AppBluetoothModule);
export { AppBluetoothModule };
//# sourceMappingURL=bluetooth.module.js.map