import {IPosition} from '@app/trip/services/model/position.model';
import {Moment} from 'moment/moment';
import {Department, EntityAsObjectOptions, EntityClass, fromDateISOString, Person, toDateISOString} from '@sumaris-net/ngx-components';
import {RootDataEntity} from '@app/data/services/model/root-data-entity.model';
import {RootDataEntityFilter} from '@app/data/services/model/root-data-filter.model';

export interface ITrackPosition extends IPosition {
  date: Moment;
}
@EntityClass({ typename: 'DevicePositionVO' })
export class DevicePosition<T extends DevicePosition<any, ID>, ID = number, AO = EntityAsObjectOptions, FO = any> extends RootDataEntity<T, ID> {

  ENTITY_NAME = 'DevicePosition';
  dateTime: Moment;
  latitude: number;
  longitude: number;
  objectId: number;
  objectType: string;  // TODO Type this
  recorderPerson: Person;
  recorderDepartment: Department;
  creationDate: Moment;

  // TODO Type DevicePostion
  static fromObject(source: any, options?: any): DevicePosition<any, any> {
    const devicePosition = new DevicePosition();
    devicePosition.fromObject(source, options);
    return devicePosition;
  }

  constructor() {
    super();
  }

  asObject(opts?: AO): any {
    const target: any = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.latitude = this.latitude;
    target.longitude = this.longitude;
    target.objectId = this.objectId;
    target.objectType = this.objectType;
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts);
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    return target;
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.dateTime = fromDateISOString(source.dateTime);
    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.objectId = source.objectId;
    this.objectType = source.ObjectType;
    this.recorderPerson = Person.fromObject(source.recorderPerson, opts);
    this.recorderDepartment = Department.fromObject(source.recorderDepartment, opts);
    this.creationDate = fromDateISOString(source.creationDate);
  }
}

export class DevicePositionFilter extends RootDataEntityFilter<DevicePositionFilter, DevicePosition<any>, number> {
}
