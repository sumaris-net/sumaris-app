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
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { ParameterPage } from '@app/referential/pmfm/parameter.page';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    AppCoreModule,

    // Sub modules
    AppReferentialFormModule,
    AppReferentialPipesModule,
    AppReferentialTableModule
  ],
  declarations: [

    // Components
    PmfmPage,
    PmfmFormField,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal,
    ParameterPage
  ],
  exports: [
    TranslateModule,

    // Components
    PmfmPage,
    PmfmQvFormField,
    PmfmsTable,
    SelectPmfmModal,
    ParameterPage
  ],
})
export class AppPmfmModule {
}
