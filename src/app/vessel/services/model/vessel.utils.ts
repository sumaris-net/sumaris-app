import { IEntity } from '@sumaris-net/ngx-components';
import { Moment } from 'moment/moment';

export interface IVesselPeriodEntity<T extends IEntity<T> = IEntity<any>> extends IEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate?: Moment;
}
