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
import { VesselOwnerPeriod } from '../model/vessel-owner-period.model';
import { StoreObject } from '@apollo/client/core';
import { IVesselPeriodEntity } from '@app/vessel/services/model/vessel.utils';

@EntityClass({ typename: 'VesselFilterVO' })
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
    this.registrationLocation =
      ReferentialRef.fromObject(source.registrationLocation) ||
      (isNotNilOrBlank(source.registrationLocationId) && ReferentialRef.fromObject({ id: source.registrationLocationId })) ||
      undefined;
    this.basePortLocation =
      ReferentialRef.fromObject(source.basePortLocation) ||
      (isNotNilOrBlank(source.basePortLocationId) && ReferentialRef.fromObject({ id: source.basePortLocationId })) ||
      undefined;
    this.vesselType =
      ReferentialRef.fromObject(source.vesselType) ||
      (isNotNilOrBlank(source.vesselTypeId) && ReferentialRef.fromObject({ id: source.vesselTypeId })) ||
      undefined;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.date = toDateISOString(this.date);
    if (opts?.minify) {
      target.statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
      delete target.statusId;

      target.registrationLocationId = this.registrationLocation?.id;
      delete target.registrationLocation;

      target.basePortLocationId = this.basePortLocation?.id;
      delete target.basePortLocation;

      target.vesselTypeId = this.vesselType?.id;
      delete target.vesselType;

      if (target.onlyWithRegistration !== true) delete target.onlyWithRegistration;
    } else {
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
      filterFns.push((t) => t.id === this.vesselId);
    }

    // Status
    const statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
    if (isNotEmptyArray(statusIds)) {
      filterFns.push((t) => statusIds.includes(t.statusId));
    }

    // Only with registration
    if (this.onlyWithRegistration) {
      filterFns.push((t) => isNotNil(t.vesselRegistrationPeriod));
    }

    // registration location
    const registrationLocationId = this.registrationLocation?.id;
    if (isNotNil(registrationLocationId)) {
      filterFns.push((t) => t.vesselRegistrationPeriod?.registrationLocation?.id === registrationLocationId);
    }

    // base port location
    const basePortLocationId = this.basePortLocation?.id;
    if (isNotNil(basePortLocationId)) {
      filterFns.push((t) => t.vesselFeatures?.basePortLocation?.id === basePortLocationId);
    }

    // Vessel type
    const vesselTypeId = this.vesselType?.id;
    if (isNotNil(vesselTypeId)) {
      filterFns.push((t) => t.vesselType?.id === vesselTypeId);
    }

    const searchTextFilter = EntityUtils.searchTextFilter(
      this.searchAttributes || ['vesselFeatures.exteriorMarking', 'vesselRegistrationPeriod.registrationCode', 'vesselFeatures.name'],
      this.searchText
    );
    if (searchTextFilter) filterFns.push(searchTextFilter);

    return filterFns;
  }

  protected isCriteriaNotEmpty(key: string, value: any): boolean {
    return !VesselFilter.EXCLUDE_CRITERIA_COUNT.includes(key) && super.isCriteriaNotEmpty(key, value);
  }
}

export abstract class BaseVesselWithPeriodFilter<F extends EntityFilter<F, T>, T extends IVesselPeriodEntity<T>> extends EntityFilter<F, T> {
  vesselId: number;
  startDate: Moment;
  endDate: Moment;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vesselId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    return target;
  }

  protected buildFilter(): FilterFn<T>[] {
    const filterFns = super.buildFilter();
    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push((e) => e.vesselId === vesselId);
    }

    // StartDate Filter
    if (isNotNil(this.startDate)) {
      const startDate = this.startDate;
      filterFns.push((period) => {
        return (period.endDate && startDate.isSameOrBefore(period.endDate)) || (period.startDate && startDate.isSameOrBefore(period.startDate));
      });
    }

    // EndDate Filter
    if (isNotNil(this.endDate)) {
      const endDate = this.endDate;
      filterFns.push((period) => {
        return (period.endDate && endDate.isSameOrAfter(period.endDate)) || (period.startDate && endDate.isSameOrAfter(period.startDate));
      });
    }
    return filterFns;
  }
}

@EntityClass({ typename: 'VesselFeaturesFilterVO' })
export class VesselFeaturesFilter extends BaseVesselWithPeriodFilter<VesselFeaturesFilter, VesselFeatures> {
  static fromObject: (source: any, opts?: any) => VesselFeaturesFilter;
}

@EntityClass({ typename: 'VesselRegistrationPeriodFilterVO' })
export class VesselRegistrationPeriodFilter extends BaseVesselWithPeriodFilter<VesselRegistrationPeriodFilter, VesselRegistrationPeriod> {
  static fromObject: (source: any, opts?: any) => VesselRegistrationPeriodFilter;
}

@EntityClass({ typename: 'VesselOwnerPeriodFilterVO' })
export class VesselOwnerPeriodFilter extends BaseVesselWithPeriodFilter<VesselOwnerPeriodFilter, VesselOwnerPeriod> {
  static fromObject: (source: any, opts?: any) => VesselOwnerPeriodFilter;
}
