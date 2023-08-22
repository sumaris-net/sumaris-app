import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { CoreModule } from '@sumaris-net/ngx-components';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { IsMeasurementFormValuesPipe, IsMeasurementModelValuesPipe, MeasurementValueGetPipe } from '@app/data/measurement/measurements.pipe';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { DevicePositionService } from '@app/data/position/device/device-position.service';
import { AppDataPipesModule } from '@app/data/pipes/pipes.module';

@NgModule({
  imports: [
    CoreModule,
    AppSharedModule,
    AppReferentialModule,

    // Sub modules
    AppImageAttachmentModule,
    AppEntityQualityModule,
    AppDataPipesModule
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
    AppDataPipesModule,

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
