import { Moment } from 'moment';
import { Entity, EntityAsObjectOptions, fromDateISOString, IEntity, IPosition, toDateISOString } from '@sumaris-net/ngx-components';
import { StoreObject } from '@apollo/client/core';

export interface IPositionWithDate extends IPosition{
  dateTime: Moment;
}

export interface IPositionEntity<T = any> extends IEntity<T>, IPositionWithDate {
}

export class PositionEntity<T extends PositionEntity<any>>
  extends Entity<T>
  implements IPositionEntity<T> {
  latitude: number;
  longitude: number;
  dateTime: Moment;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.dateTime = fromDateISOString(source.dateTime);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    return target;
  }
}
