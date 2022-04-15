import { RootDataEntityFilter } from '../../../data/services/model/root-data-filter.model';
import { PhysicalGear } from '../model/trip.model';
import { EntityAsObjectOptions, EntityClass, FilterFn, fromDateISOString, isNotNil, isNotNilOrBlank } from '@sumaris-net/ngx-components';

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
    const filterFns = super.buildFilter({skipProgram: true});

    // Program
    if (this.program) {
      const programId = this.program.id;
      const programLabel = this.program.label;
      if (isNotNil(programId)) {
        filterFns.push(t => (!t.trip?.program || t.trip.program.id === programId));
      }
      else if (isNotNilOrBlank(programLabel)) {
        filterFns.push(t => (!t.trip?.program || t.trip.program.label === programLabel));
      }
    }

    // Trip
    if (isNotNil(this.tripId)) {
      const tripId = this.tripId;
      filterFns.push(pg => (pg.tripId === tripId || pg.trip?.id === tripId));
    }
    if (isNotNil(this.excludeTripId)) {
      const excludeTripId = this.excludeTripId;
      filterFns.push(pg => !(pg.tripId === excludeTripId || pg.trip?.id === excludeTripId));
    }

    // StartDate
    if (isNotNil(this.startDate)) {
      const startDate = this.startDate;
      filterFns.push((pg => ((isNotNil(pg.trip?.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isAfter(startDate))
        || (isNotNil(pg.trip?.departureDateTime) && fromDateISOString(pg.trip?.departureDateTime).isAfter(startDate)))));
    }

    // EndDate
    if (isNotNil(this.endDate)) {
      const endDate = this.endDate;
      filterFns.push((pg => ((isNotNil(pg.trip?.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isBefore(endDate))
        || (isNotNil(pg.trip?.departureDateTime) && fromDateISOString(pg.trip?.departureDateTime).isBefore(endDate)))));
    }

    // Vessel
    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push(pg => pg.trip?.vesselSnapshot?.id === vesselId);
    }

    return filterFns;
  }
}
