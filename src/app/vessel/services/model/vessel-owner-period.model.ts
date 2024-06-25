import { DateUtils, Entity, EntityClass, fromDateISOString, ReferentialAsObjectOptions, toDateISOString } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { VesselOwner } from './vessel-owner.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

import { IVesselPeriodEntity } from '@app/vessel/services/model/vessel.utils';

@EntityClass({ typename: 'VesselOwnerPeriodVO' })
export class VesselOwnerPeriod extends Entity<VesselOwnerPeriod> implements IVesselPeriodEntity<VesselOwnerPeriod> {
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
    this.vesselOwner = source.vesselOwner && VesselOwner.fromObject(source.vesselOwner);
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.startDate = toDateISOString(DateUtils.markTime(this.startDate));
    target.endDate = toDateISOString(DateUtils.markTime(this.endDate));
    target.vesselOwner = this.vesselOwner?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS });
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
