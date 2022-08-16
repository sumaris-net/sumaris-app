import { NgModule } from '@angular/core';
import { AppReferentialModule } from '../referential/referential.module';
import { EntityQualityFormComponent } from './quality/entity-quality-form.component';
import { CoreModule } from '@sumaris-net/ngx-components';
import { QualityFlagToColorPipe } from './services/pipes/quality-flag-to-color.pipe';
import { StrategySummaryCardComponent } from './strategy/strategy-summary-card.component';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';

@NgModule({
  imports: [
    CoreModule,
    AppReferentialModule

    // Sub modules
  ],
  declarations: [
    // Pipes
    QualityFlagToColorPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    StrategySummaryCardComponent

  ],
  exports: [

    // Pipes
    QualityFlagToColorPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    StrategySummaryCardComponent
  ]
})
export class AppDataModule {

}
