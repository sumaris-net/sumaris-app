import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { SharedModule } from '@sumaris-net/ngx-components';
import { IonicModule } from '@ionic/angular';
import { AppDataModule } from '@app/data/data.module';
import { RouterModule } from '@angular/router';
import { PhotoPage } from './pages/photo/photo.page';
import { GalleryPage } from './pages/gallery/gallery.page';
import { SearchPage } from './pages/search/search.page';

@NgModule({
  imports: [CommonModule, RouterModule, IonicModule, SharedModule, TranslateModule.forChild(), AppCoreModule, AppDataModule],
  declarations: [PhotoPage, GalleryPage, SearchPage],
  exports: [PhotoPage, GalleryPage, SearchPage],
})
export class PhotoModule {}
