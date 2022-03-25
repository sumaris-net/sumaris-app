import { RootDataEntityFilter } from '../../../data/services/model/root-data-filter.model';
import { PhysicalGear } from '../model/trip.model';
import { EntityAsObjectOptions, EntityClass } from '@sumaris-net/ngx-components';

@EntityClass({typename: 'PhysicalGearFilterVO'})
export class PhysicalGearFilter extends RootDataEntityFilter<PhysicalGearFilter, PhysicalGear> {

  static fromObject: (source: any, opts?: any) => PhysicalGearFilter;

  tripId?: number;
  vesselId?: number;
  excludeTripId?: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.tripId = source.tripId;
    this.vesselId = source.vesselId;
    this.excludeTripId = source.excludeTripId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    if (opts && opts.minify) {
      // NOT exists on pod:
      delete target.excludeTripId;
    }

    return target;
  }

}
