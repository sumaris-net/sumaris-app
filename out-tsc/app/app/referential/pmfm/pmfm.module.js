import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { PmfmPage } from './pmfm.page';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
let AppPmfmModule = class AppPmfmModule {
};
AppPmfmModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            // App modules
            AppCoreModule,
            AppReferentialFormModule,
            AppReferentialPipesModule,
            AppReferentialTableModule,
        ],
        declarations: [
            // Components
            PmfmPage,
        ],
        exports: [
            TranslateModule,
            // Components
            PmfmPage,
        ],
    })
], AppPmfmModule);
export { AppPmfmModule };
//# sourceMappingURL=pmfm.module.js.map