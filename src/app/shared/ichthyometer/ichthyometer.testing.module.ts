import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { IchthyometerTestingPage } from '@app/shared/ichthyometer/testing/ichthyometer.testing';
import { AppIchthyometerModule } from '@app/shared/ichthyometer/ichthyometer.module';
import { AppSharedModule } from '@app/shared/shared.module';

export const ICHTHYOMETER_TESTING_PAGES: TestingPage[] = [
  {label: 'Ichthyometer', page: '/testing/shared/ichthyometer'}
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: IchthyometerTestingPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    AppSharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    AppIchthyometerModule
  ],
  declarations: [
    IchthyometerTestingPage
  ],
  exports: [
    IchthyometerTestingPage
  ]
})
export class AppIchthyometerTestingModule {

}
