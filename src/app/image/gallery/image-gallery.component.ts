import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { fadeInAnimation } from '@sumaris-net/ngx-components';

export interface Image {
  url?: string;
}

@Component({
  selector: 'app-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss'],
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppImageGalleryComponent
  //implements OnInit, OnDestroy
{

  @Input() images: Image[];

  constructor() {
  }

}
