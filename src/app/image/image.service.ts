import { Injectable } from '@angular/core';
import { ImagePicker, OutputType } from '@ionic-native/image-picker/ngx';
import { MediaCapture } from '@ionic-native/media-capture/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { ActionSheetButton, ActionSheetController, PopoverController } from '@ionic/angular';
import {
  BaseEntityGraphqlQueries,
  BaseEntityService,
  ConfigService,
  EntitiesServiceWatchOptions,
  FileService,
  FilesUtils,
  GraphqlService,
  IEntitiesService,
  ImagesUtils,
  isEmptyArray,
  LoadResult,
  LocalSettingsService,
  PlatformService,
  toNumber
} from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { ImageAttachment, ImageAttachmentFilter } from '@app/image/image.model';
import { SortDirection } from '@angular/material/sort';
import { map, mergeMap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { CaptureError, MediaFile } from '@ionic-native/media-capture';

const MEDIA_FOLDER_NAME = 'my_media';

const queries: BaseEntityGraphqlQueries = {
  loadAll: null,
}

@Injectable({providedIn: 'root'})
export class ImageService extends BaseEntityService<ImageAttachment, ImageAttachmentFilter>
  implements IEntitiesService<ImageAttachment, ImageAttachmentFilter> {

  private maxHeight = 1024;
  private maxWidth = 1024;

  constructor(graphql: GraphqlService,
              platform: PlatformService,
              private settings: LocalSettingsService,
              private translate: TranslateService,
              private file: FileService,
              private popoverController: PopoverController,
              private imagePicker: ImagePicker,
              private mediaCapture: MediaCapture,
              private actionSheetController: ActionSheetController,
              // TODO remove
              protected configuration: ConfigService
  ) {
    super(graphql, platform, ImageAttachment, ImageAttachmentFilter, {
      queries
    });
    this._debug = !environment.production;
    if (this._debug) console.debug('[image] Creating service');
  }

  protected async ngOnStart(): Promise<any> {
    console.info('[image] Starting...');

  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: ImageAttachmentFilter, opts?: EntitiesServiceWatchOptions & { query?: any }): Observable<LoadResult<ImageAttachment>> {
    // TODO remove this
    return this.configuration.config
      .pipe(
        // mergeMap( config => {
        //
        //   }
        // )
        map(config => {
          const data = config.backgroundImages.map(url => ImageAttachment.fromObject({url}));
          return {data, total: data.length};
        })
      );
    //return super.watchAll(offset, size, sortBy, sortDirection, filter, opts);
  }

  async add(event?: UIEvent): Promise<ImageAttachment[]|undefined> {

    // If desktop: open upload popover
    if (!this.platform.isCordova()) {
      return this.addUploadedImages(event);
    }

    const sheet = await this.actionSheetController.create({
      backdropDismiss: true,
      //header: this.translate.instant('IMAGE.SELECT_SOURCE_HELP'),
      buttons: [
        <ActionSheetButton>{
          role: 'camera',
          text: this.translate.instant('IMAGE.BTN_CAMERA_SOURCE'),
          icon: 'camera'
        },
        <ActionSheetButton>{
          role: 'gallery',
          text: this.translate.instant('IMAGE.BTN_GALLERY_SOURCE'),
          icon: 'images'
        },
        // <ActionSheetButton>{
        //   text: this.translate.instant('COMMON.BTN_CANCEL'),
        //   role: 'cancel'
        // }
      ]
    });
    await sheet.present()
    const {role} = await sheet.onDidDismiss();
    if (!role || role === 'backdrop') return; // Skip

    console.debug('[image-service] User has select source: ' + role);
    switch (role) {
      case 'camera':
        const cameraImage = await this.addImageFromCamera();
        return [cameraImage]
      case 'gallery':
        const galleryImage = await this.addImageFromGallery();
        return [galleryImage];
    }
  }

  protected async addUploadedImages(event?: UIEvent): Promise<ImageAttachment[]|undefined> {
    const { data } = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.png',
      instantUpload: true,
      uploadFn: (file) => ImagesUtils.readAsDataURL(file, {
        maxWidth: this.maxWidth,
        maxHeight: this.maxHeight
      })
    });

    if (isEmptyArray(data)) return; // No files uploaded: skip
    return (data || [])
      .map(file => file.response.body) // Get response body = data as base64
      .map(dataUrl => ImageAttachment.fromObject({dataUrl}));
  }

  protected async addImageFromCamera(opts?: {outputType?: number}): Promise<ImageAttachment|undefined> {

    console.info('[image-service] Capturing new image from camera...');

    const outputType = toNumber(opts?.outputType, OutputType.DATA_URL);

    const file: MediaFile = await this.mediaCapture.captureImage({
      limit: 1
    }).then(
      (data: MediaFile[]) => {
        return data && data[0];
      },
      (err: CaptureError) => {
        console.error(`[image-service] Failed to capture new image - Error code: ${err?.code ||  'unknown'}`);
        return undefined;
      }
    );

    if (!file?.fullPath) return; // Skip
    console.info('[image-service] new picture path:' + file.fullPath);

    try {
      switch (outputType) {
        case OutputType.FILE_URL:
          return ImageAttachment.fromObject({
            url: file.fullPath
          });
        case OutputType.DATA_URL:
          console.info(`[image-service] Converting file ${file.fullPath} into dataUrl...`);
          const dataUrl = await ImagesUtils.readAndResizeFromUrl(file.fullPath, {
            maxWidth: this.maxWidth,
            maxHeight: this.maxHeight
          });
          return ImageAttachment.fromObject({ dataUrl });
        default:
          throw new Error("Unknown outputType: " + outputType);
      }
    }
    catch (err) {
      console.error('[image-service] Failed while processing image', err);
      return undefined;
    }
  }

  protected async addImageFromGallery(opts?: {outputType?: number}): Promise<ImageAttachment|undefined> {

    const outputType = toNumber(opts?.outputType, OutputType.DATA_URL);

    // Make sure to have read permission
    let canReadPictures = await this.imagePicker.hasReadPermission();
    if (!canReadPictures) {
      try {
        await this.imagePicker.requestReadPermission();
        canReadPictures = await this.imagePicker.hasReadPermission();
        if (!canReadPictures) {
          console.error('No read permission, after calling requestReadPermission() without error!! skip');
          return;
        }
      }
      catch(err) {
        console.error(err);
        return; // Cancelled
      }
    }

    try {

      const data = await this.imagePicker.getPictures({
        maximumImagesCount: 1,
        //height: this._maxImageHeight
        allow_video: false,
        outputType
      });

      if (!data) return; // Cancelled

      console.debug('[image-service] Selected picture: ', data);

      switch (outputType) {
        case OutputType.FILE_URL:
          return ImageAttachment.fromObject({
            url: data
          });
        case OutputType.DATA_URL:
          return ImageAttachment.fromObject({
            dataUrl: data
          });
        default:
          throw new Error("Unknown outputType: " + outputType);
      }
    }
    catch(err) {
      console.error('[image-service] Failed to get image from gallery', err);
      return undefined;
    }
  }
}
