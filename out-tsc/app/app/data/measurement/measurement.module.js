import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { MeasurementsForm } from './measurements.form.component';
import { AppReferentialModule } from '@app/referential/referential.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';
let AppMeasurementModule = class AppMeasurementModule {
};
AppMeasurementModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            // App module
            AppCoreModule,
            AppReferentialModule,
            AppPmfmFormFieldModule
        ],
        declarations: [
            MeasurementsForm
        ],
        exports: [
            // Modules
            TranslateModule,
            AppPmfmFormFieldModule,
            // Pipes
            // Components
            MeasurementsForm
        ]
    })
], AppMeasurementModule);
export { AppMeasurementModule };
//# sourceMappingURL=measurement.module.js.map