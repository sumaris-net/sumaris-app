import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { SelectPmfmModal } from './select-pmfm.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { PmfmsTable } from '@app/referential/pmfm/table/pmfms.table';

@NgModule({
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
export class AppPmfmSelectModalModule {
}
