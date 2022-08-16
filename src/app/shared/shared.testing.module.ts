import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SHARED_TESTING_PAGES, SharedModule, SharedTestingModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedReportTestingModule, REPORT_TESTING_PAGES } from '@app/shared/report/report.testing.module';
import { AppSharedMaterialTestingModule, MATERIAL_TESTING_PAGES } from '@app/shared/material/material.testing.module';

export const APP_SHARED_TESTING_PAGES: TestingPage[] = [
  ...SHARED_TESTING_PAGES,
  ...MATERIAL_TESTING_PAGES,
  ...REPORT_TESTING_PAGES
];

const routes: Routes = [
  {
    path: 'material', loadChildren: () => import('./material/material.testing.module').then(m => m.AppSharedMaterialTestingModule)
  },
  {
    path: 'report', loadChildren: () => import('./report/report.testing.module').then(m => m.AppSharedReportTestingModule)
  }
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    SharedTestingModule
  ],
  declarations: [

  ],
  exports: [
  ]
})
export class AppSharedTestingModule {

}
