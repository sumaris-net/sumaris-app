import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { SelectReferentialModal } from './select-referential.modal';
import { ReferentialRefTable } from './referential-ref.table';
import { TranslateModule } from '@ngx-translate/core';
import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { SimpleReferentialTable } from './referential-simple.table';
import { ReferentialTable } from './referential.table';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
let AppReferentialTableModule = class AppReferentialTableModule {
};
AppReferentialTableModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TextMaskModule,
            TranslateModule.forChild(),
            AppCoreModule,
            // Sub modules
            AppReferentialPipesModule
        ],
        declarations: [
            // Components
            ReferentialTable,
            SimpleReferentialTable,
            ReferentialRefTable,
            SelectReferentialModal
        ],
        exports: [
            TranslateModule,
            // Components
            ReferentialTable,
            SimpleReferentialTable,
            ReferentialRefTable,
            SelectReferentialModal
        ],
    })
], AppReferentialTableModule);
export { AppReferentialTableModule };
//# sourceMappingURL=referential-table.module.js.map