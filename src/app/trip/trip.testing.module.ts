import {NgModule} from "@angular/core";
import {RouterModule, Routes} from "@angular/router";
import {CommonModule} from "@angular/common";
import {CoreModule}  from "@sumaris-net/ngx-components";
import {BatchTreeTestPage} from "./batch/testing/batch-tree.test";
import {TripModule} from "./trip.module";
import {SharedModule} from "@sumaris-net/ngx-components";
import {TranslateModule} from "@ngx-translate/core";
import {TestingPage} from "@sumaris-net/ngx-components";
import { BatchGroupFormTestPage } from '@app/trip/batch/group/testing/batch-group.form.test';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SampleTreeTestPage } from '@app/trip/sample/testing/sample-tree.test';

export const TRIP_TESTING_PAGES: TestingPage[] = [
  {label: 'Trip module', divider: true},
  {label: 'Batch tree', page: '/testing/trip/batchTree'},
  {label: 'Batch group form', page: '/testing/trip/batchGroupForm'},
  {label: 'Sample tree', page: '/testing/trip/sampleTree'}
];

const routes: Routes = [
  {
    path: 'batchTree',
    pathMatch: 'full',
    component: BatchTreeTestPage
  },
  {
    path: 'batchGroupForm',
    pathMatch: 'full',
    component: BatchGroupFormTestPage
  },
  {
    path: 'sampleTree',
    pathMatch: 'full',
    component: SampleTreeTestPage
  },
];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),
    TripModule,
    MatCheckboxModule,
  ],
  declarations: [
    BatchGroupFormTestPage,
    BatchTreeTestPage,
    SampleTreeTestPage
  ],
  exports: [
    BatchGroupFormTestPage,
    BatchTreeTestPage,
    SampleTreeTestPage
  ]
})
export class TripTestingModule {

}
