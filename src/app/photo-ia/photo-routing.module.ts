import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { PhotoModule } from './photo.module';
import { PhotoTabs } from './action-bar/action-bar.component';
import { PhotoPage } from './pages/photo/photo.page';
import { GalleryPage } from './pages/gallery/gallery.page';
import { SearchPage } from './pages/search/search.page';
import { ComponentDirtyGuard } from '@sumaris-net/ngx-components';

const routes: Routes = [
  {
    path: '',
    component: PhotoTabs,
    children: [
      {
        path: '',
        redirectTo: 'capture',
        pathMatch: 'full',
      },
      {
        path: 'capture',
        component: PhotoPage,
        canDeactivate: [ComponentDirtyGuard],
      },
      {
        path: 'gallery',
        component: GalleryPage,
      },
      {
        path: 'search',
        component: SearchPage,
      },
    ],
  },
];

@NgModule({
  imports: [PhotoModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PhotoRoutingModule {}
