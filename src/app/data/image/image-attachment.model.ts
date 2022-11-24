import { Department, Entity, EntityAsObjectOptions, EntityClass, EntityFilter, fromDateISOString, Image, isNotNil, Person, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { StoreObject } from '@apollo/client/core';
import { Moment } from 'moment';
import { DataEntity } from '@app/data/services/model/data-entity.model';

export class ImageAttachmentComparators {
  static sortByIdOrRankOrder(n1: ImageAttachment, n2: ImageAttachment): number {
    const d1 = toNumber(n1.id, n1.rankOrder);
    const d2 = toNumber(n2.id, n2.rankOrder);
    return d1 === d2 ? 0 : d1 > d2 ? 1 : -1;
  }
}

@EntityClass({ typename: 'ImageAttachmentVO' })
export class ImageAttachment extends DataEntity<ImageAttachment>
  implements Image {

  static fromObject: (source: any, opts?: any) => ImageAttachment;

  static fillRankOrder(images: ImageAttachment[]) {
    // Make sure to set a rankOrder (keep original order)
    // This is need by the equals() function
    images.map((image, index) => {
      image.rankOrder = index+1;
    });
  }

  static equals(s1: ImageAttachment, s2: ImageAttachment) {
    return isNotNil(s1.id) && s1.id === s2.id
      // Or functional equals
      || (
        // Same xxx attribute
        s1.rankOrder === s2.rankOrder
        && s1.comments === s2.comments
      );
  }

  static isEmpty(source: ImageAttachment) {
    return !source.url && !source.comments && !source.dataUrl;
  }

  constructor() {
    super(ImageAttachment.TYPENAME);
  }

  url: string = null;
  dataUrl: string = null;
  comments: string = null;
  dateTime: Moment = null;
  rankOrder: number = null;

  creationDate: Moment = null;
  recorderPerson: Person;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.url = source.url;
    this.dataUrl = source.dataUrl;
    this.comments = source.comments;
    this.dateTime = fromDateISOString(source.dateTime);
    this.creationDate = fromDateISOString(source.creationDate);
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
    this.rankOrder = source.rankOrder;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || undefined;

    // For pod
    if (opts.keepLocalId === false) {
      // Reset unused attributes
      delete target.rankOrder;
    }
    return target;
  }

  get title(): string {
    return this.comments;
  }

  set title(value: string) {
    this.comments = value;
  }
}


@EntityClass({ typename: 'ImageAttachmentFilterVO' })
export class ImageAttachmentFilter extends EntityFilter<ImageAttachmentFilter, ImageAttachment> {

  static fromObject: (source: any, opts?: any) => ImageAttachmentFilter;

}
