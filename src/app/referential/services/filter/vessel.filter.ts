import { VesselSnapshot } from '../model/vessel-snapshot.model';
import { Moment } from 'moment';
import {
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  EntityUtils,
  FilterFn,
  fromDateISOString,
  isNil,
  isNotEmptyArray,
  isNotNil,
  isNotNilOrBlank,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { SynchronizationStatus } from '@app/data/services/model/model.utils';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';

@EntityClass({ typename: 'VesselFilterVO' })
export class VesselSnapshotFilter extends EntityFilter<VesselSnapshotFilter, VesselSnapshot> {
  static DEFAULT_SEARCH_ATTRIBUTES = ['exteriorMarking', 'name'];
  static fromObject: (source: any, opts?: any) => VesselSnapshotFilter;

  static fromVesselFilter(filter?: Partial<VesselFilter>) {
    if (!filter) return undefined;
    return this.fromObject(filter);
  }

  program: ReferentialRef;
  startDate: Moment;
  endDate: Moment;
  date: Moment;
  vesselId: number;
  includedIds: number[];
  excludedIds: number[];
  searchText: string;
  searchAttributes: string[];
  statusId: number;
  statusIds: number[];
  synchronizationStatus: SynchronizationStatus;
  // (e.g. Can be a country flag, or the exact registration location)
  // Filter (on pod) will use LocationHierarchy) but NOT local filtering
  registrationLocation: ReferentialRef;
  basePortLocation: ReferentialRef;
  vesselType: ReferentialRef;
  vesselTypeId: number;
  vesselTypeIds: number[];
  onlyWithRegistration: boolean;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.program =
      ReferentialRef.fromObject(source.program) ||
      (isNotNilOrBlank(source.programLabel) && ReferentialRef.fromObject({ label: source.programLabel })) ||
      undefined;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.date = fromDateISOString(source.date);
    this.vesselId = source.vesselId;
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.searchText = source.searchText;
    this.searchAttributes = source.searchAttributes;
    this.statusId = source.statusId;
    this.statusIds = source.statusIds;
    this.synchronizationStatus = source.synchronizationStatus;
    this.onlyWithRegistration = source.onlyWithRegistration;
    this.registrationLocation =
      ReferentialRef.fromObject(source.registrationLocation) ||
      (isNotNilOrBlank(source.registrationLocationId) && ReferentialRef.fromObject({ id: source.registrationLocationId })) ||
      undefined;
    this.basePortLocation =
      ReferentialRef.fromObject(source.basePortLocation) ||
      (isNotNilOrBlank(source.basePortLocationId) && ReferentialRef.fromObject({ id: source.basePortLocationId })) ||
      undefined;
    this.vesselTypeId = source.vesselTypeId;
    this.vesselTypeIds = source.vesselTypeIds;
    this.vesselType =
      ReferentialRef.fromObject(source.vesselType) ||
      (isNotNilOrBlank(source.vesselTypeId) && ReferentialRef.fromObject({ id: source.vesselTypeId })) ||
      undefined;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    if (this.date) {
      target.date = toDateISOString(this.date);
      delete target.startDate;
      delete target.endDate;
    } else {
      target.startDate = toDateISOString(this.startDate);
      target.endDate = toDateISOString(this.endDate);
      delete target.date;
    }
    if (opts?.minify) {
      target.programLabel = this.program && this.program.label;
      delete target.program;

      // NOT in pod
      delete target.synchronizationStatus;

      target.registrationLocationId = this.registrationLocation?.id;
      delete target.registrationLocation;

      target.basePortLocationId = this.basePortLocation?.id;
      delete target.basePortLocation;

      target.vesselTypeId = this.vesselTypeId ?? this.vesselType?.id;
      target.vesselTypeIds = isNil(target.vesselTypeId) ? this.vesselTypeIds : undefined;
      delete target.vesselType;

      target.statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
      delete target.statusId;
    } else {
      target.program = this.program?.asObject(opts);
      target.registrationLocation = this.registrationLocation?.asObject(opts);
      target.basePortLocation = this.basePortLocation?.asObject(opts);
      target.vesselType = this.vesselType?.asObject(opts);
    }

    return target;
  }

  protected buildFilter(): FilterFn<VesselSnapshot>[] {
    const filterFns = super.buildFilter();

    // Program
    if (this.program) {
      const programId = this.program.id;
      const programLabel = this.program.label;
      if (isNotNil(programId)) {
        filterFns.push((t) => t.program && t.program.id === programId);
      } else if (isNotNilOrBlank(programLabel)) {
        filterFns.push((t) => t.program && t.program.label === programLabel);
      }
    }

    // Vessel id
    if (isNotNil(this.vesselId)) {
      const vesselId = this.vesselId;
      filterFns.push((t) => t.id === vesselId);
    }
    // Filter included/excluded ids
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push((t) => isNotNil(t.id) && this.includedIds.includes(t.id));
    }
    if (isNotEmptyArray(this.excludedIds)) {
      filterFns.push((t) => isNil(t.id) || !this.excludedIds.includes(t.id));
    }

    // Status
    const statusIds = isNotNil(this.statusId) ? [this.statusId] : this.statusIds;
    if (statusIds) {
      filterFns.push((t) => statusIds.includes(t.vesselStatusId));
    }

    // registration location
    const registrationLocationId = this.registrationLocation?.id;
    if (isNotNil(registrationLocationId)) {
      filterFns.push((t) => t.registrationLocation?.id === registrationLocationId);
    }

    // base port location
    const basePortLocationId = this.basePortLocation?.id;
    if (isNotNil(basePortLocationId)) {
      filterFns.push((t) => t.basePortLocation?.id === basePortLocationId);
    }

    // Vessel type
    const vesselTypeId = this.vesselTypeId ?? this.vesselType?.id;
    const vesselTypeIds = isNotNil(vesselTypeId) ? [vesselTypeId] : this.vesselTypeIds;
    if (isNotEmptyArray(vesselTypeIds)) {
      filterFns.push((t) => isNotNil(t.vesselType?.id) && vesselTypeIds.includes(t.vesselType.id));
    }

    // Start date
    const startDate = this.startDate || this.date;
    if (isNotNil(startDate)) {
      filterFns.push((v) => !v.endDate || startDate.isSameOrBefore(v.endDate));
    }

    // End date
    const endDate = this.endDate || this.date;
    if (isNotNil(endDate)) {
      filterFns.push((v) => endDate.isSameOrAfter(v.startDate));
    }

    // Search text
    const searchTextFilter = EntityUtils.searchTextFilter(this.searchAttributes || VesselSnapshotFilter.DEFAULT_SEARCH_ATTRIBUTES, this.searchText);
    if (searchTextFilter) filterFns.push(searchTextFilter);

    // Synchronization status
    if (this.synchronizationStatus) {
      if (this.synchronizationStatus === 'SYNC') {
        filterFns.push(EntityUtils.isRemote);
      } else {
        filterFns.push(EntityUtils.isLocal);
      }
    }

    return filterFns;
  }
}
