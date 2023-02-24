import { NgModule } from '@angular/core';
import { PmfmPage } from './pmfm.page';
import { PmfmQvFormField } from './pmfm-qv.form-field.component';
import { PmfmFormField } from './pmfm.form-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { PmfmsTable } from './pmfms.table';
import { SelectPmfmModal } from './select-pmfm.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';

@NgModule({
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
    PmfmPage,
    PmfmFormField,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal
  ],
  exports: [
    TranslateModule,

    // Components
    PmfmPage,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal,
  ],
})
export class AppPmfmModule {
}
