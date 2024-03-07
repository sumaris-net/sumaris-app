import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { ReferentialForm } from './referential.form';
import { TranslateModule } from '@ngx-translate/core';
import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
let AppReferentialFormModule = class AppReferentialFormModule {
};
AppReferentialFormModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TextMaskModule,
            TranslateModule.forChild(),
            AppCoreModule,
        ],
        declarations: [
            // Pipes
            // Components
            ReferentialForm,
        ],
        exports: [
            TranslateModule,
            // Pipes
            // Components
            ReferentialForm,
        ],
    })
], AppReferentialFormModule);
export { AppReferentialFormModule };
//# sourceMappingURL=referential-form.module.js.map