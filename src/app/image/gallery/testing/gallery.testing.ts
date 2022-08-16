import { Component } from '@angular/core';
import { Image } from '@app/image/gallery/image-gallery.component';
import { ConfigService } from '@sumaris-net/ngx-components';
import { BehaviorSubject, Observable } from 'rxjs';


@Component({
  selector: 'app-gallery-test-page',
  templateUrl: './gallery.testing.html'
})
export class GalleryTestPage {

  $images = new BehaviorSubject([]);


  constructor(protected configuration: ConfigService) {
    configuration.config.subscribe(config => {
      const images = config.backgroundImages.map(url => {
        return {url};
      });
      this.$images.next(images);
    })
  }

}
