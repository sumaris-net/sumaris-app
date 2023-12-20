import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { MethodPage } from '@app/referential/pmfm/method/method.page';
let AppPmfmMethodModule = class AppPmfmMethodModule {
};
AppPmfmMethodModule = __decorate([
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
            MethodPage
        ],
        exports: [
            TranslateModule,
            // Components
            MethodPage
        ],
    })
], AppPmfmMethodModule);
export { AppPmfmMethodModule };
//# sourceMappingURL=method.module.js.map