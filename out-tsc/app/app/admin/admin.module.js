import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminModule } from '@sumaris-net/ngx-components';
import { AppConfigurationModule } from '@app/admin/config/configuration.module';
let AppAdminModule = class AppAdminModule {
    constructor() {
        console.debug('[admin] Creating module');
    }
};
AppAdminModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            AdminModule,
            // Sub modules
            AppConfigurationModule
        ],
        exports: [
            AppConfigurationModule
        ]
    }),
    __metadata("design:paramtypes", [])
], AppAdminModule);
export { AppAdminModule };
//# sourceMappingURL=admin.module.js.map