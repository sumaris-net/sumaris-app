import { NgModule } from '@angular/core';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/trip/measurement/measurement.module';
import { AppSampleModule } from '@app/trip/sample/sample.module';
import { AppLandingModule } from '@app/trip/landing/landing.module';
import { SamplingLandingPage } from '@app/trip/landing/sampling/sampling-landing.page';
import { SamplingLandingReport } from '@app/trip/landing/sampling/sampling-landing.report';


@NgModule({
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
    SamplingLandingReport
  ],
  exports: [
    // Components
    SamplingLandingPage,
    SamplingLandingReport
  ]
})
export class AppSamplingLandingModule {

  constructor() {
    console.debug('[sampling-landing] Creating module...');
  }
}
