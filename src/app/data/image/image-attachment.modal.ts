import { Component, Inject, Input, OnDestroy, OnInit, Self, ViewChild } from '@angular/core';
import { APP_IMAGE_ATTACHMENT_SERVICE } from './image-attachment.service';
import { ImageAttachment, ImageAttachmentFilter } from './image-attachment.model';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { EntityUtils, InMemoryEntitiesService, toBoolean } from '@sumaris-net/ngx-components';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';

export interface IImageModalOptions {
  data: ImageAttachment[]
}

@Component({
  selector: 'app-image-attachment-modal',
  templateUrl: './image-attachment.modal.html',
  styleUrls: ['./image-attachment.modal.scss'],
  providers: [
    {
      provide: APP_IMAGE_ATTACHMENT_SERVICE,
      useFactory: () => new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
        equals: EntityUtils.equals
      })
    }
  ]
})
export class AppImageAttachmentsModal implements OnInit, OnDestroy, IImageModalOptions{

  private _subscription = new Subscription();

  @Input() title = '';
  @Input() disabled: boolean;

  @Input() data: ImageAttachment[];

  get loading(): boolean {
    return false;
  }
  get invalid(): boolean {
    return false;
  }
  get valid(): boolean {
    return !this.invalid;
  }

  @ViewChild('gallery', {static: true}) gallery: AppImageAttachmentGallery;

  constructor(
    protected modalCtrl: ModalController,
    @Self() @Inject(APP_IMAGE_ATTACHMENT_SERVICE) protected dataService: InMemoryEntitiesService<ImageAttachment, ImageAttachmentFilter>
  ) { }

  ngOnInit() {
    // Default values
    this.disabled = toBoolean(this.disabled, false);

    // Set value
    this.gallery.markAsReady();
    this.gallery.value = this.data;
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  cancel(event?: Event) {
    this.modalCtrl.dismiss();
  }

  close(event?: Event) {
    this.cancel(event);
  }

  async onSubmit(event?: Event) {
    if (this.disabled) return this.cancel();

    if (this.gallery.dirty) {
      const saved = await this.gallery.save();
      if (!saved) return; // Stop
    }

    this.data = this.gallery.value;
    return this.modalCtrl.dismiss(this.data);
  }
}
