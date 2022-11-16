import {Component, Inject, Input, OnDestroy, OnInit, Self, ViewChild} from '@angular/core';
import {IMAGE_ATTACHMENT_SERVICE_TOKEN} from './image.service';
import {ImageAttachment, ImageAttachmentFilter} from './image.model';
import {Subscription} from 'rxjs';
import {ModalController} from '@ionic/angular';
import {AppImageGalleryComponent, EntitiesTableDataSource, EntityUtils, Image, InMemoryEntitiesService} from '@sumaris-net/ngx-components';
import {TableDataSource} from '@e-is/ngx-material-table';

export interface IImageModalOptions {
  data: ImageAttachment[]
}

@Component({
  selector: 'app-image.modal',
  templateUrl: './image.modal.html',
  styleUrls: ['./image.modal.scss'],
  providers: [
    {
      provide: IMAGE_ATTACHMENT_SERVICE_TOKEN,
      useFactory: () => new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
        equals: EntityUtils.equals
      })
    }
  ]
})
export class AppImageModal implements OnInit, OnDestroy, IImageModalOptions{

  private _subscription = new Subscription();
  readonly dataSource = new EntitiesTableDataSource<ImageAttachment, ImageAttachmentFilter>(ImageAttachment, this.dataService);

  @Input() title = '';

  @Input()
  set data(value: ImageAttachment[]) {
    this.dataService.setValue(value);
  }

  get data(): ImageAttachment[] {
    return this.dataService.value;
  }

  get galleryDataSource(): TableDataSource<Image> {
    return this.dataSource as TableDataSource<Image>;
  }

  @ViewChild('gallery') gallery: AppImageGalleryComponent<ImageAttachment>

  constructor(
    protected modalCtrl: ModalController,
    @Self() @Inject(IMAGE_ATTACHMENT_SERVICE_TOKEN) protected dataService: InMemoryEntitiesService<ImageAttachment, ImageAttachmentFilter>
  ) { }

  ngOnInit() {
    // this._subscription.add(this.dataSource.watchAll(0,100, null, null, null)
    //   .subscribe());
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  close(event?: Event) {
    this.modalCtrl.dismiss();
  }

  async onSubmit(event?: Event) {
    const saved = await this.dataSource.save();
    return this.modalCtrl.dismiss(this.data);
  }
}
