import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { MetierPage } from '@app/referential/metier/metier.page';
import { AppMetierModule } from '@app/referential/metier/metier.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: MetierPage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppMetierRoutingModule = class AppMetierRoutingModule {
};
AppMetierRoutingModule = __decorate([
    NgModule({
        imports: [
            AppMetierModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppMetierRoutingModule);
export { AppMetierRoutingModule };
//# sourceMappingURL=metier-routing.module.js.map