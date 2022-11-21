import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { EntityQualityFormComponent } from './quality/entity-quality-form.component';
import { CoreModule } from '@sumaris-net/ngx-components';
import { QualityFlagToColorPipe } from './services/pipes/quality-flag-to-color.pipe';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';
import { IsMeasurementModelValuesPipe, IsMeasurementFormValuesPipe, MeasurementValueGetPipe } from '@app/data/services/pipes/measurements.pipe';
import {AppImageAttachmentModule} from '@app/data/image/image-attachment.module';

@NgModule({
  imports: [
    CoreModule,
    AppReferentialModule,

    // Sub modules
    AppImageAttachmentModule
  ],
  declarations: [
    // Pipes
    QualityFlagToColorPipe,
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    StrategySummaryCardComponent

  ],
  exports: [
    // Sub modules
    AppImageAttachmentModule,

    // Pipes
    QualityFlagToColorPipe,
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    StrategySummaryCardComponent
  ]
})
export class AppDataModule {

}
