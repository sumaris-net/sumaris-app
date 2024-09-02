import { LandingFilter } from '../landing/landing.filter';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { ObservedLocation } from './observed-location.model';
import {
  DateUtils,
  Department,
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  isNotEmptyArray,
  isNotNil,
  Person,
  ReferentialRef,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';

@EntityClass({ typename: 'ObservedLocationFilterVO' })
export class ObservedLocationFilter extends RootDataEntityFilter<ObservedLocationFilter, ObservedLocation> {
  static fromObject: (source: any, opts?: any) => ObservedLocationFilter;
  static toLandingFilter(source: Partial<ObservedLocationFilter>): LandingFilter {
    if (!source) return undefined;
    return LandingFilter.fromObject({
      program: source.program,
      startDate: source.startDate,
      endDate: source.endDate,
      location: source.location,
      locations: source.locations,
      vesselIds: source.vesselIds,
      recorderPerson: source.recorderPerson,
      observers: source.observers,
    });
  }
  static fromLandingFilter(source: Partial<LandingFilter>): ObservedLocationFilter {
    if (!source) return undefined;
    return ObservedLocationFilter.fromObject({
      program: source.program,
      startDate: source.startDate,
      endDate: source.endDate,
      location: source.location,
      locations: source.locations,
      vesselIds: isNotNil(source.vesselId) ? [source.vesselId] : source.vesselIds,
      observers: source.observers,
    });
  }

  location?: ReferentialRef;
  locations?: ReferentialRef[];
  locationIds?: number[];
  observers?: Person[];
  vesselIds?: number[];
  recorderPersons?: Person[];
  recorderDepartments?: Department[];

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.location = ReferentialRef.fromObject(source.location);
    this.locationIds = source.locationIds;
    this.locations = (source.locations && source.locations.map(ReferentialRef.fromObject)) || [];
    this.observers = (source.observers[0] && source.observers[0].map(Person.fromObject)) || [];
    this.vesselIds = source.vesselIds || null;
    this.recorderPersons = (source.recorderPersons && source.recorderPersons.map(Person.fromObject)) || [];
    this.recorderDepartments = (source.recorderDepartments && source.recorderDepartments.map(Department.fromObject)) || [];
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      // Location
      target.locationIds = isNotNil(this.location?.id) ? [this.location.id] : (this.locations || []).map((l) => l.id).filter(isNotNil);
      delete target.location;
      delete target.locations;

      target.recorderPersonIds = this.recorderPersons?.map((p) => p.id) || undefined;
      delete target.recorderPersons;

      target.recorderDepartmentIds = isNotNil(this.recorderDepartments)
        ? this.recorderDepartments && this.recorderDepartments.map((d) => d.id)
        : undefined;

      // Observers
      target.observerPersonIds = (this.observers && this.observers.map((o) => o && o.id).filter(isNotNil)) || undefined;
      delete target.observers;
    } else {
      target.location = (this.location && this.location.asObject(opts)) || undefined;
      target.observers = (this.observers && this.observers.map((o) => o && o.asObject(opts)).filter(isNotNil)) || undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<ObservedLocation>[] {
    const filterFns = super.buildFilter();

    // Locations
    const locationIds = this.locationIds || (ReferentialUtils.isNotEmpty(this.location) ? [this.location.id] : this.locations?.map((l) => l.id));
    if (isNotEmptyArray(locationIds)) {
      filterFns.push((t) => t.location && locationIds.includes(t.location.id));
    }

    // Start/end period
    if (this.startDate) {
      const startDate = this.startDate.clone();
      filterFns.push((t) => (t.endDateTime ? startDate.isSameOrBefore(t.endDateTime) : startDate.isSameOrBefore(t.startDateTime)));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push((t) => t.startDateTime && endDate.isAfter(t.startDateTime));
    }

    // Recorder persons
    const recorderPersonIds = this.recorderPersons?.map((p) => p.id);
    if (isNotNil(recorderPersonIds)) {
      filterFns.push((t) => t.recorderPerson && recorderPersonIds.includes(t.recorderPerson.id));
    }

    //departments
    const recorderDepartmentIds = ReferentialUtils.isNotEmpty(this.recorderDepartment)
      ? [this.recorderDepartment.id]
      : this.recorderDepartments?.map((l) => l.id);
    if (isNotEmptyArray(recorderDepartmentIds)) {
      filterFns.push((t) => t.recorderDepartment && recorderDepartmentIds.includes(t.recorderDepartment.id));
    }
    // Recorder department and person
    // Already defined in super classes root-data-filter.model.ts et data-filter.model.ts

    // Observers
    const observerIds = this.observers?.map((o) => o && o.id).filter(isNotNil);
    if (isNotEmptyArray(observerIds)) {
      filterFns.push((t) => t.observers?.some((o) => o && observerIds.includes(o.id)));
    }
    return filterFns;
  }
}

export class ObservedLocationOfflineFilter extends DataSynchroImportFilter {
  static toObservedLocationFilter(source: any): ObservedLocationFilter {
    if (!source) return source;
    const target = ObservedLocationFilter.fromObject({
      program: { label: source.programLabel },
      locationIds: source.locationIds,
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

  locationIds?: number[];

  fromObject(source: any, opts?: { minify?: boolean }) {
    super.fromObject(source, opts);
    this.locationIds = source.locationIds;
  }
}
