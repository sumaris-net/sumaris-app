import { Entity, EntityClass, EntityFilter } from '@sumaris-net/ngx-components';


@EntityClass({ typename: 'ImageAttachmentVO' })
export class ImageAttachment extends Entity<ImageAttachment> {

  static fromObject: (source: any, opts?: any) => ImageAttachment;

  dataUrl: string = null;
  url: string = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.url = source.url;
    this.dataUrl = source.dataUrl;
  }
}

@EntityClass({ typename: 'ImageAttachmentFilterVO' })
export class ImageAttachmentFilter extends EntityFilter<ImageAttachmentFilter, ImageAttachment> {

  static fromObject: (source: any, opts?: any) => ImageAttachmentFilter;

  // TODO
}
