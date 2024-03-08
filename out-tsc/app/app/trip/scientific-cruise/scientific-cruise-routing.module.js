import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthGuardService } from '@sumaris-net/ngx-components';
import { ScientificCruiseTable } from '@app/trip/scientific-cruise/scientific-cruise.table';
import { AppScientificCruiseModule } from '@app/trip/scientific-cruise/scientific-cruise.module';
const routes = [
    // Table
    {
        path: '',
        pathMatch: 'full',
        canActivate: [AuthGuardService],
        component: ScientificCruiseTable,
    },
];
let AppScientificCruiseRoutingModule = class AppScientificCruiseRoutingModule {
};
AppScientificCruiseRoutingModule = __decorate([
    NgModule({
        imports: [
            AppScientificCruiseModule,
            RouterModule.forChild(routes)
        ],
        exports: [
            RouterModule
        ]
    })
], AppScientificCruiseRoutingModule);
export { AppScientificCruiseRoutingModule };
//# sourceMappingURL=scientific-cruise-routing.module.js.map