import { __decorate, __metadata } from "tslib";
import { Injectable, InjectionToken } from '@angular/core';
import { AccountService, BaseEntityService, GraphqlService, PlatformService } from '@sumaris-net/ngx-components';
import { ImageAttachment, ImageAttachmentFilter } from '@app/data/image/image-attachment.model';
import { gql } from '@apollo/client/core';
export const APP_IMAGE_ATTACHMENT_SERVICE = new InjectionToken('ImageAttachmentService');
export const ImageAttachmentFragments = {
    light: gql `fragment LightImageAttachmentFragment on ImageAttachmentVO {
    id
    url
    comments
    updateDate
    creationDate
    __typename
  }`,
    full: gql `fragment ImageAttachmentFragment on ImageAttachmentVO {
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
};
const ImageAttachmentQueries = {
    loadAll: gql `query Images($filter: ImageAttachmentVOInput) {
    data: images(filter: $filter) {
        ...LightImageAttachmentFragment
    }
  }
  ${ImageAttachmentFragments.light}`,
};
let ImageAttachmentService = class ImageAttachmentService extends BaseEntityService {
    constructor(graphql, platform, accountService) {
        super(graphql, platform, ImageAttachment, ImageAttachmentFilter, {
            queries: ImageAttachmentQueries
        });
        this.accountService = accountService;
        console.debug('[image-attachment] Creating service');
    }
    canUserWrite(data, opts) {
        // Only admin can manage images globally
        return super.canUserWrite(data, opts) && this.accountService.isAdmin();
    }
    asFilter(filter) {
        return ImageAttachmentFilter.fromObject(filter);
    }
};
ImageAttachmentService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        AccountService])
], ImageAttachmentService);
export { ImageAttachmentService };
//# sourceMappingURL=image-attachment.service.js.map