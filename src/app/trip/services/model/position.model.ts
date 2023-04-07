import { Moment } from 'moment';

export class IPosition {
  latitude: number;
  longitude: number;
}

export interface IPositionWithDate extends IPosition {
  dateTime: Moment;
}
