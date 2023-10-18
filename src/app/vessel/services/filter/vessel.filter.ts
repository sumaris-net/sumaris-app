import {
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  EntityUtils,
  FilterFn,
  fromDateISOString,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { Vessel, VesselFeatures, VesselRegistrationPeriod } from '../model/vessel.model';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { Moment } from 'moment';
import { key } from 'ionicons/icons';

@EntityClass({typename: 'VesselFilterVO'})
export class VesselFilter extends RootDataEntityFilter<VesselFilter, Vessel> {

  static fromObject: (source: any, opts?: any) => VesselFilter;

  static EXCLUDE_CRITERIA_COUNT = ['statusIds', 'onlyWithRegistration'];

  searchText: string;
  searchAttributes: string[];
  date: Moment;
  vesselId: number;
  statusId: number;
  statusIds: number[];
  onlyWithRegistration: boolean;

  // (e.g. Can be a country flag, or the exact registration location)
  // Filter (on pod) will use LocationHierarchy) but NOT local filtering
  registrationLocation: ReferentialRef;
  basePortLocation: ReferentialRef;
  vesselType: ReferentialRef;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.searchText = source.searchText;
    this.searchAttributes = source.searchAttributes || undefined;
    this.date = fromDateISOString(source.date);
    this.vesselId = source.vesselId;
    this.statusId = source.statusId;
    this.statusIds = source.statusIds;
    this.onlyWithRegistration = source.onlyWithRegistration;
    this.registrationLocation = ReferentialRef.fromObject(source.registrationLocation) ||
      isNotNilOrBlank(source.registrationLocationId) && ReferentialRef.fromObject({id: source.registrationLocationId}) || undefined;
    this.basePortLocation = ReferentialRef.fromObject(source.basePortLocation) ||
      isNotNilOrBlank(source.basePortLocationId) && ReferentialRef.fromObject({id: source.basePortLocationId}) || undefined;
    this.vesselType = ReferentialRef.fromObject(source.vesselType) ||
      isNotNilOrBlank(source.vesselTypeId) && ReferentialRef.fromObject({id: source.vesselTypeId}) || undefined;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.date = toDateISOString(this.date);
    if (opts && opts.minify) {
      target.statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
      delete target.statusId;

      target.registrationLocationId = this.registrationLocation?.id;
      delete target.registrationLocation;

      target.basePortLocationId = this.basePortLocation?.id;
      delete target.basePortLocation;

      target.vesselTypeId = this.vesselType?.id;
      delete target.vesselType;

      if (target.onlyWithRegistration !== true) delete target.onlyWithRegistration;
    }
    else {
      target.registrationLocation = this.registrationLocation?.asObject(opts);
      target.basePortLocation = this.basePortLocation?.asObject(opts);
      target.vesselType = this.vesselType?.asObject(opts);
    }
    return target;
  }

  buildFilter(): FilterFn<Vessel>[] {
    const filterFns = super.buildFilter();

    // Vessel id
    if (isNotNil(this.vesselId)) {
      filterFns.push(t => t.id === this.vesselId);
    }

    // Status
    const statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
    if (isNotEmptyArray(statusIds)) {
      filterFns.push(t => statusIds.includes(t.statusId));
    }

    // Only with registration
    if (this.onlyWithRegistration) {
      filterFns.push(t => isNotNil(t.vesselRegistrationPeriod));
    }

    // registration location
    const registrationLocationId = this.registrationLocation?.id;
    if (isNotNil(registrationLocationId)) {
      filterFns.push(t => (t.vesselRegistrationPeriod?.registrationLocation?.id === registrationLocationId));
    }

    // base port location
    const basePortLocationId = this.basePortLocation?.id;
    if (isNotNil(basePortLocationId)) {
      filterFns.push(t => (t.vesselFeatures?.basePortLocation?.id === basePortLocationId));
    }

    // Vessel type
    const vesselTypeId = this.vesselType?.id;
    if (isNotNil(vesselTypeId)) {
      filterFns.push(t => (t.vesselType?.id === vesselTypeId));
    }

    const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || ['vesselFeatures.exteriorMarking', 'vesselRegistrationPeriod.registrationCode', 'vesselFeatures.name'],
      this.searchText);
    if (searchTextFilter) filterFns.push(searchTextFilter);

    return filterFns;
  }

  protected isCriteriaNotEmpty(key: string, value: any): boolean {
    return !VesselFilter.EXCLUDE_CRITERIA_COUNT.includes(key)
      && super.isCriteriaNotEmpty(key, value);
  }
}

@EntityClass({typename: 'VesselFeaturesFilterVO'})
export class VesselFeaturesFilter extends EntityFilter<VesselFeaturesFilter, VesselFeatures> {

  static fromObject: (source: any, opts?: any) => VesselFeaturesFilter;

  vesselId: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
  }

  protected buildFilter(): FilterFn<VesselFeatures>[] {
    const filterFns = super.buildFilter();
    if (isNotNil(this.vesselId)) {
      filterFns.push((e) => e.vesselId === this.vesselId);
    }

    return filterFns;
  }

}

@EntityClass({typename: 'VesselRegistrationFilterVO'})
export class VesselRegistrationFilter extends EntityFilter<VesselRegistrationFilter, VesselRegistrationPeriod> {

  static fromObject: (source: any, opts?: any) => VesselRegistrationFilter;

  vesselId: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      vesselId: this.vesselId
    };
  }

  protected buildFilter(): FilterFn<VesselRegistrationPeriod>[] {
    const filterFns = super.buildFilter();

    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push((e) => e.vesselId === vesselId);
    }

    return filterFns;
  }
}
