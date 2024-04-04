import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { MetierPage } from '@app/referential/metier/metier.page';
let AppMetierModule = class AppMetierModule {
};
AppMetierModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            AppCoreModule,
            // Sub modules
            AppReferentialFormModule,
            AppReferentialPipesModule,
            AppReferentialTableModule
        ],
        declarations: [
            // Components
            MetierPage
        ],
        exports: [
            TranslateModule,
            // Components
            MetierPage
        ],
    })
], AppMetierModule);
export { AppMetierModule };
//# sourceMappingURL=metier.module.js.map