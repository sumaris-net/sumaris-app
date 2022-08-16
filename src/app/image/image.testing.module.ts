import { NgModule } from '@angular/core';
import { CoreModule, TestingPage } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, Routes } from '@angular/router';
import { GalleryTestPage } from '@app/image/gallery/testing/gallery.testing';
import { AppImageModule } from '@app/image/image.module';

export const IMAGE_TESTING_PAGES: TestingPage[] = [
  {label: 'Image components', divider: true},
  {label: 'Image gallery', page: '/testing/image/gallery'}
];

const routes: Routes = [
  {
    path: 'gallery',
    pathMatch: 'full',
    component: GalleryTestPage
  },
]

@NgModule({
  imports: [
    CoreModule,
    AppImageModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
  ],
  declarations: [
    // Components
    GalleryTestPage
  ],
  exports: [
    RouterModule,

    // Components
    GalleryTestPage
  ]
})
export class ImageTestingModule {

}
