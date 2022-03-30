import { RootDataEntityFilter } from '../../../data/services/model/root-data-filter.model';
import { PhysicalGear } from '../model/trip.model';
import { EntityAsObjectOptions, EntityClass, FilterFn, isNotNil } from '@sumaris-net/ngx-components';

@EntityClass({typename: 'PhysicalGearFilterVO'})
export class PhysicalGearFilter extends RootDataEntityFilter<PhysicalGearFilter, PhysicalGear> {

  static fromObject: (source: any, opts?: any) => PhysicalGearFilter;

  tripId?: number;
  excludeTripId?: number;
  vesselId?: number;

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

  buildFilter(): FilterFn<PhysicalGear>[] {
    const filterFns = super.buildFilter();

    // Trip
    if (isNotNil(this.tripId)) {
      const tripId = this.tripId;
      filterFns.push(pg => (pg.tripId === tripId || pg.trip?.id === tripId));
    }
    if (isNotNil(this.excludeTripId)) {
      const excludeTripId = this.excludeTripId;
      filterFns.push(pg => !(pg.tripId === excludeTripId || pg.trip?.id === excludeTripId));
    }

    // Vessel
    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push(pg => pg.trip?.vesselSnapshot?.id === vesselId);
    }

    return filterFns;
  }
}
