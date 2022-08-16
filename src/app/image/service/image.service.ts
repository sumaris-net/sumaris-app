import { Injectable } from '@angular/core';
import { ImagePicker } from '@ionic-native/image-picker/ngx';
import { MediaCapture } from '@ionic-native/media-capture/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { ActionSheetController } from '@ionic/angular';
import { PlatformService, StartableService } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';

const MEDIA_FOLDER_NAME = 'my_media';

@Injectable({providedIn: 'root'})
export class ImageService extends StartableService {

  constructor(
    private platform: PlatformService,
    private imagePicker: ImagePicker,
    private mediaCapture: MediaCapture,
    private photoViewer: PhotoViewer,
    private actionSheetController: ActionSheetController
  ) {
    super(platform);
    this._debug = !environment.production;
    if (this._debug) console.debug('[image] Creating service');
  }

  protected async ngOnStart(): Promise<any> {
    console.info('[image] Starting...');

  }
}
