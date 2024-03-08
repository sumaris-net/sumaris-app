import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { TaxonGroupPage } from './taxon-group.page';
import { RoundWeightConversionTable } from './round-weight-conversion/round-weight-conversion.table';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
let AppTaxonGroupModule = class AppTaxonGroupModule {
};
AppTaxonGroupModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TextMaskModule,
            TranslateModule.forChild(),
            AppCoreModule,
            // Sub modules
            AppReferentialFormModule,
            AppReferentialPipesModule
        ],
        declarations: [
            // Components
            RoundWeightConversionTable,
            TaxonGroupPage
        ],
        exports: [
            TranslateModule,
            // Components
            TaxonGroupPage
        ],
    })
], AppTaxonGroupModule);
export { AppTaxonGroupModule };
//# sourceMappingURL=taxon-group.module.js.map