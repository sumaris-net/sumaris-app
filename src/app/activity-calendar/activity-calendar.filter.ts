import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import {
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { ActivityCalendar } from './model/activity-calendar.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';

@EntityClass({ typename: 'ActivityCalendarFilterVO' })
export class ActivityCalendarFilter extends RootDataEntityFilter<ActivityCalendarFilter, ActivityCalendar> {
  static fromObject: (source: any, opts?: any) => ActivityCalendarFilter;

  vesselId: number = null;
  vesselSnapshot: VesselSnapshot = null;
  location: ReferentialRef = null;
  startDate: Moment = null;
  endDate: Moment = null;
  includedIds: number[];
  excludedIds: number[];
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
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.observedLocationId = source.observedLocationId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);

    if (opts && opts.minify) {
      // Vessel
      target.vesselId = isNotNil(this.vesselId) ? this.vesselId : this.vesselSnapshot?.id;
      delete target.vesselSnapshot;

      // Location
      target.locationId = (this.location && this.location.id) || undefined;
      delete target.location;
    } else {
      target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
      target.location = (this.location && this.location.asObject(opts)) || undefined;
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

    // Location
    if (ReferentialUtils.isNotEmpty(this.location)) {
      const locationId = this.location.id;
      filterFns.push((t) => (t.vesselUseFeatures || []).some((vuf) => vuf.basePortLocation && vuf.basePortLocation.id === locationId));
    }

    // Start/end period
    if (this.startDate) {
      const startYear = this.startDate.year();
      filterFns.push((t) => startYear <= t.year);
    }
    if (this.endDate) {
      const endYear = this.endDate.year();
      filterFns.push((t) => endYear >= t.year);
    }

    return filterFns;
  }
}

export class ActivityCalendarSynchroImportFilter extends DataSynchroImportFilter {

  static toActivityCalendarFilter(f: ActivityCalendarSynchroImportFilter): ActivityCalendarFilter {
    if (!f) return undefined;
    return ActivityCalendarFilter.fromObject({
      program: {label: f.programLabel},
      vesselId: f.vesselId,
      startDate: f.startDate,
      endDate: f.endDate
    });
  }

}
