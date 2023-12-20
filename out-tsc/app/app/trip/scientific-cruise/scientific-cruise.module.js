import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppSocialModule } from '@app/social/social.module';
import { A11yModule } from '@angular/cdk/a11y';
import { AppCoreModule } from '@app/core/core.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppDataModule } from '@app/data/data.module';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppExtractionButtonModule } from '@app/extraction/button/extraction-button.module';
import { ScientificCruiseTable } from '@app/trip/scientific-cruise/scientific-cruise.table';
let AppScientificCruiseModule = class AppScientificCruiseModule {
    constructor() {
        console.debug('[scientific-cruise] Creating module...');
    }
};
AppScientificCruiseModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            AppSocialModule,
            A11yModule,
            // App module
            AppCoreModule,
            AppReferentialModule,
            AppDataModule,
            VesselModule,
            AppExtractionButtonModule,
        ],
        declarations: [ScientificCruiseTable],
        exports: [
            // Components
            ScientificCruiseTable,
        ],
    }),
    __metadata("design:paramtypes", [])
], AppScientificCruiseModule);
export { AppScientificCruiseModule };
//# sourceMappingURL=scientific-cruise.module.js.map