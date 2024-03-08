import {
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  fromDateISOString,
  Image,
  isNil,
  isNotNil,
  Person,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
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
export class ImageAttachment extends DataEntity<ImageAttachment> implements Image {
  static fromObject: (source: any, opts?: any) => ImageAttachment;

  static fillRankOrder(images: ImageAttachment[]) {
    // Make sure to set a rankOrder (keep original order)
    // This is need by the equals() function
    images.map((image, index) => {
      image.rankOrder = index + 1;
    });
  }

  static equals(s1: ImageAttachment, s2: ImageAttachment) {
    return (
      (isNotNil(s1.id) && s1.id === s2.id) ||
      // Or functional equals
      // Same object
      (((isNil(s1.objectId) && isNil(s1.objectTypeId)) || (s1.objectId === s2.objectId && s1.objectTypeId === s2.objectTypeId)) &&
        // Same rankOrder and comment
        s1.rankOrder === s2.rankOrder &&
        s1.comments === s2.comments)
    );
  }

  static isEmpty(source: ImageAttachment) {
    return !source.url && !source.comments && !source.dataUrl;
  }

  constructor() {
    super(ImageAttachment.TYPENAME);
  }

  objectId: number = null;
  objectTypeId: number = null;
  url: string = null;
  dataUrl: string = null;
  comments: string = null;
  dateTime: Moment = null;
  rankOrder: number = null;

  creationDate: Moment = null;
  validationDate: Moment = null;
  recorderPerson: Person;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.objectId = source.objectId;
    this.objectTypeId = source.objectTypeId;
    this.url = source.url;
    this.dataUrl = source.dataUrl;
    this.comments = source.comments;
    this.dateTime = fromDateISOString(source.dateTime);
    this.creationDate = fromDateISOString(source.creationDate);
    this.validationDate = fromDateISOString(source.validationDate);
    this.recorderPerson = Person.fromObject(source.recorderPerson);
    this.rankOrder = source.rankOrder;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.creationDate = toDateISOString(this.creationDate);
    target.validationDate = toDateISOString(this.validationDate);
    target.recorderPerson = this.recorderPerson?.asObject(opts) || undefined;

    // For pod
    if (opts && opts.keepLocalId === false) {
      // Reset unused attributes
      delete target.rankOrder;
    }
    return target;
  }

  equals(other: ImageAttachment): boolean {
    return (
      (other && this.id === other.id) ||
      // Or functional equals
      // Same object
      (((isNil(this.objectId) && isNil(this.objectTypeId)) || (this.objectId === other.objectId && this.objectTypeId === other.objectTypeId)) &&
        // same rankOrder + comments
        this.rankOrder === other.rankOrder &&
        this.comments === other.comments)
    );
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
