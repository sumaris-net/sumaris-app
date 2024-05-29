import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { ActivityCalendar } from './model/activity-calendar.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';
import { Moment } from 'moment';

@EntityClass({ typename: 'ActivityCalendarFilterVO' })
export class ActivityCalendarFilter extends RootDataEntityFilter<ActivityCalendarFilter, ActivityCalendar> {
  static fromObject: (source: any, opts?: any) => ActivityCalendarFilter;

  year: number = null;

  startDate?: Moment = null;
  vesselId: number = null;
  vesselIds: number[] = null;
  vesselSnapshot: VesselSnapshot = null;
  registrationLocations: ReferentialRef[] = null;
  basePortLocations: ReferentialRef[] = null;
  includedIds: number[];
  excludedIds: number[];

  constructor() {
    super();
    this.dataQualityStatus = 'VALIDATED';
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.year = source.year;
    this.vesselId = source.vesselId;
    this.vesselIds = source.vesselIds;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.registrationLocations = source.registrationLocations?.map(ReferentialRef.fromObject);
    this.basePortLocations = source.basePortLocations?.map(ReferentialRef.fromObject);
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.startDate = fromDateISOString(source.startDate);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    if (opts && opts.minify) {
      // Vessel
      target.vesselId = isNotNil(this.vesselId) ? this.vesselId : this.vesselSnapshot?.id;
      target.vesselIds = isNil(this.vesselId) ? this.vesselIds : undefined;
      delete target.vesselSnapshot;

      // Registration locations
      target.registrationLocationIds = this.registrationLocations?.map((l) => l.id) || undefined;
      delete target.registrationLocations;

      // Registration locations
      target.basePortLocationIds = this.basePortLocations?.map((l) => l.id) || undefined;
      delete target.basePortLocations;
    } else {
      target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
      target.registrationLocations = this.registrationLocations?.map((l) => l.asObject(opts)) || undefined;
      target.basePortLocations = this.basePortLocations?.map((l) => l.asObject(opts)) || undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<ActivityCalendar>[] {
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

    // Registration locations
    if (isNotEmptyArray(this.registrationLocations)) {
      const registrationLocationIds = this.registrationLocations.map((l) => l.id);
      filterFns.push((t) => t.vesselSnapshot?.registrationLocation && registrationLocationIds.includes(t.vesselSnapshot.registrationLocation?.id));
    }

    // Base port locations
    if (isNotEmptyArray(this.basePortLocations)) {
      const basePortLocationIds = this.basePortLocations.map((l) => l.id);
      filterFns.push((t) =>
        (t.vesselUseFeatures || []).some((vuf) => vuf.basePortLocation && basePortLocationIds.includes(vuf.basePortLocation?.id))
      );
    }

    // Year
    if (isNotNil(this.year)) {
      const year = this.year;
      filterFns.push((t) => t.year === year);
    } else {
      // Start/end period
      if (this.startDate) {
        const startYear = this.startDate.year();
        filterFns.push((t) => startYear <= t.year);
      }
      if (this.endDate) {
        const endYear = this.endDate.year();
        filterFns.push((t) => endYear >= t.year);
      }
    }

    return filterFns;
  }
}

export class ActivityCalendarSynchroImportFilter extends DataSynchroImportFilter {
  static toActivityCalendarFilter(source: Partial<ActivityCalendarSynchroImportFilter>): ActivityCalendarFilter {
    if (!source) return undefined;
    const target = ActivityCalendarFilter.fromObject({
      program: { label: source.programLabel },
      vesselId: source.vesselId,
      vesselIds: source.vesselIds,
      startDate: source.startDate,
      endDate: source.endDate,
    });

    // Transform duration into start/end period
    if (!target.startDate && !target.endDate && source.periodDuration > 0 && source.periodDurationUnit) {
      target.startDate = DateUtils.moment()
        .utc(false)
        .startOf('day')
        .add(-1 * source.periodDuration, source.periodDurationUnit);
    }

    return target;
  }
}
