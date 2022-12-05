import { NgModule } from '@angular/core';
import { CoreModule, ImageGalleryModule } from '@sumaris-net/ngx-components';
import { AppImageAttachmentGallery } from './image-attachment-gallery.component';
import { TranslateModule } from '@ngx-translate/core';
import { AppImageAttachmentsModal } from '@app/data/image/image-attachment.modal';

@NgModule({
  imports: [
    CoreModule,
    ImageGalleryModule,
    TranslateModule.forChild()
  ],
  declarations: [
    // Components
    AppImageAttachmentGallery,
    AppImageAttachmentsModal

  ],
  exports: [
    TranslateModule,
    // Components
    AppImageAttachmentGallery,
    AppImageAttachmentsModal
  ]
})
export class AppImageAttachmentModule {

}
