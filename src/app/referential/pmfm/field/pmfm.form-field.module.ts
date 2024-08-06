import { NgModule } from '@angular/core';
import { PmfmQvFormField } from './pmfm-qv.form-field.component';
import { PmfmFormField } from './pmfm.form-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { MatSelect } from '@angular/material/select';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialPipesModule,
    MatAutocomplete,
    MatAutocomplete,
    MatSelect,
  ],
  declarations: [
    // Components
    PmfmFormField,
    PmfmQvFormField,
  ],
  exports: [
    TranslateModule,

    // Components
    PmfmFormField,
    PmfmQvFormField,
  ],
})
export class AppPmfmFormFieldModule {}
