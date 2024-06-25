import { NgModule } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { TranslateModule } from '@ngx-translate/core';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { GearPhysicalFeaturesTable } from './gear-physical-features.table';

@NgModule({
  imports: [
    AppCoreModule,
    TranslateModule.forChild(),
    AppReferentialPipesModule,
    AppPmfmFormFieldModule,
    AppEntityQualityModule,
    AppExtractionButtonModule,
  ],
  declarations: [GearPhysicalFeaturesTable],
  exports: [GearPhysicalFeaturesTable],
})
export class AppGearPhysicalFeaturesTableModule {}
