import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { CoreModule } from '@sumaris-net/ngx-components';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { IsMeasurementFormValuesPipe, IsMeasurementModelValuesPipe, MeasurementValueGetPipe } from '@app/data/services/pipes/measurements.pipe';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { StatusToColorPipe } from '@app/data/services/pipes/status-to-color.pipe';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';

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
