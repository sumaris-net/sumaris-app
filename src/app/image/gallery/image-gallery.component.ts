import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, Optional } from '@angular/core';
import { fadeInAnimation, isEmptyArray, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { ImageService } from '@app/image/image.service';
import { ImageAttachment, ImageAttachmentFilter } from '@app/image/image.model';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';

@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppImageGalleryComponent<E extends ImageAttachment, F extends ImageAttachmentFilter>
  implements OnInit
  //implements OnInit, OnDestroy
{
  @Input() canEdit: boolean = true;
  @Input() disabled: boolean;
  @Input() showToolbar = true;
  @Input() mobile: boolean;

  @Input() colSize = 4;

  @Input() images: ImageAttachment[];

  get enabled() {
    return !this.disabled;
  }

  constructor(protected dataService: ImageService,
              protected settings: LocalSettingsService,
              protected cd: ChangeDetectorRef,
              @Optional() protected photoViewer?: PhotoViewer
  ) {
  }

  ngOnInit() {
    this.mobile = toBoolean(this.mobile, this.settings.mobile);

    this.dataService.watchAll(0, 10, null, null, null, {})
      .subscribe(({data}) => {
        data = (data || []).reverse();
        this.images = data;
        this.cd.markForCheck();
      })
  }

  async show(event: UIEvent, image: ImageAttachment) {
    if (image.url) {
      this.photoViewer.show(image.url,
        'TODO: set image title',
        {share: true, closeButton: true}
      );
    }
    else {
      console.error('Cannot show a dataUrl image ?');
      this.photoViewer.show(image.dataUrl,
        'Data URL image',
        {share: true, closeButton: true}
      );
    }
  }

  async add(event: UIEvent) {
    const data = await this.dataService.add(event);

    if (isEmptyArray(data)) return;

    console.info(`[image-gallery] Adding new ${data.length} image(s)`, data);
    this.images = [
      ...data,
      ...this.images
    ];
    this.cd.markForCheck();
  }

  toggleMode(event: UIEvent) {

    if (this.colSize === 12) {
      this.colSize = 4;
    }
    else {
      this.colSize = 12;
    }
    this.cd.markForCheck();
  }
}
