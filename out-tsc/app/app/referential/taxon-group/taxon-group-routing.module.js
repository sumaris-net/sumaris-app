import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { TaxonGroupPage } from '@app/referential/taxon-group/taxon-group.page';
import { AppTaxonGroupModule } from '@app/referential/taxon-group/taxon-group.module';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: TaxonGroupPage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppTaxonGroupRoutingModule = class AppTaxonGroupRoutingModule {
};
AppTaxonGroupRoutingModule = __decorate([
    NgModule({
        imports: [
            AppTaxonGroupModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppTaxonGroupRoutingModule);
export { AppTaxonGroupRoutingModule };
//# sourceMappingURL=taxon-group-routing.module.js.map