import { Moment } from 'moment/moment';
import {
  DateUtils,
  Department,
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  FilterFn,
  fromDateISOString,
  IPosition,
  isNotNil,
  Person,
  Referential,
  ReferentialUtils,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { IPositionEntity } from '@app/data/position/position.model';

export interface IPositionWithDate extends IPosition {
  dateTime: Moment;
}

@EntityClass({ typename: 'DevicePositionVO' })
export class DevicePosition
  extends DataEntity<DevicePosition>
  implements IPositionEntity<DevicePosition> {

  static ENTITY_NAME = 'DevicePosition';
  static fromObject: (source: any, options?: any) => DevicePosition;

  dateTime: Moment;
  latitude: number;
  longitude: number;
  objectId: number;
  objectType: Referential;
  recorderPerson: Person;

  constructor() {
    super(DevicePosition.TYPENAME);
    this.recorderDepartment = null;
  }


  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.latitude = this.latitude;
    target.longitude = this.longitude;
    target.objectId = this.objectId;
    target.objectType = this.objectType && this.objectType.asObject({...opts, minify: false});
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts);

    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.dateTime = fromDateISOString(source.dateTime);
    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.objectId = source.objectId;
    this.objectType = Referential.fromObject(source.objectType);
    this.recorderPerson = Person.fromObject(source.recorderPerson, opts);

  }
}

@EntityClass({typename: 'DevicePositionFilterVO'})
export class DevicePositionFilter extends EntityFilter<DevicePositionFilter, DevicePosition> {

  static TYPENAME = 'DevicePositionVO';
  objectType:Referential = null;
  objectId:number = null;
  startDate:Moment = null;
  endDate:Moment = null;
  recorderPerson:Person = null;
  recorderDepartment: Department = null;

  static fromObject: (source: any, opts?: any) => DevicePositionFilter;

  fromObject(source:any, opts?:any) {
    super.fromObject(source, opts);
    this.objectType = Referential.fromObject(source.objectType);
    this.objectId = source.objectId;
    this.recorderPerson = Person.fromObject(source.recorderPerson)
      || isNotNil(source.recorderPersonId) && Person.fromObject({id: source.recorderPersonId}) || undefined;
    this.recorderDepartment = Department.fromObject(source.recorderDepartment)
      || isNotNil(source.recorderDepartmentId) && Department.fromObject({id: source.recorderDepartmentId})
      || undefined;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.objectId = this.objectId;
    if (opts && opts.minify) {
      target.objectTypeLabel = this.objectType && this.objectType?.label;
      delete target.objectType;

      target.recorderPersonId = this.recorderPerson && this.recorderPerson?.id;
      delete target.recorderPerson;

      target.recorderDepartmentId = this.recorderDepartment && this.recorderDepartment?.id;
      delete target.recorderDepartment;

      target.startDate = this.startDate ? DateUtils.resetTime(this.startDate) : undefined;
      target.endDate = this.endDate ? DateUtils.resetTime(this.endDate.add(1, 'day')) : undefined;
    }
    else {
      target.objectType = this.objectType && this.objectType.asObject(opts) || undefined;
      target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
      target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject({...opts, ...NOT_MINIFY_OPTIONS});
    }
    return target;
  }

  buildFilter(): FilterFn<DevicePosition>[] {
    const filterFns = super.buildFilter();

    if (this.objectId) {
      const objectId = this.objectId;
      if (isNotNil(objectId))
        filterFns.push(t => (t.objectId === objectId))
    }

    if (this.objectType) {
      const objectTypeLabel = this.objectType?.label;
      if (isNotNil(objectTypeLabel))
        filterFns.push(t => (t.objectType.label === objectTypeLabel))
    }

    if (ReferentialUtils.isNotEmpty(this.recorderPerson)) {
      const recorderPersonId = this.recorderPerson.id;
      filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === recorderPersonId));
    }

    if (ReferentialUtils.isNotEmpty(this.recorderDepartment)) {
      const recorderDepartmentId = this.recorderDepartment.id;
      filterFns.push(t => (t.recorderDepartment && t.recorderDepartment.id === recorderDepartmentId));
    }

    return filterFns;
  }

}
