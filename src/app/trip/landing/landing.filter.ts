import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { Landing } from './landing.model';
import {
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  Person,
  ReferentialRef,
  toNumber,
} from '@sumaris-net/ngx-components';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';

@EntityClass({ typename: 'LandingFilterVO' })
export class LandingFilter extends RootDataEntityFilter<LandingFilter, Landing> {
  static fromObject: (source: any, opts?: any) => LandingFilter;

  vesselId?: number;
  vesselIds?: number[];
  vesselSnapshot: VesselSnapshot = null;
  excludeVesselIds?: number[];
  groupByVessel?: boolean;

  locationId?: number;
  locationIds?: number[];
  location: ReferentialRef = null;
  locations?: ReferentialRef[];

  observers?: Person[];

  sampleLabel?: string;
  sampleTagId?: string;

  // Linked entities
  observedLocationId?: number;
  tripId?: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = toNumber(source.vesselId);
    this.vesselIds = source.vesselIds;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.excludeVesselIds = source.excludeVesselIds;
    this.groupByVessel = source.groupByVessel;

    this.locationId = toNumber(source.locationId);
    this.locationIds = source.locationIds;
    this.location = ReferentialRef.fromObject(source.location);

    this.observers = (source.observers && source.observers.map(Person.fromObject).filter(isNotNil)) || [];

    this.sampleLabel = source.sampleLabel;
    this.sampleTagId = source.sampleTagId;

    this.observedLocationId = toNumber(source.observedLocationId);
    this.tripId = toNumber(source.tripId);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    if (opts?.minify) {
      // Vessel (prefer single vessel, for compatibility with pod < 2.9)
      target.vesselId = isNotNil(this.vesselId)
        ? this.vesselId
        : isNotNil(this.vesselSnapshot?.id)
          ? this.vesselSnapshot.id
          : this.vesselIds?.length === 1
            ? this.vesselIds[0]
            : undefined;
      target.vesselIds = isNil(target.vesselId) ? this.vesselIds?.filter(isNotNil) : undefined;
      if (isEmptyArray(target.vesselIds)) delete target.vesselIds;
      delete target.vesselSnapshot;

      // Location
      target.locationId = (this.location && this.location.id) || undefined;
      delete target.location;

      // Observers
      target.observerPersonIds = (isNotEmptyArray(this.observers) && this.observers.map((o) => o && o.id).filter(isNotNil)) || undefined;
      delete target.observers;

      // Not exists in pod
      delete target.groupByVessel;

      // Sample
      target.sampleLabels = isNotNilOrBlank(this.sampleLabel) ? this.sampleLabel.split(/[,\s]+/) : undefined;
      delete target.sampleLabel;
      target.sampleTagIds = isNotNilOrBlank(this.sampleTagId) ? this.sampleTagId.split(/[,\s]+/) : undefined;
      delete target.sampleTagId;
    } else {
      target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
      target.location = (this.location && this.location.asObject(opts)) || undefined;
      target.observers = (this.observers && this.observers.map((o) => o && o.asObject(opts)).filter(isNotNil)) || [];
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
    const vesselId = isNotNil(this.vesselId) ? this.vesselId : this.vesselSnapshot?.id;
    if (isNotNil(vesselId)) {
      filterFns.push((t) => t.vesselSnapshot?.id === vesselId);
    } else if (isNotEmptyArray(this.vesselIds)) {
      const vesselIds = this.vesselIds;
      filterFns.push((t) => t.vesselSnapshot && vesselIds.includes(t.vesselSnapshot.id));
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
      filterFns.push((t) => t.dateTime && startDate.isSameOrBefore(t.dateTime));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push((t) => t.dateTime && endDate.isAfter(t.dateTime));
    }

    // Observers
    const observerIds = this.observers?.map((o) => o.id).filter(isNotNil);
    if (isNotEmptyArray(observerIds)) {
      filterFns.push((t) => t.observers?.some((o) => o && observerIds.includes(o.id)));
    }

    return filterFns;
  }

  protected isCriteriaNotEmpty(key: string, value: any): boolean {
    switch (key) {
      case 'observedLocationId':
        return false; // Ignore observedLocationId
      default:
        return super.isCriteriaNotEmpty(key, value);
    }
  }
}
