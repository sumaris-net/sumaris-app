import { NgModule } from '@angular/core';
import { ReferentialToStringPipe } from './referential-to-string.pipe';
import { TranslateModule } from '@ngx-translate/core';
import { IsComputedPmfmPipe, IsDatePmfmPipe, IsMultiplePmfmPipe, PmfmFieldStylePipe, PmfmIdStringPipe, PmfmNamePipe, PmfmValueColorPipe, PmfmValuePipe } from './pmfms.pipe';

import { TextMaskModule } from 'angular2-text-mask';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { WeightFormatPipe } from '@app/referential/pipes/weights.pipe';

@NgModule({
  imports: [
    CommonModule,
    TextMaskModule,
    TranslateModule.forChild(),

    AppCoreModule,
  ],
  declarations: [
    // Pipes
    ReferentialToStringPipe,
    PmfmIdStringPipe,
    PmfmNamePipe,
    PmfmValuePipe,
    PmfmValueColorPipe,
    IsDatePmfmPipe,
    IsComputedPmfmPipe,
    IsMultiplePmfmPipe,
    PmfmFieldStylePipe,
    WeightFormatPipe,
  ],
  exports: [
    TranslateModule,

    // Pipes
    ReferentialToStringPipe,
    PmfmIdStringPipe,
    PmfmNamePipe,
    PmfmValuePipe,
    PmfmValueColorPipe,
    IsDatePmfmPipe,
    IsComputedPmfmPipe,
    IsMultiplePmfmPipe,
    PmfmFieldStylePipe,
    WeightFormatPipe,
  ],
})
export class AppReferentialPipesModule {
}
