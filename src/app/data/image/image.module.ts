import {NgModule} from '@angular/core';
import {CoreModule, ImageGalleryModule} from '@sumaris-net/ngx-components';
import {AppImageAttachmentGallery} from './image-attachment-gallery.component';

@NgModule({
  imports: [
    CoreModule,
    ImageGalleryModule,
  ],
  declarations: [
    // Components
    AppImageAttachmentGallery

  ],
  exports: [
    // Components
    AppImageAttachmentGallery
  ]
})
export class AppDataImageModule {

}
