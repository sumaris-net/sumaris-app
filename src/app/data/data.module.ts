import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { CoreModule } from '@sumaris-net/ngx-components';
import { QualityFlagToColorPipe } from './services/pipes/quality-flag-to-color.pipe';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { IsMeasurementFormValuesPipe, IsMeasurementModelValuesPipe, MeasurementValueGetPipe } from '@app/data/services/pipes/measurements.pipe';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { StatusToColorPipe } from '@app/data/services/pipes/status-to-color.pipe';
import { QualityFlagToIconPipe } from '@app/data/services/pipes/quality-flag-to-icon.pipe';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import {QualityFlagInvalidPipe} from '@app/data/services/pipes/quality-flag-invalid.pipe';

@NgModule({
  imports: [
    CoreModule,
    AppSharedModule,
    AppReferentialModule,

    // Sub modules
    AppImageAttachmentModule,
    AppEntityQualityModule
  ],
  declarations: [
    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagInvalidPipe,
    StatusToColorPipe,
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    StrategySummaryCardComponent

  ],
  exports: [
    // Sub modules
    AppImageAttachmentModule,
    AppEntityQualityModule,

    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagInvalidPipe,
    StatusToColorPipe,
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    StrategySummaryCardComponent
  ]
})
export class AppDataModule {

}
