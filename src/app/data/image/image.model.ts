import {Entity, EntityClass, EntityFilter, Image} from '@sumaris-net/ngx-components';


@EntityClass({ typename: 'ImageAttachmentVO' })
export class ImageAttachment extends Entity<ImageAttachment> implements Image {

  static fromObject: (source: any, opts?: any) => ImageAttachment;

  static equals(s1: ImageAttachment, s2: ImageAttachment, opts: any) {
    return s1 && s2 && s1.id === s2.id
      // Or
      || (
        // Same xxx attribute
        false
      );
  }

  constructor() {
    super(ImageAttachment.TYPENAME);
  }

  dataUrl: string = null;
  url: string = null;
  title: string = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.url = source.url;
    this.dataUrl = source.dataUrl;
    this.title = source.title;
  }
}


@EntityClass({ typename: 'ImageAttachmentFilterVO' })
export class ImageAttachmentFilter extends EntityFilter<ImageAttachmentFilter, ImageAttachment> {

  static fromObject: (source: any, opts?: any) => ImageAttachmentFilter;

}
