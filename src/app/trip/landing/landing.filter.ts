import { RootDataEntityFilter } from '../../data/services/model/root-data-filter.model';
import { Landing } from './landing.model';
import { EntityAsObjectOptions, EntityClass, FilterFn, isNilOrBlank, isNotEmptyArray, isNotNil, Person, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';

@EntityClass({typename: 'LandingFilterVO'})
export class LandingFilter extends RootDataEntityFilter<LandingFilter, Landing> {

  static fromObject: (source: any, opts?: any) => LandingFilter;

  vesselId?: number;
  vesselSnapshot: VesselSnapshot = null;
  excludeVesselIds?: number[];
  groupByVessel?: boolean;

  locationId?: number;
  locationIds?: number[];
  location: ReferentialRef = null;

  observers?: Person[];
  tagId?: string;

  // Linked entities
  observedLocationId?: number;
  tripId?: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = toNumber(source.vesselId);
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.excludeVesselIds = source.excludeVesselIds;
    this.groupByVessel = source.groupByVessel;

    this.locationId = toNumber(source.locationId);
    this.locationIds = source.locationIds;
    this.location = ReferentialRef.fromObject(source.location);

    this.observers = source.observers && source.observers.map(Person.fromObject).filter(isNotNil) || [];
    this.tagId = source.tagId;

    this.observedLocationId = toNumber(source.observedLocationId);
    this.tripId = toNumber(source.tripId);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
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

      // Not exists in pod
      delete target.groupByVessel;

      if (isNilOrBlank(this.tagId)) delete target.tagId;
    }
    else {
      target.vesselSnapshot = this.vesselSnapshot && this.vesselSnapshot.asObject(opts) || undefined;
      target.location = this.location && this.location.asObject(opts) || undefined;
      target.observers = this.observers && this.observers.map(o => o && o.asObject(opts)).filter(isNotNil) || [];
    }
    return target;
  }

  buildFilter(): FilterFn<Landing>[] {
    const filterFns = super.buildFilter();

    // observedLocationId
    if (isNotNil(this.observedLocationId)) {
      filterFns.push((entity) => entity.observedLocationId === this.observedLocationId);
    }

    // tripId
    if (isNotNil(this.tripId)) {
      filterFns.push((entity) => entity.tripId === this.tripId);
    }

    // Vessel
    if (isNotNil(this.vesselId)) {
      filterFns.push((entity) => entity.vesselSnapshot && entity.vesselSnapshot.id === this.vesselId);
    }

    // Vessel exclude
    if (isNotEmptyArray(this.excludeVesselIds)) {
      filterFns.push((entity) => entity.vesselSnapshot && !this.excludeVesselIds.includes(entity.vesselSnapshot.id));
    }

    // Location
    if (isNotNil(this.locationId)) {
      filterFns.push((entity) => entity.location?.id === this.locationId);
    }
    if (isNotEmptyArray(this.locationIds)) {
      filterFns.push((entity) => entity.location && this.locationIds.includes(entity.location.id));
    }

    // Start/end period
    if (this.startDate) {
      const startDate = this.startDate.clone();
      filterFns.push(t => t.dateTime && startDate.isSameOrBefore(t.dateTime));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push(t => t.dateTime && endDate.isAfter(t.dateTime));
    }

    // Observers
    const observerIds = this.observers?.map(o => o.id).filter(isNotNil);
    if (isNotEmptyArray(observerIds)) {
      filterFns.push(t => t.observers?.some(o => o && observerIds.includes(o.id)));
    }

    return filterFns;
  }
}
