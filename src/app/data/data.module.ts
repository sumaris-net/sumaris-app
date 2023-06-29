import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { CoreModule } from '@sumaris-net/ngx-components';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { IsMeasurementFormValuesPipe, IsMeasurementModelValuesPipe, MeasurementValueGetPipe } from '@app/data/measurement/measurements.pipe';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { DevicePositionService } from '@app/data/position/device/device-position.service';

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
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    StrategySummaryCardComponent
  ],
  providers: [
    DevicePositionService,
  ],
})
export class AppDataModule {
}
