import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import {
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  isNotNilOrNaN,
} from '@sumaris-net/ngx-components';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';

@EntityClass({ typename: 'PhysicalGearFilterVO' })
export class PhysicalGearFilter extends RootDataEntityFilter<PhysicalGearFilter, PhysicalGear> {
  static fromObject: (source: any, opts?: any) => PhysicalGearFilter;

  vesselId: number = null;
  vesselIds: number[] = null;

  tripId: number = null;
  excludeTripId: number = null;

  parentGearId: number = null;
  excludeParentGearId: number = null;
  excludeChildGear: boolean = null;
  excludeParentGear: boolean = null;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
    this.vesselIds = source.vesselIds;
    this.tripId = source.tripId;
    this.excludeTripId = source.excludeTripId;
    this.parentGearId = source.parentGearId;
    this.excludeParentGearId = source.excludeParentGearId;
    this.excludeChildGear = source.excludeChildGear;
    this.excludeParentGear = source.excludeParentGear;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    if (opts?.minify) {
      // Vessel (prefer single vessel, for compatibility with pod < 2.9)
      target.vesselId = isNotNilOrNaN(this.vesselId) ? this.vesselId : this.vesselIds?.length === 1 ? this.vesselIds[0] : undefined;
      target.vesselIds = isNil(target.vesselId) ? this.vesselIds?.filter(isNotNil) : undefined;
      if (isEmptyArray(target.vesselIds)) delete target.vesselIds;
    }

    return target;
  }

  buildFilter(): FilterFn<PhysicalGear>[] {
    const filterFns = super.buildFilter({ skipProgram: true });

    // Program
    if (this.program) {
      const programId = this.program.id;
      const programLabel = this.program.label;
      if (isNotNil(programId)) {
        filterFns.push((t) => !t.trip?.program || t.trip.program.id === programId);
      } else if (isNotNilOrBlank(programLabel)) {
        filterFns.push((t) => isNil(t.trip?.program) || t.trip.program.label === programLabel);
      }
    }

    // Vessels
    const vesselIds = isNotNilOrNaN(this.vesselId) ? [this.vesselId] : this.vesselIds;
    if (isNotEmptyArray(vesselIds)) {
      filterFns.push((pg) => vesselIds.includes(pg.trip?.vesselSnapshot?.id));
    }

    // Trip
    if (isNotNil(this.tripId)) {
      const tripId = this.tripId;
      filterFns.push((pg) => pg.tripId === tripId || pg.trip?.id === tripId);
    }
    if (isNotNil(this.excludeTripId)) {
      const excludeTripId = this.excludeTripId;
      filterFns.push((pg) => !(pg.tripId === excludeTripId || pg.trip?.id === excludeTripId));
    }

    // Parent/Children
    if (isNotNil(this.parentGearId)) {
      const parentGearId = this.parentGearId;
      filterFns.push((pg) => pg.parentId === parentGearId || pg.parent?.id === parentGearId);
    }
    if (isNotNil(this.excludeParentGearId)) {
      const excludeParentGearId = this.excludeParentGearId;
      filterFns.push((pg) => !(pg.parentId === excludeParentGearId || pg.parent?.id === excludeParentGearId));
    }
    if (this.excludeParentGear) {
      filterFns.push((pg) => isNotNil(pg.parentId) || !!pg.parent);
    }
    if (this.excludeChildGear) {
      filterFns.push((pg) => isNil(pg.parentId) && !pg.parent);
    }

    // StartDate
    if (isNotNil(this.startDate)) {
      const startDate = this.startDate;
      filterFns.push(
        (pg) =>
          (isNotNil(pg.trip?.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isAfter(startDate)) ||
          (isNotNil(pg.trip?.departureDateTime) && fromDateISOString(pg.trip?.departureDateTime).isAfter(startDate))
      );
    }

    // EndDate
    if (isNotNil(this.endDate)) {
      const endDate = this.endDate;
      filterFns.push(
        (pg) =>
          (isNotNil(pg.trip?.returnDateTime) && fromDateISOString(pg.trip.returnDateTime).isBefore(endDate)) ||
          (isNotNil(pg.trip?.departureDateTime) && fromDateISOString(pg.trip?.departureDateTime).isBefore(endDate))
      );
    }

    return filterFns;
  }
}
