import { NgModule } from '@angular/core';
import { ReferentialToStringPipe } from './referential-to-string.pipe';
import { TranslateModule } from '@ngx-translate/core';
import {
  IsComputedPmfmPipe,
  IsDatePmfmPipe,
  IsMultiplePmfmPipe,
  IsWeightPmfmPipe,
  PmfmFieldStylePipe,
  PmfmIdStringPipe,
  PmfmNamePipe,
  PmfmValueColorPipe,
  PmfmValueIconPipe,
  PmfmValuePipe
} from './pmfms.pipe';

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
    PmfmValueIconPipe,
    IsDatePmfmPipe,
    IsWeightPmfmPipe,
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
    PmfmValueIconPipe,
    IsDatePmfmPipe,
    IsWeightPmfmPipe,
    IsComputedPmfmPipe,
    IsMultiplePmfmPipe,
    PmfmFieldStylePipe,
    WeightFormatPipe,
  ],
})
export class AppReferentialPipesModule {
}
