import { NgModule } from '@angular/core';
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
  PmfmValuePipe,
} from './pmfms.pipe';

import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { WeightFormatPipe } from '@app/referential/pipes/weights.pipe';
import { CorePipesModule } from '@sumaris-net/ngx-components';

@NgModule({
  imports: [CommonModule, TranslateModule.forChild(), AppCoreModule, CorePipesModule],
  declarations: [
    // Pipes
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
    CorePipesModule,

    // Pipes
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
export class AppReferentialPipesModule {}
