import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { TranscribingItemTable } from '@app/referential/transcribing/transcribing-item.table';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    AppCoreModule
  ],
  declarations: [
    // Pipes

    // Components
    TranscribingItemTable
  ],
  exports: [
    TranslateModule,

    // Pipes

    // Components
    TranscribingItemTable
  ],
})
export class AppTranscribingModule {
}
