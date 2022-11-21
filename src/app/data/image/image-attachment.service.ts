import { Injectable, InjectionToken } from '@angular/core';
import { AccountService, BaseEntityGraphqlQueries, BaseEntityService, GraphqlService, IEntitiesService, PlatformService } from '@sumaris-net/ngx-components';
import { ImageAttachment, ImageAttachmentFilter } from '@app/data/image/image-attachment.model';
import { gql } from '@apollo/client/core';

export const APP_IMAGE_ATTACHMENT_SERVICE = new InjectionToken<IEntitiesService<ImageAttachment, ImageAttachmentFilter>>('ImageAttachmentService');

export const ImageAttachmentFragments = {
  light: gql`fragment LightImageAttachmentFragment on ImageAttachmentVO {
    id
    url
    comments
    updateDate
    creationDate
    __typename
  }`,

  full: gql`fragment ImageAttachmentFragment on ImageAttachmentVO {
    id
    url
    comments
    updateDate
    creationDate
    qualityFlagId
    contentType
    recorderDepartment {
      ...LightDepartmentFragment
    }
    recorderPerson {
      ...LightPersonFragment
    }
    __typename
  }`
}

const ImageAttachmentQueries: BaseEntityGraphqlQueries = {
  loadAll: gql`query Images($filter: ImageAttachmentVOInput) {
    data: images(filter: $filter) {
        ...LightImageAttachmentFragment
    }
  }
  ${ImageAttachmentFragments.light}` ,
}


@Injectable({providedIn: 'root'})
export class ImageAttachmentService extends BaseEntityService<ImageAttachment, ImageAttachmentFilter>
  implements IEntitiesService<ImageAttachment, ImageAttachmentFilter> {

  constructor(graphql: GraphqlService,
              platform: PlatformService,
              protected accountService: AccountService
  ) {
    super(graphql, platform, ImageAttachment, ImageAttachmentFilter, {
      queries: ImageAttachmentQueries
    });
    console.debug('[image-attachment] Creating service');
  }

  canUserWrite(data: ImageAttachment, opts?: any): boolean {
    // Only admin can manage images globally
    return super.canUserWrite(data, opts) && this.accountService.isAdmin();
  }

  asFilter(filter: any) {
    return ImageAttachmentFilter.fromObject(filter);
  }
}
