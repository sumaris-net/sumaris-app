import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { VesselsPage } from './list/vessels.page';
import { VesselPage } from './page/vessel.page';
import { VesselModule } from './vessel.module';
const routes = [
    {
        path: '',
        pathMatch: 'full',
        component: VesselsPage,
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
            profile: 'USER'
        }
    },
    {
        path: ':id',
        component: VesselPage,
        runGuardsAndResolvers: 'pathParamsChange',
        data: {
            profile: 'USER'
        }
    }
];
let VesselRoutingModule = class VesselRoutingModule {
};
VesselRoutingModule = __decorate([
    NgModule({
        imports: [
            VesselModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], VesselRoutingModule);
export { VesselRoutingModule };
//# sourceMappingURL=vessel-routing.module.js.map