import { Department, Entity, EntityAsObjectOptions, EntityClass, EntityFilter, fromDateISOString, Image, Person, toDateISOString } from '@sumaris-net/ngx-components';
import { StoreObject } from '@apollo/client/core';
import { Moment } from 'moment';


@EntityClass({ typename: 'ImageAttachmentVO' })
export class ImageAttachment extends Entity<ImageAttachment> implements Image {

  static fromObject: (source: any, opts?: any) => ImageAttachment;

  static equals(s1: ImageAttachment, s2: ImageAttachment) {
    return s1 && s2 && s1.id === s2.id
      // Or
      || (
        // Same xxx attribute
        false
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

  creationDate: Moment = null;
  qualityFlagId: number;
  recorderDepartment: Department;
  recorderPerson: Person;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.url = source.url;
    this.dataUrl = source.dataUrl;
    this.comments = source.comments;
    this.dateTime = fromDateISOString(source.dateTime);
    this.creationDate = fromDateISOString(source.creationDate);
    this.recorderDepartment = source.recorderDepartment && Department.fromObject(source.recorderDepartment);
    this.recorderPerson = source.recorderPerson && Person.fromObject(source.recorderPerson);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts) || undefined;
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || undefined;
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
