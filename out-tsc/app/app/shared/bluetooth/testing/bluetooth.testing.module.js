import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
import { BluetoothTestingPage } from '@app/shared/bluetooth/testing/bluetooth.testing';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';
export const BLUETOOTH_TESTING_PAGES = [
    { label: 'Bluetooth', page: '/testing/shared/bluetooth' }
];
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: BluetoothTestingPage
    }
];
let AppBluetoothTestingModule = class AppBluetoothTestingModule {
};
AppBluetoothTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            AppSharedModule,
            CoreModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            AppBluetoothModule
        ],
        declarations: [
            BluetoothTestingPage
        ],
        exports: [
            BluetoothTestingPage
        ]
    })
], AppBluetoothTestingModule);
export { AppBluetoothTestingModule };
//# sourceMappingURL=bluetooth.testing.module.js.map