import { __decorate } from "tslib";
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { AppTaxonNameModule } from '@app/referential/taxon-name/taxon-name.module';
import { TaxonNamePage } from '@app/referential/taxon-name/taxon-name.page';
const routes = [
    {
        path: ':id',
        pathMatch: 'full',
        component: TaxonNamePage,
        data: {
            profile: 'ADMIN'
        }
    }
];
let AppTaxonNameRoutingModule = class AppTaxonNameRoutingModule {
};
AppTaxonNameRoutingModule = __decorate([
    NgModule({
        imports: [
            AppTaxonNameModule,
            RouterModule.forChild(routes)
        ],
        exports: [RouterModule]
    })
], AppTaxonNameRoutingModule);
export { AppTaxonNameRoutingModule };
//# sourceMappingURL=taxon-name-routing.module.js.map