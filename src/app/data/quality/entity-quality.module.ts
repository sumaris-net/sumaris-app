import { NgModule } from '@angular/core';
import { EntityQualityFormComponent } from '@app/data/quality/entity-quality-form.component';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppSharedProgressionModule } from '@app/shared/progression/progression.module';
import { QualityFlagToColorPipe } from '@app/data/quality/quality-flag-to-color.pipe';
import { QualityFlagToIconPipe } from '@app/data/quality/quality-flag-to-icon.pipe';
import { QualityFlagInvalidPipe } from '@app/data/quality/quality-flag-invalid.pipe';

@NgModule({
  imports: [
    AppSharedModule,
    AppSharedProgressionModule
  ],
  declarations: [
    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagInvalidPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent
  ],
  exports: [
    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagInvalidPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent
  ]
})
export class AppEntityQualityModule {

}
