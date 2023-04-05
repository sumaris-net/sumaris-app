import { IPosition } from '@app/trip/services/model/position.model';
import { Moment } from 'moment/moment';
import { DateUtils, Department, EntityAsObjectOptions, EntityClass, FilterFn, fromDateISOString, Person, Referential, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';

export interface IPositionWithDate extends IPosition {
  dateTime: Moment;
}

@EntityClass({ typename: 'DevicePositionVO' })
export class DevicePosition extends RootDataEntity<DevicePosition> {

  static ENTITY_NAME = 'DevicePosition';
  dateTime: Moment;
  latitude: number;
  longitude: number;
  objectId: number;
  objectType: Referential;
  recorderPerson: Person;
  recorderDepartment: Department;
  creationDate: Moment;

  // TODO Type DevicePostion
  static fromObject(source: any, options?: any): DevicePosition {
    const devicePosition = new DevicePosition();
    devicePosition.fromObject(source, options);
    return devicePosition;
  }

  constructor() {
    super();
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.latitude = this.latitude;
    target.longitude = this.longitude;
    target.objectId = this.objectId;
    target.objectType = this.objectType && this.objectType.asObject({...opts, minify: false});
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts);
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    delete target.comments;
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
    this.recorderDepartment = Department.fromObject(source.recorderDepartment, opts);
    this.creationDate = fromDateISOString(source.creationDate);
  }
}

@EntityClass({typename: 'DevicePositionFilterVO'})
export class DevicePositionFilter extends RootDataEntityFilter<DevicePositionFilter, DevicePosition> {

  static TYPENAME = 'DevicePositionVO';
  objectType:Referential;
  objectId:number;
  startDate:Moment = null;
  endDate:Moment = null;
  recorderPerson:Person = null;

  static fromObject: (source: any, opts?: any) => DevicePositionFilter;

  fromObject(source:any, opts?:any) {
    super.fromObject(source, opts);
    this.synchronizationStatus = source.synchronizationStatus || undefined;
    this.objectType = Referential.fromObject(source.objectType);
    this.objectId = source.objectId;
    this.recorderPerson = Person.fromObject(source.recorderPerson)
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.objectId = this.objectId;
    if (opts && opts.minify) {
      target.objectTypeLabel = this.objectType?.label;
      delete target.objectType;

      target.startDate = this.startDate ? DateUtils.resetTime(target.startDate) : undefined;
      target.endDate = this.endDate ? DateUtils.resetTime(this.endDate.add(1, 'day')) : undefined;
    }
    else {
      target.objectType = this.objectType && this.objectType.asObject(opts) || undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<DevicePosition>[] {
    const filterFns = super.buildFilter();
    if (this.objectId) {
      const objectId = this.objectId;
      filterFns.push(t => (t.objectId === objectId))
    }
    if (this.objectType) {
      const objectTypeLabel = this.objectType.label;
      filterFns.push(t => (t.objectType.label === objectTypeLabel))
    }
    if (ReferentialUtils.isNotEmpty(this.recorderPerson)) {
      const recorderPersonId = this.recorderPerson.id;
      filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === recorderPersonId));
    }
    return filterFns;
  }

}
