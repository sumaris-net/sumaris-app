import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {EntitiesStorageExplorer} from '@app/shared/entities-storage-explorer/entities-storage-explorer';
import {SharedModule, TestingPage} from '@sumaris-net/ngx-components';
import {RouterModule, Routes} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';

export const ENTITIES_STORAGE_EXPLORER: TestingPage[] = [
  {label: 'Misc', divider: true},
  {label: 'Entities storage explorer', page: '/testing/shared/entities-storage-explorer'}
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: EntitiesStorageExplorer,
  }
];


@NgModule({
  declarations: [
    EntitiesStorageExplorer,
  ],
  imports: [
    CommonModule,
    SharedModule,
    CommonModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
  ],
  exports: [
    EntitiesStorageExplorer,
  ],
})
export class EntitiesStorageExplorerModule { }
