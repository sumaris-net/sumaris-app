import { NgModule } from '@angular/core';
import { SoftwarePage } from './software.page';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppTranscribingModule } from '@app/referential/transcribing/transcribing.module';
import { AppReferentialFormModule } from '@app/referential/form/referential-form.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppReferentialTableModule } from '@app/referential/table/referential-table.module';

@NgModule({
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
export class AppSoftwareModule {
}
