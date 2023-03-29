import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {StorageExplorer} from '@app/shared/storage/storage-explorer.component';
import {SharedModule, TestingPage} from '@sumaris-net/ngx-components';
import {RouterModule, Routes} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';
import {ForModule} from "@rx-angular/template/for";

export const ENTITIES_STORAGE_EXPLORER: TestingPage[] = [
  {label: 'Misc', divider: true},
  {label: 'Storage explorer', page: '/testing/shared/storage'}
];


const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: StorageExplorer,
  }
];


@NgModule({
  declarations: [
    StorageExplorer,
  ],
    imports: [
        CommonModule,
        SharedModule,
        CommonModule,
        TranslateModule.forChild(),
        RouterModule.forChild(routes),
        ForModule,
    ],
  exports: [
    StorageExplorer,
  ],
})
export class StorageExplorerModule { }
