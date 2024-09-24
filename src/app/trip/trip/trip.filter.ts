import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import {
  DateUtils,
  Department,
  EntityAsObjectOptions,
  EntityClass,
  FilterFn,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  Person,
  ReferentialRef,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { Trip } from './trip.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { OperationFilter } from '@app/trip/operation/operation.filter';
import { PhysicalGearFilter } from '@app/trip/physicalgear/physical-gear.filter';
import { DataSynchroImportFilter } from '@app/data/services/root-data-synchro-service.class';
import { BBox } from 'geojson';

@EntityClass({ typename: 'TripFilterVO' })
export class TripFilter extends RootDataEntityFilter<TripFilter, Trip> {
  static fromObject: (source: any, opts?: any) => TripFilter;
  static EXCLUDED_CRITERIA_COUNT_KEYS: (keyof TripFilter)[] = ['hasScientificCruise', 'hasObservedLocation'];

  static toPhysicalGearFilter(f: Partial<TripFilter>): PhysicalGearFilter {
    if (!f) return undefined;
    return PhysicalGearFilter.fromObject({
      program: f.program,
      vesselId: f.vesselId,
      vesselIds: f.vesselIds,
      startDate: f.startDate,
      endDate: f.endDate,
    });
  }

  static toOperationFilter(f: Partial<TripFilter>): OperationFilter {
    if (!f) return undefined;
    return OperationFilter.fromObject({
      programLabel: f.program?.label,
      vesselId: f.vesselId,
      vesselIds: f.vesselIds,
      startDate: f.startDate,
      endDate: f.endDate,
      boundingBox: f.boundingBox,
    });
  }

  vesselId: number = null;
  vesselSnapshot: VesselSnapshot = null;
  vesselSnapshots: VesselSnapshot[] = null;
  vesselIds: number[] = null;
  location: ReferentialRef = null;
  locations: ReferentialRef[] = null;
  recorderDepartments: Department[] = null;
  recorderPersons: Person[] = null;
  startDate: Moment = null;
  endDate: Moment = null;
  observers?: Person[];
  includedIds: number[];
  excludedIds: number[];
  boundingBox?: BBox;
  observedLocationId: number;
  hasScientificCruise: boolean;
  hasObservedLocation: boolean;

  constructor() {
    super();
    this.dataQualityStatus = 'VALIDATED';
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.vesselId = source.vdeesselId;
    this.vesselIds = source.vesselIds;
    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot);
    this.vesselSnapshots = source.vesselSnapshots && source.vesselSnapshots.map(VesselSnapshot.fromObject);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.location = ReferentialRef.fromObject(source.location);
    this.locations = (source.locations && source.locations.map(ReferentialRef.fromObject)) || [];
    this.observers = (source.observers && source.observers.map(Person.fromObject).filter(isNotNil)) || [];
    this.includedIds = source.includedIds;
    this.excludedIds = source.excludedIds;
    this.boundingBox = source.boundingBox;
    this.observedLocationId = source.observedLocationId;
    this.hasScientificCruise = source.hasScientificCruise;
    this.hasObservedLocation = source.hasObservedLocation;
    this.recorderDepartments = (source.recorderDepartments && source.recorderDepartments.map(Department.fromObject)) || [];
    this.recorderPersons = (source.recorderPersons && source.recorderPersons.map(Person.fromObject)) || [];
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

      target.vesselIds = this.vesselIds?.filter(isNotNil) || this.vesselSnapshots?.map((v) => v.id).filter(isNotNil) || undefined;
      if (isEmptyArray(target.vesselIds)) delete target.vesselIds;
      if (isNil(target.vesselId)) delete target.vesselId;
      delete target.vesselSnapshot;
      delete target.vesselSnapshots;

      // Location
      target.locationId = (this.location && this.location.id) || undefined;
      delete target.location;

      target.locationIds = isNotNil(this.location?.id) ? [this.location.id] : (this.locations || []).map((l) => l.id).filter(isNotNil);
      delete target.locations;

      // recorderdepartments
      target.recorderDepartmentIds = this.recorderDepartments?.map((d) => d.id).filter(isNotNil) || undefined;
      delete target.recorderDepartments;

      // recorderPersons
      target.recorderPersonIds = this.recorderPersons?.map((p) => p.id).filter(isNotNil) || undefined;
      delete target.recorderPersons;

      // Observers
      target.observerPersonIds = (isNotEmptyArray(this.observers) && this.observers.map((o) => o && o.id).filter(isNotNil)) || undefined;
      delete target.observers;

      // Exclude scientific cruise by default
      if (isNil(target.hasScientificCruise)) {
        target.hasScientificCruise = false;
      }

      // Exclude observed location by default
      if (isNil(target.hasObservedLocation)) {
        target.hasObservedLocation = false;
      }
    } else {
      target.vesselSnapshot = (this.vesselSnapshot && this.vesselSnapshot.asObject(opts)) || undefined;
      target.location = (this.location && this.location.asObject(opts)) || undefined;
      target.observers = (this.observers && this.observers.map((o) => o && o.asObject(opts)).filter(isNotNil)) || [];
    }
    return target;
  }

  buildFilter(): FilterFn<Trip>[] {
    const filterFns = super.buildFilter();

    // Filter excluded/included ids
    if (isNotEmptyArray(this.excludedIds)) {
      const excludedIds = this.excludedIds;
      filterFns.push((t) => isNil(t.id) || !excludedIds.includes(t.id));
    }
    if (isNotEmptyArray(this.includedIds)) {
      const includedIds = this.includedIds;
      filterFns.push((t) => isNotNil(t.id) && includedIds.includes(t.id));
    }

    // Vessel
    const vesselId = isNotNil(this.vesselId) ? this.vesselId : this.vesselSnapshot?.id;
    if (isNotNil(vesselId)) {
      filterFns.push((t) => t.vesselSnapshot?.id === vesselId);
    }

    const vesselSnapshotIds = this.vesselIds?.filter(isNotNil) || this.vesselSnapshots?.map((v) => v.id).filter(isNotNil);
    if (isNotEmptyArray(vesselSnapshotIds)) {
      filterFns.push((t) => t.vesselSnapshot && vesselSnapshotIds.includes(t.vesselSnapshot.id));
    }

    // Location
    if (ReferentialUtils.isNotEmpty(this.location)) {
      const locationId = this.location.id;
      filterFns.push(
        (t) => (t.departureLocation && t.departureLocation.id === locationId) || (t.returnLocation && t.returnLocation.id === locationId)
      );
    }

    const locationIds = isNotEmptyArray(this.locations) ? this.locations.map((l) => l.id).filter(isNotNil) : [];
    if (isNotEmptyArray(locationIds)) {
      filterFns.push(
        (t) =>
          (t.departureLocation && locationIds.includes(t.departureLocation.id)) || (t.returnLocation && locationIds.includes(t.returnLocation.id))
      );
    }

    // Recorder department

    const recorderDepartmentIds = this.recorderDepartments?.map((d) => d.id).filter(isNotNil);
    if (isNotEmptyArray(recorderDepartmentIds)) {
      filterFns.push((t) => t.recorderDepartment && recorderDepartmentIds.includes(t.recorderDepartment.id));
    }

    // Recorder person
    const recorderPersonIds = this.recorderPersons?.map((p) => p.id).filter(isNotNil);
    if (isNotEmptyArray(recorderPersonIds)) {
      filterFns.push((t) => t.recorderPerson && recorderPersonIds.includes(t.recorderPerson.id));
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

    // Observers
    const observerIds = this.observers?.map((o) => o.id).filter(isNotNil);
    if (isNotEmptyArray(observerIds)) {
      filterFns.push((t) => t.observers?.some((o) => o && observerIds.includes(o.id)));
    }

    // has scientific cruise
    // TODO

    return filterFns;
  }

  isEmpty(): boolean {
    return super.isEmpty();
  }

  protected isCriteriaNotEmpty(key: keyof TripFilter, value: any): boolean {
    return !TripFilter.EXCLUDED_CRITERIA_COUNT_KEYS.includes(key) && super.isCriteriaNotEmpty(key, value);
  }
}

export class TripSynchroImportFilter extends DataSynchroImportFilter {
  static toTripFilter(source: Partial<TripSynchroImportFilter>): TripFilter {
    if (!source) return undefined;

    const target = TripFilter.fromObject({
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
