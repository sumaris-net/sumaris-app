import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CoreModule, SHARED_TESTING_PAGES, SharedModule, SharedTestingModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { REPORT_TESTING_PAGES } from '@app/shared/report/report.testing.module';
import { MATERIAL_TESTING_PAGES } from '@app/shared/material/material.testing.module';
import {EntitiesStorageExplorerModule} from '@app/shared/entities-storage-explorer/entities-storage-explorer.module';

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
  },
  {
    path: 'entities-storage-explorer', loadChildren: () => import('./entities-storage-explorer/entities-storage-explorer.module').then(m => m.EntitiesStorageExplorerModule)
  },
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    SharedTestingModule,
    EntitiesStorageExplorerModule,
  ],
  declarations: [

  ],
  exports: [
  ]
})
export class AppSharedTestingModule {

}
