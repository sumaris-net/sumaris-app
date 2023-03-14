import { NgModule } from '@angular/core';
import { MeasurementsForm } from './measurements.form.component';
import { AppReferentialModule } from '@app/referential/referential.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { AppPmfmFormFieldModule } from '@app/referential/pmfm/field/pmfm.form-field.module';

@NgModule({
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

    // Pipes

    // Components
    MeasurementsForm
  ]
})
export class AppMeasurementModule {

}
