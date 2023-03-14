import { NgModule } from '@angular/core';
import { PmfmPage } from './pmfm.page';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { PmfmsTable } from './table/pmfms.table';
import { SelectPmfmModal } from './table/select-pmfm.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';
import { AppPmfmMethodModule } from '@app/referential/pmfm/method/method.module';
import { AppPmfmParameterModule } from '@app/referential/pmfm/parameter/parameter.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppPmfmSelectModalModule } from '@app/referential/pmfm/table/select-pmfm.module';

@NgModule({
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
export class AppPmfmModule {
}
