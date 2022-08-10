import { ModuleWithProviders, NgModule } from '@angular/core';
import { CoreModule, SharedModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppImageGalleryComponent } from '@app/image/gallery/image-gallery.component';
import { ImagePicker } from '@ionic-native/image-picker/ngx';
import { MediaCapture } from '@ionic-native/media-capture/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';

@NgModule({
  imports: [
    CoreModule,
    SharedModule,
    TranslateModule.forChild(),
  ],
  declarations: [
    // Components
    AppImageGalleryComponent
  ],
  exports: [
    // Components
    AppImageGalleryComponent
  ]
})
export class AppImageModule {
  static forRoot(): ModuleWithProviders<AppImageModule> {
    console.debug('[image] Creating module (root)');

    return {
      ngModule: AppImageModule,
      providers: [
        ImagePicker,
        MediaCapture,
        PhotoViewer
      ]
    };
  }
}
