import { NgModule } from '@angular/core';
import { PmfmQvFormField } from './pmfm-qv.form-field.component';
import { PmfmFormField } from './pmfm.form-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatSuffix } from '@angular/material/form-field';
import { SharedPipesModule } from '../../../../../ngx-sumaris-components/src/app/shared/pipes/pipes.module';
import { IonicModule } from '@ionic/angular';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // App modules
    AppCoreModule,
    AppReferentialPipesModule,
    MatIcon,
    MatIconButton,
    MatSuffix,
    SharedPipesModule,
    MatIcon,
    MatIconButton,
    MatSuffix,
    IonicModule,
    MatSuffix,
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
