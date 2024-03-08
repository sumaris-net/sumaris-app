import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SelectPmfmModal } from './select-pmfm.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { PmfmsTable } from '@app/referential/pmfm/table/pmfms.table';
let AppPmfmSelectModalModule = class AppPmfmSelectModalModule {
};
AppPmfmSelectModalModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            // App modules
            AppCoreModule,
            AppReferentialPipesModule,
        ],
        declarations: [
            // Components
            PmfmsTable,
            SelectPmfmModal
        ],
        exports: [
            TranslateModule,
            // Components
            SelectPmfmModal
        ],
    })
], AppPmfmSelectModalModule);
export { AppPmfmSelectModalModule };
//# sourceMappingURL=select-pmfm.module.js.map