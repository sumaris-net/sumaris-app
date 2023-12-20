import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { SamplingLandingPage } from '@app/trip/landing/sampling/sampling-landing.page';
let AppSamplingLandingModule = class AppSamplingLandingModule {
    constructor() {
        console.debug('[sampling-landing] Creating module...');
    }
};
AppSamplingLandingModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            AppDataModule,
            TranslateModule.forChild(),
            // Functional modules
            VesselModule,
            AppReferentialModule,
            AppMeasurementModule,
            AppSampleModule,
            AppLandingModule,
        ],
        declarations: [
            SamplingLandingPage,
        ],
        exports: [
            // Components
            SamplingLandingPage,
        ]
    }),
    __metadata("design:paramtypes", [])
], AppSamplingLandingModule);
export { AppSamplingLandingModule };
//# sourceMappingURL=sampling-landing.module.js.map