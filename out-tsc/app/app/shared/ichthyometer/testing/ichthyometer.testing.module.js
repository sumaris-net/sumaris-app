import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { IchthyometerTestingPage } from '@app/shared/ichthyometer/testing/ichthyometer.testing';
import { AppIchthyometerModule } from '@app/shared/ichthyometer/ichthyometer.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppBluetoothModule } from '@app/shared/bluetooth/bluetooth.module';
export const ICHTHYOMETER_TESTING_PAGES = [
    { label: 'Ichthyometer', page: '/testing/shared/ichthyometer' }
];
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: IchthyometerTestingPage
    }
];
let AppIchthyometerTestingModule = class AppIchthyometerTestingModule {
};
AppIchthyometerTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            AppSharedModule,
            CoreModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            AppIchthyometerModule,
            AppBluetoothModule
        ],
        declarations: [
            IchthyometerTestingPage
        ],
        exports: [
            IchthyometerTestingPage
        ]
    })
], AppIchthyometerTestingModule);
export { AppIchthyometerTestingModule };
//# sourceMappingURL=ichthyometer.testing.module.js.map