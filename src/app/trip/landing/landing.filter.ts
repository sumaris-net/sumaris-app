import {RootDataEntityFilter} from "../../data/services/model/root-data-filter.model";
import {Landing} from "./landing.model";
import { FilterFn, toNumber } from '@sumaris-net/ngx-components';
import {Moment} from "moment";
import {isNotEmptyArray, isNotNil} from "@sumaris-net/ngx-components";
import {fromDateISOString, toDateISOString} from "@sumaris-net/ngx-components";
import {EntityAsObjectOptions}  from "@sumaris-net/ngx-components";
import {EntityClass}  from "@sumaris-net/ngx-components";

@EntityClass({typename: 'LandingFilterVO'})
export class LandingFilter extends RootDataEntityFilter<LandingFilter, Landing> {

  static fromObject: (source: any, opts?: any) => LandingFilter;

  vesselId?: number;
  locationId?: number;
  locationIds?: number[];
  groupByVessel?: boolean;
  excludeVesselIds?: number[];

  // Linked entities
  observedLocationId?: number;
  tripId?: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = toNumber(source.vesselId);
    this.locationId = toNumber(source.locationId);
    this.locationIds = source.locationIds;
    this.groupByVessel = source.groupByVessel;
    this.excludeVesselIds = source.excludeVesselIds;
    this.observedLocationId = toNumber(source.observedLocationId);
    this.tripId = toNumber(source.tripId);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      delete target.groupByVessel;
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
      filterFns.push((entity) => entity.location && entity.location.id === this.locationId);
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
    return filterFns;
  }
}
