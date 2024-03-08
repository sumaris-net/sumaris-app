import { __decorate } from "tslib";
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
let AppEntityQualityModule = class AppEntityQualityModule {
};
AppEntityQualityModule = __decorate([
    NgModule({
        imports: [AppSharedModule, AppSharedProgressionModule],
        declarations: [
            // Pipes
            QualityFlagToColorPipe,
            QualityFlagToIconPipe,
            QualityFlagToI18nPipe,
            QualityFlagInvalidPipe,
            QualityFlagValidPipePipe,
            // Components
            EntityQualityFormComponent,
            EntityQualityIconComponent,
        ],
        exports: [
            // Pipes
            QualityFlagToColorPipe,
            QualityFlagToIconPipe,
            QualityFlagToI18nPipe,
            QualityFlagInvalidPipe,
            QualityFlagValidPipePipe,
            // Components
            EntityQualityFormComponent,
            EntityQualityIconComponent,
        ],
    })
], AppEntityQualityModule);
export { AppEntityQualityModule };
//# sourceMappingURL=entity-quality.module.js.map