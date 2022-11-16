import {Injectable, InjectionToken} from '@angular/core';
import {Platform} from '@ionic/angular';
import {
  AppValidatorService,
  BaseEntityGraphqlQueries,
  EntitiesServiceWatchOptions,
  EntityUtils,
  IEntitiesService,
  isNil,
  isNotNil,
  LoadResult, SharedValidators,
  StartableService, toBoolean,
  toNumber
} from '@sumaris-net/ngx-components';
import {ImageAttachment, ImageAttachmentFilter} from '@app/data/image/image.model';
import {SortDirection} from '@angular/material/sort';
import {map} from 'rxjs/operators';
import {BehaviorSubject, Observable} from 'rxjs';
import {ExtractionProduct} from '@app/extraction/product/product.model';
import {Validators} from '@angular/forms';

export const IMAGE_ATTACHMENT_SERVICE_TOKEN = new InjectionToken<IEntitiesService<ImageAttachment, ImageAttachmentFilter>>('ImageAttachmentService');


const queries: BaseEntityGraphqlQueries = {
  loadAll: null,
}


@Injectable({providedIn: 'root'})
export class ImageAttachmentValidator extends AppValidatorService {

  getFormGroupConfig(data?: any): { [p: string]: any } {
    return {
      __typename: ImageAttachment.TYPENAME,
      id: [data?.id || null],
      url: [data?.url || null],
      dataUrl: [data?.dataUrl || null],
      title: [data?.title || null, Validators.maxLength(255)],
      updateDate: [data && data.updateDate || null]
    };
  }
}
