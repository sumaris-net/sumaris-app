import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { TaxonNamePage } from './taxon-name.page';
import { AppCoreModule } from '@app/core/core.module';
import { WeightLengthConversionTable } from './weight-length-conversion/weight-length-conversion.table';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
let AppTaxonNameModule = class AppTaxonNameModule {
};
AppTaxonNameModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            AppCoreModule,
            // Sub modules
            AppReferentialFormModule,
            AppReferentialPipesModule
        ],
        declarations: [
            // Components
            WeightLengthConversionTable,
            TaxonNamePage
        ],
        exports: [
            TranslateModule,
            // Components
            TaxonNamePage
        ],
    })
], AppTaxonNameModule);
export { AppTaxonNameModule };
//# sourceMappingURL=taxon-name.module.js.map