import { NgModule } from '@angular/core';
import { EntityQualityFormComponent } from '@app/data/quality/entity-quality-form.component';
import { EntityQualityIconComponent } from '@app/data/quality/entity-quality-icon.component';
import { AppSharedModule } from '@app/shared/shared.module';
import { AppSharedProgressionModule } from '@app/shared/progression/progression.module';
import { QualityFlagToColorPipe } from '@app/data/quality/quality-flag-to-color.pipe';
import { QualityFlagToIconPipe } from '@app/data/quality/quality-flag-to-icon.pipe';
import { QualityFlagInvalidPipe } from '@app/data/quality/quality-flag-invalid.pipe';
import { QualityFlagValidPipePipe } from '@app/data/quality/quality-flag-not-invalid.pipe';
import { QualityFlagToI18nPipe } from '@app/data/quality/quality-flag-to-i18n.pipe';
import { QualityFlagBadPipe } from '@app/data/quality/quality-flag-bad.pipe';
import { EntityQualityBadgeComponent } from '@app/data/quality/entity-quality-badge.component';

@NgModule({
  imports: [AppSharedModule, AppSharedProgressionModule],
  declarations: [
    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagToI18nPipe,
    QualityFlagInvalidPipe,
    QualityFlagValidPipePipe,
    QualityFlagBadPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    EntityQualityBadgeComponent,
  ],
  exports: [
    // Pipes
    QualityFlagToColorPipe,
    QualityFlagToIconPipe,
    QualityFlagToI18nPipe,
    QualityFlagInvalidPipe,
    QualityFlagValidPipePipe,
    QualityFlagBadPipe,

    // Components
    EntityQualityFormComponent,
    EntityQualityIconComponent,
    EntityQualityBadgeComponent,
  ],
})
export class AppEntityQualityModule {}
