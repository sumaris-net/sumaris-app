import { NgModule } from '@angular/core';
import { MeasurementsForm } from './measurements.form.component';
import { AppReferentialModule } from '@app/referential/referential.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),

    // App module
    AppCoreModule,
    AppReferentialModule
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
