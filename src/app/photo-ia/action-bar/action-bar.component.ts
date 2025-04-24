import { Component, Input } from '@angular/core';
import { APP_IMAGE_ATTACHMENT_SERVICE } from '@app/data/image/image-attachment.service';
import { EntityUtils, InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { ImageAttachment, ImageAttachmentFilter } from '@app/data/image/image-attachment.model';

export interface TabButton {
  tab: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
  providers: [
    {
      provide: APP_IMAGE_ATTACHMENT_SERVICE,
      useFactory: () => {
        const service = new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
          equals: ImageAttachment.equals,
          onSort: (data, sortBy = 'rankOrder', sortDirection) => EntityUtils.sort(data, sortBy, sortDirection),
        });
        service.value = [];
        return service;
      },
    },
  ],
})
export class PhotoTabs {
  @Input() disabled: boolean = false;
  @Input() selectedTab: string = 'capture';

  tabs: TabButton[] = [
    {
      tab: 'gallery',
      icon: 'images',
      label: 'Galerie',
    },
    {
      tab: 'capture',
      icon: 'camera',
      label: 'Capture',
    },
    {
      tab: 'search',
      icon: 'search',
      label: 'Recherche',
    },
  ];
}
