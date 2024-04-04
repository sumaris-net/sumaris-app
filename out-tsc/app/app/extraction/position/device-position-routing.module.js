import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DevicePositionMapPage } from '@app/extraction/position/device-position-map-page.component';
import { AuthGuardService } from '@sumaris-net/ngx-components';
import { DevicePositionModule } from '@app/extraction/position/device-position.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: DevicePositionMapPage,
        canActivate: [AuthGuardService],
        data: {
            profile: 'ADMIN',
        },
    },
];
let DevicePositionRoutingModule = class DevicePositionRoutingModule {
};
DevicePositionRoutingModule = __decorate([
    NgModule({
        imports: [
            DevicePositionModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], DevicePositionRoutingModule);
export { DevicePositionRoutingModule };
//# sourceMappingURL=device-position-routing.module.js.map