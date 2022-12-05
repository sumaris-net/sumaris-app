import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TranslateModule} from '@ngx-translate/core';
import {RouterModule, Routes} from '@angular/router';
import {TestingPage} from '@sumaris-net/ngx-components';
import {ImageAttachmentTestPage} from '@app/data/image/testing/image-attachment.test';
import {AppImageAttachmentTestingModule} from '@app/data/image/testing/image-attachment.testing.module';

export const DATA_TESTING_PAGES: TestingPage[] = [
  {label: 'Data components', divider: true},
  {label: 'Image attachment', page: '/testing/data/image'}
];

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'image'
  },
  {
    path: 'image',
    pathMatch: 'full',
    component: ImageAttachmentTestPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    TranslateModule.forChild(),
    RouterModule.forChild(routes),

    // Sub modules
    AppImageAttachmentTestingModule
  ],
  exports: [
    RouterModule,

    // Sub modules
    AppImageAttachmentTestingModule
  ]
})
export class DataTestingModule {
}
