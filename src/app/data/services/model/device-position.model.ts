import {IPosition} from '@app/trip/services/model/position.model';
import {Moment} from 'moment/moment';
import {Department, Entity, EntityAsObjectOptions, EntityClass, FilterFn, fromDateISOString, Person, toDateISOString} from '@sumaris-net/ngx-components';
import {RootDataEntity} from '@app/data/services/model/root-data-entity.model';
import {RootDataEntityFilter} from '@app/data/services/model/root-data-filter.model';

// Used to be compatible with ObjectTypeVO on pod side
// TODO Move this in its own file
@EntityClass({ typename: 'ObjectTypeVO' })
export class ObjectType extends Entity<Entity<any>> {
  static TYPENAME:string;
  __typename:string;
  id: number = null;
  updateDate:Moment = null;
  name:string = null;

  static fromObject(source:any):ObjectType {
    const target = new ObjectType();
    target.fromObject(source);
    return target;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.name = this.name;
    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.name = source.name;
  }

}

export interface ITrackPosition extends IPosition {
  date: Moment;
}
@EntityClass({ typename: 'DevicePositionVO' })
export class DevicePosition<T extends DevicePosition<any, ID>, ID = number, AO = EntityAsObjectOptions, FO = any> extends RootDataEntity<T, ID> {

  static ENTITY_NAME = 'DevicePosition';
  dateTime: Moment;
  latitude: number;
  longitude: number;
  objectId: number;
  objectType: ObjectType;
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
    // TODO Find a way to work with real ObjectType
    target.objectType = this.objectType && this.objectType.asObject(opts);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts);
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    delete target.comments;
    delete target.detail;
    delete target.ENTITY_NAME;
    return target;
  }

  fromObject(source: any, opts?: FO) {
    super.fromObject(source, opts);
    this.dateTime = fromDateISOString(source.dateTime);
    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.objectType = ObjectType.fromObject(source.objectType);
    this.recorderPerson = Person.fromObject(source.recorderPerson, opts);
    this.recorderDepartment = Department.fromObject(source.recorderDepartment, opts);
    this.creationDate = fromDateISOString(source.creationDate);
  }
}

@EntityClass({typename: 'DevicePositionFilterVO'})
export class DevicePositionFilter extends RootDataEntityFilter<DevicePositionFilter, DevicePosition<any>, number> {

  static TYPENAME = 'DevicePositionVO';

  objectType:ObjectType;
  startDate:Moment = null;
  endDate:Moment = null;
  recorderPerson:Person = null;

  static fromObject: (source: any, opts?: any) => DevicePositionFilter;

  fromObject(source:any, opts?:any) {
    super.fromObject(source, opts);
    this.synchronizationStatus = source.synchronizationStatus || undefined;
    this.objectType = ObjectType.fromObject(source.objectType);
    this.recorderPerson = Person.fromObject(source.recorderPerson)
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject(opts) || undefined;
    target.object = this.objectType && this.objectType.asObject(opts);
    return target;
  }

  buildFilter(): FilterFn<DevicePosition<any, any>>[] {
    const filterFns = super.buildFilter();
    if (this.objectType) {
      const objectTypeName = this.objectType.name;
      filterFns.push(t => (t.objectType.name === objectTypeName))
    }
    return filterFns;
  }

}
