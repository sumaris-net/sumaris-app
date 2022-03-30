import { RootDataEntityFilter } from '../../../data/services/model/root-data-filter.model';
import { EntityAsObjectOptions, EntityClass, FilterFn, fromDateISOString, isNotEmptyArray, isNotNil, Person, ReferentialRef, ReferentialUtils, toDateISOString } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Trip } from '../model/trip.model';
import { VesselSnapshot } from '../../../referential/services/model/vessel-snapshot.model';
import moment from 'moment/moment';
import DurationConstructor = moment.unitOfTime.DurationConstructor;


@EntityClass({typename: 'TripFilterVO'})
export class TripFilter extends RootDataEntityFilter<TripFilter, Trip> {

  static fromObject: (source: any, opts?: any) => TripFilter;

  vesselSnapshot: VesselSnapshot = null;
  vesselId: number = null;
  location: ReferentialRef = null;
  startDate: Moment = null;
  endDate: Moment = null;
  observers?: Person[];
  includedIds: number[];

  constructor() {
    super();
    this.dataQualityStatus = 'VALIDATED';
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.location = ReferentialRef.fromObject(source.location);
    this.observers = source.observers && source.observers.map(Person.fromObject).filter(isNotNil) || [];
    this.includedIds = source.includedIds;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    target.includedIds = this.includedIds;

    if (opts && opts.minify) {
      // Vessel
      target.vesselId = isNotNil(this.vesselId) ? this.vesselId : (this.vesselSnapshot && isNotNil(this.vesselSnapshot.id) ? this.vesselSnapshot.id : undefined);
      delete target.vesselSnapshot;

      // Location
      target.locationId = this.location && this.location.id || undefined;
      delete target.location;

      // Observers
      target.observerPersonIds = isNotEmptyArray(this.observers) && this.observers.map(o => o && o.id).filter(isNotNil) || undefined;
      delete target.observers;
    }
    else {
      target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject(opts) || undefined;
      target.location = this.location && this.location.asObject(opts) || undefined;
      target.observers = this.observers && this.observers.map(o => o && o.asObject(opts)).filter(isNotNil) || [];
    }
    return target;
  }

  buildFilter(): FilterFn<Trip>[] {
    const filterFns = super.buildFilter();

    // Vessel
    if (this.vesselId) {
      filterFns.push(t => (t.vesselSnapshot && t.vesselSnapshot.id === this.vesselId));
    }

    // Location
    if (ReferentialUtils.isNotEmpty(this.location)) {
      const locationId = this.location.id;
      filterFns.push(t => (
        (t.departureLocation && t.departureLocation.id === locationId)
        || (t.returnLocation && t.returnLocation.id === locationId))
      );
    }

    // Start/end period
    if (this.startDate) {
      const startDate = this.startDate.clone();
      filterFns.push(t => t.returnDateTime ? startDate.isSameOrBefore(t.returnDateTime) : startDate.isSameOrBefore(t.departureDateTime));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push(t => t.departureDateTime && endDate.isAfter(t.departureDateTime));
    }

    return filterFns;
  }
}

export class TripOfflineFilter {
  programLabel?: string;
  vesselId?: number;
  startDate?: Date | Moment;
  endDate?: Date | Moment
  periodDuration?: number;
  periodDurationUnit?: DurationConstructor;

  public static toTripFilter(f: TripOfflineFilter): TripFilter {
    if (!f) return undefined;
    return TripFilter.fromObject({
      program: {label: f.programLabel},
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate
    });
  }
}
