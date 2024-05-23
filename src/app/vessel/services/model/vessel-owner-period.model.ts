import {
  DateUtils,
  Entity,
  EntityClass,
  fromDateISOString,
  ReferentialAsObjectOptions,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { VesselOwner } from './vessel-owner.model';

@EntityClass({ typename: 'VesselOwnerPeriodVO' })
export class VesselOwnerPeriod extends Entity<VesselOwnerPeriod> {
  static ENTITY_NAME = 'VesselOwnerPeriod';
  static fromObject: (source: any, opts?: any) => VesselOwnerPeriod;

  startDate: Moment;
  endDate: Moment;
  vesselId: number = null;
  vesselOwner: VesselOwner = null;

  constructor() {
    super(VesselOwnerPeriod.TYPENAME);
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.vesselId = source.vesselId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.vesselOwner = source.vesselOwner;
  }

  asObject(options?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
    target.endDate = toDateISOString(DateUtils.markTime(this.endDate));
    return target;
  }

  // equals(other: VesselOwnerPeriod): boolean {
  //   return (
  //     (isNotNil(this.id) && super.equals(other)) ||
  //     // Compare functional properties
  //     (this.program && this.program.equals(other?.program) && this.lastName === other.lastName && this.firstName === other.firstName)
  //   );
  // }
}
