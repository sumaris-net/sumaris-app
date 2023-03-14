import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { TranscribingItemTable } from '@app/referential/transcribing/transcribing-item.table';
import {TranscribingItemsModal} from '@app/referential/transcribing/modal/transcribing-items.modal';

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
    TranscribingItemsModal,
    TranscribingItemTable
  ],
  exports: [
    TranslateModule,

    // Pipes

    // Components
    TranscribingItemTable,
    TranscribingItemsModal
  ],
})
export class AppTranscribingModule {
}
