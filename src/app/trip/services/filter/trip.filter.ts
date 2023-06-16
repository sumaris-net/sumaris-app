import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import {
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNil,
  Person,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Trip } from '../model/trip.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { OperationFilter } from '@app/trip/services/filter/operation.filter';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';
import { BBox } from 'geojson';


@EntityClass({typename: 'TripFilterVO'})
export class TripFilter extends RootDataEntityFilter<TripFilter, Trip> {

  static fromObject: (source: any, opts?: any) => TripFilter;

  static toPhysicalGearFilter(f: Partial<TripFilter>): PhysicalGearFilter {
    if (!f) return undefined;
    return PhysicalGearFilter.fromObject({
      program: f.program,
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate
    });
  }

  static toOperationFilter(f: Partial<TripFilter>): OperationFilter {
    if (!f) return undefined;
    return OperationFilter.fromObject({
      programLabel: f.program?.label,
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate,
      boundingBox: f.boundingBox
    });
  }

  vesselSnapshot: VesselSnapshot = null;
  vesselId: number = null;
  location: ReferentialRef = null;
  startDate: Moment = null;
  endDate: Moment = null;
  observers?: Person[];
  includedIds: number[];
  excludedIds: number[];
  boundingBox?: BBox;
  observedLocationId: number;

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
    this.excludedIds = source.excludedIds;
    this.boundingBox = source.boundingBox;
    this.observedLocationId = source.observedLocationId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);

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

    // Filter excluded ids
    if (isNotEmptyArray(this.excludedIds)) {
      filterFns.push(t => isNil(t.id) || !this.excludedIds.includes(t.id));
    }

    // Filter included ids
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push(t => isNotNil(t.id) && this.includedIds.includes(t.id));
    }

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

export class TripSynchroImportFilter extends DataSynchroImportFilter {


  static toTripFilter(f: TripSynchroImportFilter): TripFilter {
    if (!f) return undefined;
    return TripFilter.fromObject({
      program: {label: f.programLabel},
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate
    });
  }

}
