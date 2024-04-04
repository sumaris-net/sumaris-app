import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { CoreModule, MessageModule } from '@sumaris-net/ngx-components';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { IsMeasurementFormValuesPipe, IsMeasurementModelValuesPipe, MeasurementValueGetPipe } from '@app/data/measurement/measurements.pipe';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { DevicePositionService } from '@app/data/position/device/device-position.service';
import { AppDataEntityPipesModule } from '@app/data/pipes/pipes.module';
import { AppDataEditorDebugButtonComponent } from '@app/data/form/data-editor-debug-button/data-editor-debug-button.component';

@NgModule({
  imports: [
    CoreModule,
    AppSharedModule,
    AppReferentialModule,

    // Sub modules
    AppImageAttachmentModule,
    AppEntityQualityModule,
    AppDataEntityPipesModule,
    MessageModule,
  ],
  declarations: [
    // Pipes
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    StrategySummaryCardComponent,
    AppDataEditorDebugButtonComponent,
  ],
  exports: [
    // Sub modules
    AppImageAttachmentModule,
    AppEntityQualityModule,
    AppDataEntityPipesModule,

    // Pipes
    IsMeasurementFormValuesPipe,
    IsMeasurementModelValuesPipe,
    MeasurementValueGetPipe,

    // Components
    StrategySummaryCardComponent,
    AppDataEditorDebugButtonComponent,
  ],
  providers: [DevicePositionService],
})
export class AppDataModule {}
