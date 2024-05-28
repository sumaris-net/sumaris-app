import { NgModule } from '@angular/core';
import { CoreModule, ImageGalleryModule } from '@sumaris-net/ngx-components';
import { AppImageAttachmentGallery } from './image-attachment-gallery.component';
import { TranslateModule } from '@ngx-translate/core';
import { AppImageAttachmentsModal } from '@app/data/image/image-attachment.modal';
import { AppSharedModule } from '@app/shared/shared.module';

@NgModule({
  imports: [CoreModule, ImageGalleryModule, TranslateModule.forChild(), AppSharedModule],
  declarations: [
    // Components
    AppImageAttachmentGallery,
    AppImageAttachmentsModal,
  ],
  exports: [
    TranslateModule,
    // Components
    AppImageAttachmentGallery,
    AppImageAttachmentsModal,
  ],
})
export class AppImageAttachmentModule {}
