import { EntityClass, fromDateISOString, isNotNil, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity, DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { Moment } from 'moment';
import { IPositionEntity } from '@app/data/position/position.model';


@EntityClass({ typename: 'VesselPositionVO' })
export class VesselPosition extends DataEntity<VesselPosition>
  implements IPositionEntity<VesselPosition> {

  static fromObject: (source: any, opts?: any) => VesselPosition;

  dateTime: Moment;
  latitude: number;
  longitude: number;
  operationId: number;

  constructor() {
    super();
    this.__typename = VesselPosition.TYPENAME;
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.dateTime = toDateISOString(this.dateTime);
    return target;
  }

  fromObject(source: any): VesselPosition {
    super.fromObject(source);
    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.operationId = source.operationId;
    this.dateTime = fromDateISOString(source.dateTime);
    return this;
  }

  equals(other: VesselPosition): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (this.dateTime && this.dateTime.isSame(fromDateISOString(other.dateTime))
        && (!this.operationId && !other.operationId || this.operationId === other.operationId));
  }

  isSamePoint(other: VesselPosition) {
    if (!other) return false;
    return (this.latitude === other.latitude) && (this.longitude === other.longitude);
  }

  copyPoint(source: VesselPosition) {
    if (!source) return;
    this.latitude = source.latitude;
    this.longitude = source.longitude;
  }
}
