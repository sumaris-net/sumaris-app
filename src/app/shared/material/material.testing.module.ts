import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSamplingRatioTestPage } from '@app/shared/material/sampling-ratio/testing/sampling-ratio.test';
import { MatSamplingRatioFieldModule } from '@app/shared/material/sampling-ratio/material.sampling-ratio.module';

export const MATERIAL_TESTING_PAGES: TestingPage[] = [
  {label: 'Sampling ratio field', page: '/testing/shared/material/samplingRatio'}
];

const routes: Routes = [
  {
    path: 'samplingRatio',
    pathMatch: 'full',
    component: AppSamplingRatioTestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    MatSamplingRatioFieldModule
  ],
  declarations: [
    AppSamplingRatioTestPage
  ],
  exports: [
    AppSamplingRatioTestPage
  ]
})
export class AppSharedMaterialTestingModule {

}
