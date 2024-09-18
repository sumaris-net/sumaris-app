import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { TripFilter } from '@app/trip/trip/trip.filter';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import {
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { BBox } from 'geojson';
import { ScientificCruise } from '@app/trip/scientific-cruise/scientific-cruise.model';

@EntityClass({ typename: 'ScientificCruiseFilterVO' })
export class ScientificCruiseFilter extends RootDataEntityFilter<ScientificCruiseFilter, ScientificCruise> {
  static fromObject: (source: any, opts?: any) => ScientificCruiseFilter;

  static toTripFilter(f: Partial<ScientificCruiseFilter>): TripFilter {
    if (!f)
      return TripFilter.fromObject({
        hasScientificCruise: true,
        hasObservedLocation: false,
      });

    return TripFilter.fromObject({
      programLabel: f.program?.label,
      vesselId: toNumber(f.vesselId, f.vesselSnapshot?.id),
      vesselIds: f.vesselIds,
      startDate: f.startDate,
      endDate: f.endDate,
      boundingBox: f.boundingBox,

      hasScientificCruise: true,
      hasObservedLocation: false,
    });
  }

  static toOperationFilter(f: Partial<TripFilter>): OperationFilter {
    if (!f) return undefined;
    return OperationFilter.fromObject({
      programLabel: f.program?.label,
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate,
      boundingBox: f.boundingBox,
    });
  }

  vesselId: number = null;
  vesselIds: number[] = null;
  vesselSnapshot: VesselSnapshot = null;
  startDate: Moment = null;
  endDate: Moment = null;
  includedIds: number[];
  excludedIds: number[];
  boundingBox?: BBox;

  constructor() {
    super();
    this.dataQualityStatus = 'VALIDATED';
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
    this.vesselIds = source.vesselIds;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.boundingBox = source.boundingBox;
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
    } else {
      target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<ScientificCruise>[] {
    const filterFns = super.buildFilter();

    // Filter excluded ids
    if (isNotEmptyArray(this.excludedIds)) {
      filterFns.push((t) => isNil(t.id) || !this.excludedIds.includes(t.id));
    }

    // Filter included ids
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push((t) => isNotNil(t.id) && this.includedIds.includes(t.id));
    }

    // Vessel
    const vesselId = isNotNil(this.vesselId) ? this.vesselId : this.vesselSnapshot?.id;
    if (isNotNil(vesselId)) {
      filterFns.push((t) => t.vesselSnapshot?.id === vesselId);
    }

    // Start/end period
    if (this.startDate) {
      const startDate = this.startDate.clone();
      filterFns.push((t) => (t.returnDateTime ? startDate.isSameOrBefore(t.returnDateTime) : startDate.isSameOrBefore(t.departureDateTime)));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push((t) => t.departureDateTime && endDate.isAfter(t.departureDateTime));
    }

    return filterFns;
  }
}
