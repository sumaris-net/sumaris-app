import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SHARED_TESTING_PAGES, SharedModule, SharedTestingModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { REPORT_TESTING_PAGES } from '@app/shared/report/testing/report.testing.module';
import { MATERIAL_TESTING_PAGES } from '@app/shared/material/material.testing.module';
import { ICHTHYOMETER_TESTING_PAGES } from '@app/shared/ichthyometer/testing/ichthyometer.testing.module';
import { BLUETOOTH_TESTING_PAGES } from '@app/shared/bluetooth/testing/bluetooth.testing.module';
export const APP_SHARED_TESTING_PAGES = [
    ...SHARED_TESTING_PAGES,
    ...MATERIAL_TESTING_PAGES,
    ...REPORT_TESTING_PAGES,
    ...BLUETOOTH_TESTING_PAGES,
    ...ICHTHYOMETER_TESTING_PAGES
];
const routes = [
    {
        path: 'material', loadChildren: () => import('./material/material.testing.module').then(m => m.AppSharedMaterialTestingModule)
    },
    {
        path: 'report', loadChildren: () => import('./report/testing/report.testing.module').then(m => m.AppSharedReportTestingModule)
    },
    {
        path: 'bluetooth', loadChildren: () => import('./bluetooth/testing/bluetooth.testing.module').then(m => m.AppBluetoothTestingModule)
    },
    {
        path: 'ichthyometer', loadChildren: () => import('./ichthyometer/testing/ichthyometer.testing.module').then(m => m.AppIchthyometerTestingModule)
    }
];
let AppSharedTestingModule = class AppSharedTestingModule {
};
AppSharedTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            SharedModule,
            CoreModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            SharedTestingModule
        ],
        declarations: [],
        exports: []
    })
], AppSharedTestingModule);
export { AppSharedTestingModule };
//# sourceMappingURL=shared.testing.module.js.map