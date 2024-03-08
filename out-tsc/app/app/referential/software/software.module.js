import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { SoftwarePage } from './software.page';
import { TranslateModule } from '@ngx-translate/core';
import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
let AppSoftwareModule = class AppSoftwareModule {
};
AppSoftwareModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TextMaskModule,
            TranslateModule.forChild(),
            AppCoreModule,
            // Sub modules
            AppReferentialFormModule,
            AppReferentialTableModule,
            AppReferentialPipesModule,
        ],
        declarations: [
            // Components
            SoftwarePage,
        ],
        exports: [
            TranslateModule,
            // Components
            SoftwarePage
        ],
    })
], AppSoftwareModule);
export { AppSoftwareModule };
//# sourceMappingURL=software.module.js.map