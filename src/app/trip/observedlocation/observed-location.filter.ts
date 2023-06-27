import { LandingFilter } from '../landing/landing.filter';
import { RootDataEntityFilter } from '../../data/services/model/root-data-filter.model';
import { ObservedLocation } from './observed-location.model';
import { EntityAsObjectOptions, EntityClass, FilterFn, isNotEmptyArray, isNotNil, Person, ReferentialRef, ReferentialUtils } from '@sumaris-net/ngx-components';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';

@EntityClass({typename: 'ObservedLocationFilterVO'})
export class ObservedLocationFilter extends RootDataEntityFilter<ObservedLocationFilter, ObservedLocation> {

  static fromObject: (source: any, opts?: any) => ObservedLocationFilter;
  static toLandingFilter(source: Partial<ObservedLocationFilter>): LandingFilter {
    if (!source) return undefined;
    return LandingFilter.fromObject({
      program: source.program,
      startDate: source.startDate,
      endDate: source.endDate,
      location: source.location,
      locations: source.locations
    });
  }
  static fromLandingFilter(source: Partial<LandingFilter>): ObservedLocationFilter {
    if (!source) return undefined;
    return ObservedLocationFilter.fromObject({
      program: source.program,
      startDate: source.startDate,
      endDate: source.endDate,
      location: source.location,
      locations: source.locations
    });
  }

  location?: ReferentialRef;
  locations?: ReferentialRef[];
  observers?: Person[];

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.location = ReferentialRef.fromObject(source.location);
    this.observers = source.observers && source.observers.map(Person.fromObject) || [];
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      // Location
      target.locationIds = isNotNil(this.location?.id) ? [this.location.id] : (this.locations || []).map(l => l.id).filter(isNotNil);
      delete target.location;
      delete target.locations;

      // Observers
      target.observerPersonIds = this.observers && this.observers.map(o => o && o.id).filter(isNotNil) || undefined;
      delete target.observers;
    } else {
      target.location = this.location && this.location.asObject(opts) || undefined;
      target.observers = this.observers && this.observers.map(o => o && o.asObject(opts)).filter(isNotNil) || undefined;
    }
    return target;
  }

  buildFilter(): FilterFn<ObservedLocation>[] {
    const filterFns = super.buildFilter();

    // Location
    if (ReferentialUtils.isNotEmpty(this.location)) {
      const locationId = this.location.id;
      filterFns.push(t => (t.location && t.location.id === locationId));
    }

    // Start/end period
    if (this.startDate) {
      const startDate = this.startDate.clone();
      filterFns.push(t => t.endDateTime ? startDate.isSameOrBefore(t.endDateTime)
        : startDate.isSameOrBefore(t.startDateTime));
    }
    if (this.endDate) {
      const endDate = this.endDate.clone().add(1, 'day').startOf('day');
      filterFns.push(t => t.startDateTime && endDate.isAfter(t.startDateTime));
    }

    // Recorder department and person
    // Already defined in super classes root-data-filter.model.ts et data-filter.model.ts

    // Observers
    const observerIds = this.observers && this.observers.map(o => o && o.id).filter(isNotNil);
    if (isNotEmptyArray(observerIds)) {
      filterFns.push(t => t.observers && t.observers.findIndex(o => o && observerIds.includes(o.id)) != -1);
    }
    return filterFns;
  }
}

export class ObservedLocationOfflineFilter extends DataSynchroImportFilter {
  locationIds?: number[];

}
