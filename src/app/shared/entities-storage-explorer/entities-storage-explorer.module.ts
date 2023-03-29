import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {EntitiesStorageDumper} from '@app/shared/entities-storage-explorer/entities-storage-dumper.component';
import {SharedModule, TestingPage} from '@sumaris-net/ngx-components';
import {RouterModule, Routes} from '@angular/router';
import {TranslateModule} from '@ngx-translate/core';
import {ForModule} from "@rx-angular/template/for";

export const ENTITIES_STORAGE_EXPLORER: TestingPage[] = [
  {label: 'Misc', divider: true},
  {label: 'Entities storage dumper', page: '/testing/shared/entities-storage-dumper'}
];


const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: EntitiesStorageDumper,
  }
];


@NgModule({
  declarations: [
    EntitiesStorageDumper,
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
    EntitiesStorageDumper,
  ],
})
export class EntitiesStorageExplorerModule { }
