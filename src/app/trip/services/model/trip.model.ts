import { isMoment, Moment } from 'moment';
import { DataEntity, DataEntityAsObjectOptions, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '@app/data/services/model/data-entity.model';
import { IEntityWithMeasurement, Measurement, MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import { Sale } from './sale.model';
import {
  EntityClass,
  EntityUtils,
  fromDateISOString,
  isEmptyArray,
  isNil,
  isNotEmptyArray,
  isNotNil,
  Person,
  ReferentialAsObjectOptions,
  ReferentialRef,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { FishingArea } from '../../../data/services/model/fishing-area.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { IWithObserversEntity } from '@app/data/services/model/model.utils';
import { RootDataEntity } from '@app/data/services/model/root-data-entity.model';
import { Landing } from './landing.model';
import { Sample } from './sample.model';
import { Batch } from './batch.model';
import { IWithProductsEntity, Product } from './product.model';
import { IWithPacketsEntity, Packet } from './packet.model';
import { ExpectedSale } from '@app/trip/services/model/expected-sale.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Metier } from '@app/referential/services/model/metier.model';
import { SortDirection } from '@angular/material/sort';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { VesselPosition } from '@app/data/services/model/vessel-position.model';

/* -- Helper function -- */


/* -- Data -- */


export interface OperationAsObjectOptions extends DataEntityAsObjectOptions {
  batchAsTree?: boolean;
  sampleAsTree?: boolean;
  keepTrip?: boolean; //Allow to keep trip, needed to apply filter on local storage
}

export interface OperationFromObjectOptions {
  withSamples?: boolean;
  withBatchTree?: boolean;
}

export const MINIFY_OPERATION_FOR_LOCAL_STORAGE = Object.freeze(<OperationAsObjectOptions>{
  ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  batchAsTree: false,
  sampleAsTree: false,
  keepTrip: true // Trip is needed to apply filter on it

});

export const FISHING_AREAS_LOCATION_REGEXP = /^fishingAreas\.[0-9]+\.location$/;
export const POSITIONS_REGEXP = /^startPosition|fishingStartPosition|fishingEndPosition|endPosition$/

@EntityClass({typename: 'OperationVO'})
export class Operation
  extends DataEntity<Operation, number, OperationAsObjectOptions, OperationFromObjectOptions> {

  static fromObject: (source: any, opts?: OperationFromObjectOptions) => Operation;

  startDateTime: Moment = null;
  endDateTime: Moment = null;
  fishingStartDateTime: Moment = null;
  fishingEndDateTime: Moment = null;
  comments: string = null;
  rankOrderOnPeriod: number = null;
  hasCatch: boolean = null;
  positions: VesselPosition[] = null;
  startPosition: VesselPosition = null;
  fishingStartPosition: VesselPosition = null;
  fishingEndPosition: VesselPosition = null;
  endPosition: VesselPosition = null;

  metier: Metier = null;
  physicalGear: PhysicalGear = null;

  tripId: number = null;
  trip?: Trip;
  vesselId: number = null; // Copy from trip (need by local filter)
  programLabel: string = null; // Copy from trip (need by local filter)

  measurements: Measurement[] = [];
  samples: Sample[] = null;
  catchBatch: Batch = null;
  fishingAreas: FishingArea[] = [];
  parentOperationId: number = null;
  parentOperation: Operation = null;
  childOperationId: number = null;
  childOperation: Operation = null;

  constructor() {
    super(Operation.TYPENAME);
  }

  asObject(opts?: OperationAsObjectOptions): any {
    const target = super.asObject(opts);

    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.fishingStartDateTime = toDateISOString(this.fishingStartDateTime);
    target.fishingEndDateTime = toDateISOString(this.fishingEndDateTime);

    // Fill start position (if valid)
    if (target.startPosition && target.startPosition.latitude && target.startPosition.longitude) {
      target.startPosition.dateTime = target.startDateTime;
    }
    else {
      // Invalid position: remove it
      delete target.startPosition;
    }

    // Fill fishing start position (if valid)
    if (target.fishingStartPosition && target.fishingStartPosition.latitude && target.fishingStartPosition.longitude) {
      // Make sure to fill fishing start date, using start date if need
      target.fishingStartDateTime = target.fishingStartDateTime || target.startDateTime;
      target.fishingStartPosition.dateTime = target.fishingStartDateTime;
    }
    else {
      // Invalid position: remove it
      delete target.fishingStartPosition;
    }

    // Fill fishing start position (if valid)
    if (target.fishingEndPosition && target.fishingEndPosition.latitude && target.fishingEndPosition.longitude) {
      target.fishingEndDateTime = target.fishingEndDateTime || target.fishingStartDateTime || target.startDateTime;
      target.fishingEndPosition.dateTime = target.fishingEndDateTime;
    }
    else {
      // Invalid position: remove it
      delete target.fishingEndPosition;
    }

    // Fill end date, by using start date (because NOT NULL constraint on Pod)
    target.endDateTime = target.endDateTime || target.fishingEndDateTime || target.fishingStartDateTime || target.startDateTime;

    // Fill end position date/time (if valid = has latitude AND longitude)
    if (target.endPosition && target.endPosition.latitude && target.endPosition.longitude) {
      target.endPosition.dateTime = target.endDateTime;
    }
    // Invalid position (missing latitude or longitude - allowed in on FIELD mode): remove it
    else {
      delete target.endPosition;
    }

    // Create an array of position, instead of start/end
    target.positions = [
      target.startPosition,
      target.fishingStartPosition,
      target.fishingEndPosition,
      target.endPosition]
      .filter(p => p && p.dateTime)
      .map(p => p && p.asObject(opts)) || undefined;
    delete target.startPosition;
    delete target.fishingStartPosition;
    delete target.fishingEndPosition;
    delete target.endPosition;

    // Physical gear
    target.physicalGear = this.physicalGear && this.physicalGear.asObject({...opts, ...NOT_MINIFY_OPTIONS /*Avoid minify, to keep gear for operations tables cache*/});
    if (target.physicalGear) delete target.physicalGear.measurementValues;
    target.physicalGearId = this.physicalGear && this.physicalGear.id;
    if (opts && opts.keepLocalId === false && target.physicalGearId < 0) {
      delete target.physicalGearId; // Remove local id
    }

    // Metier
    target.metier = this.metier && this.metier.asObject({...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/}) || undefined;

    // Measurements
    target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;

    // Samples
    {
      // Serialize samples into a tree (will keep only children arrays, and removed parentId and parent)
      if (!opts || opts.sampleAsTree !== false) {
        target.samples = this.samples
          // Select root samples
          && this.samples.filter(s => isNil(s.parentId) && isNil(s.parent))
            .map(s => s.asObject({...opts, withChildren: true})) || undefined;
      } else {
        // Serialize as samples array (this will fill parentId, and remove children and parent properties)
        target.samples = Sample.treeAsObjectArray(this.samples, opts);
      }
    }

    // Batch
    if (target.catchBatch) {
      // Serialize batches into a tree (will keep only children arrays, and removed parentId and parent)
      if (!opts || opts.batchAsTree !== false) {
        target.catchBatch = this.catchBatch && this.catchBatch.asObject({
          ...opts,
          withChildren: true
        }) || undefined;
      }
      // Serialize as batches array (this will fill parentId, and remove children and parent properties)
      else {
        target.batches = Batch.treeAsObjectArray(target.catchBatch, opts);
        delete target.catchBatch;
      }
    }

    // Fishing areas
    target.fishingAreas = this.fishingAreas && this.fishingAreas.map(value => value.asObject(opts)) || undefined;

    // Child/Parent operation id
    target.parentOperationId = this.parentOperationId || this.parentOperation && this.parentOperation.id;
    target.childOperationId = this.childOperationId || this.childOperation && this.childOperation.id;

    if (opts?.minify) {
      delete target.parentOperation;
      delete target.childOperation;
    } else {
      target.parentOperation = this.parentOperation && this.parentOperation.asObject(opts) || undefined;
      target.childOperation = this.childOperation && this.childOperation.asObject(opts) || undefined;
    }

    // Clean properties copied from the parent trip
    if (!opts || opts.keepTrip !== true) {
      delete target.programLabel;
      delete target.vesselId;
    }

    return target;
  }

  fromObject(source: any, opts?: OperationFromObjectOptions) {
    super.fromObject(source, opts);

    this.tripId = source.tripId;
    this.programLabel = source.programLabel;
    this.vesselId = source.vesselId;

    this.hasCatch = source.hasCatch;
    this.comments = source.comments;
    this.physicalGear = (source.physicalGear || source.physicalGearId) ? PhysicalGear.fromObject(source.physicalGear || {id: source.physicalGearId}) : undefined;
    this.startDateTime = fromDateISOString(source.startDateTime);
    this.endDateTime = fromDateISOString(source.endDateTime);
    this.fishingStartDateTime = fromDateISOString(source.fishingStartDateTime);
    this.fishingEndDateTime = fromDateISOString(source.fishingEndDateTime);
    this.rankOrderOnPeriod = source.rankOrderOnPeriod;
    this.metier = source.metier && Metier.fromObject(source.metier, {useChildAttributes: 'TaxonGroup'}) || undefined;
    if (source.startPosition || source.endPosition || source.fishingStartPosition || source.fishingEndPosition) {
      this.startPosition = VesselPosition.fromObject(source.startPosition);
      this.endPosition = VesselPosition.fromObject(source.endPosition);
      this.fishingStartPosition = VesselPosition.fromObject(source.fishingStartPosition);
      this.fishingEndPosition = VesselPosition.fromObject(source.fishingEndPosition);
      this.positions = undefined;
    } else {
      const sortedPositions = source.positions?.map(VesselPosition.fromObject).sort(VesselPositionUtils.dateTimeComparator()) || undefined;
      if (isNotEmptyArray(sortedPositions)) {

        // DEBUG
        //console.debug('[operation] Find sorted positions: ', sortedPositions.map(p => toDateISOString(p.dateTime)).join(', '));

        // Warn : should be extracted in this order, because startDateTime can be equals to endDateTime
        this.startPosition = VesselPositionUtils.findByDate(sortedPositions, this.startDateTime, true);
        this.fishingStartPosition = VesselPositionUtils.findByDate(sortedPositions, this.fishingStartDateTime, true);
        this.fishingEndPosition = VesselPositionUtils.findByDate(sortedPositions, this.fishingEndDateTime, true);
        this.endPosition = VesselPositionUtils.findByDate(sortedPositions, this.endDateTime, true);
        this.positions = undefined;
        if (sortedPositions.length > 0) {
          console.warn('[operation] Some positions have no date matches, with start/end or fishingStart/fishingEnd dates', sortedPositions);

          // Fallback for previous version compatibility, if invalid dates in position
          if ((sortedPositions.length === 1 || sortedPositions.length === 2) && !this.startPosition && !this.endPosition) {
            this.startPosition = sortedPositions[0];
            this.fishingStartPosition = undefined;
            this.fishingEndPosition = undefined;
            this.endPosition = sortedPositions[1] || undefined;
          }
        }
      }
      else {
        this.startPosition = undefined;
        this.fishingStartPosition = undefined;
        this.fishingEndPosition = undefined;
        this.endPosition = undefined;
        this.positions = sortedPositions;
      }
    }
    this.measurements = [
      ...(source.measurements && source.measurements.map(Measurement.fromObject) || []),
      ...(source.gearMeasurements && source.gearMeasurements.map(Measurement.fromObject) || [])
    ];

    // Remove fake dates (e.g. if endDateTime = startDateTime)
    // Warn: keept this order: must start with endDateTime, then fishingEndDateTime, then fishingStartDateTime
    if (this.endDateTime && this.endDateTime.isSameOrBefore(this.fishingEndDateTime||this.fishingStartDateTime||this.startDateTime)) {
      this.endDateTime = undefined;
    }
    if (this.fishingEndDateTime && this.fishingEndDateTime.isSameOrBefore(this.fishingStartDateTime||this.startDateTime)) {
      this.fishingEndDateTime = undefined;
    }
    if (this.fishingStartDateTime && this.fishingStartDateTime.isSameOrBefore(this.startDateTime)) {
      this.fishingStartDateTime = undefined;
    }

    // Update positions dates
    if (this.endPosition) this.endPosition.dateTime = this.endDateTime;
    if (this.fishingEndPosition) this.fishingEndPosition.dateTime = this.fishingEndDateTime;
    if (this.fishingStartPosition) this.fishingStartPosition.dateTime = this.fishingStartDateTime;

    // Fishing areas
    this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || undefined;

    // Samples
    if (!opts || opts.withSamples !== false) {
      this.samples = source.samples && source.samples.map(source => Sample.fromObject(source, {withChildren: true})) || undefined;
    }

    // Batches
    if (!opts || opts.withBatchTree !== false) {
      this.catchBatch = source.catchBatch && !source.batches ?
        // Reuse existing catch batch (useful for local entity)
        Batch.fromObject(source.catchBatch, {withChildren: true}) :
        // Convert list to tree (useful when fetching from a pod)
        Batch.fromObjectArrayAsTree(source.batches);
    }

    //Parent Operation
    this.parentOperationId = source.parentOperationId;
    this.parentOperation = (source.parentOperation || source.parentOperationId) ? Operation.fromObject(source.parentOperation || {id: source.parentOperationId}) : undefined;

    //Child Operation
    this.childOperationId = source.childOperationId;
    this.childOperation = (source.childOperation || source.childOperationId) ? Operation.fromObject(source.childOperation || {id: source.childOperationId}) : undefined;
  }

  equals(other: Operation): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || ((this.startDateTime === other.startDateTime
          || (!this.startDateTime && !other.startDateTime && this.fishingStartDateTime === other.fishingStartDateTime))
        && ((!this.rankOrderOnPeriod && !other.rankOrderOnPeriod) || (this.rankOrderOnPeriod === other.rankOrderOnPeriod))
      );
  }
}

@EntityClass({typename: 'OperationGroupVO'})
export class OperationGroup extends DataEntity<OperationGroup>
  implements IWithProductsEntity<OperationGroup>, IWithPacketsEntity<OperationGroup> {

  static fromObject: (source: any) => OperationGroup;

  comments: string;
  rankOrderOnPeriod: number;
  hasCatch: boolean;

  metier: Metier = null;
  physicalGearId: number;
  tripId: number;
  trip: RootDataEntity<any>;

  measurements: Measurement[] = [];
  gearMeasurements: Measurement[] = [];

  // all measurements in table
  measurementValues: MeasurementModelValues | MeasurementFormValues = {};

  products: Product[] = [];
  samples: Sample[] = [];
  packets: Packet[] = [];
  fishingAreas: FishingArea[] = [];

  constructor() {
    super(OperationGroup.TYPENAME);
  }

  static equals(o1: OperationGroup | any, o2: OperationGroup | any): boolean {
    return o1 && o2 && ((isNotNil(o1.id) && o1.id === o2.id)
      // Or by functional attributes
      || o1.metier.equals(o2.metier) && ((!o1.rankOrderOnPeriod && !o2.rankOrderOnPeriod) || (o1 === o2.rankOrderOnPeriod))
      );
  }

  asObject(opts?: DataEntityAsObjectOptions & { batchAsTree?: boolean }): any {
    const target = super.asObject(opts);

    target.metier = this.metier && this.metier.asObject({...opts, ...NOT_MINIFY_OPTIONS /*Always minify=false, because of operations tables cache*/} as ReferentialAsObjectOptions) || undefined;

    // Measurements
    target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
    target.gearMeasurements = this.gearMeasurements && this.gearMeasurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    delete target.gearMeasurementValues; // all measurements are stored only measurementValues

    // Products
    target.products = this.products && this.products.map(product => {
      const p = product.asObject(opts);
      // Affect parent link
      p.operationId = target.id;
      return p;
    }) || undefined;

    // Samples
    target.samples = this.samples && this.samples.map(sample => {
      const s = sample.asObject({...opts, withChildren: true});
      // Affect parent link
      s.operationId = target.id;
      return s;
    }) || undefined;

    // Packets
    target.packets = this.packets && this.packets.map(packet => {
      const p = packet.asObject(opts);
      // Affect parent link
      p.operationId = target.id;
      return p;
    }) || undefined;

    // Fishing areas
    target.fishingAreas = this.fishingAreas && this.fishingAreas.map(value => value.asObject(opts)) || undefined;

    return target;
  }

  fromObject(source: any): OperationGroup {
    super.fromObject(source);
    this.hasCatch = source.hasCatch;
    this.comments = source.comments;
    this.tripId = source.tripId;
    this.rankOrderOnPeriod = source.rankOrderOnPeriod;
    this.metier = source.metier && Metier.fromObject(source.metier) || undefined;
    this.physicalGearId = source.physicalGearId;

    // Measurements
    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    this.gearMeasurements = source.gearMeasurements && source.gearMeasurements.map(Measurement.fromObject) || [];
    this.measurementValues = {
      ...MeasurementUtils.toMeasurementValues(this.measurements),
      ...MeasurementUtils.toMeasurementValues(this.gearMeasurements),
      ...source.measurementValues // important: keep at last assignment
    };
    if (Object.keys(this.measurementValues).length === 0) {
      console.warn('Source as no measurement. Should never occur! ', source);
    }

    // Products
    this.products = source.products && source.products.map(Product.fromObject) || [];
    // Affect parent
    this.products.forEach(product => {
      product.parent = this;
      product.operationId = this.id;
    });

    // Samples
    this.samples = source.samples && source.samples.map(source => Sample.fromObject(source, {withChildren: true})) || [];
    // Affect parent
    this.samples.forEach(sample => {
      sample.operationId = this.id;
    });

    // Packets
    this.packets = source.packets && source.packets.map(Packet.fromObject) || [];
    // Affect parent
    this.packets.forEach(packet => {
      packet.parent = this;
    });

    // Fishing areas
    this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || undefined;

    return this;
  }

  equals(other: OperationGroup): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        this.metier.equals(other.metier) && ((!this.rankOrderOnPeriod && !other.rankOrderOnPeriod) || (this.rankOrderOnPeriod === other.rankOrderOnPeriod))
      );
  }
}

@EntityClass({typename: 'TripVO'})
export class Trip extends DataRootVesselEntity<Trip> implements IWithObserversEntity<Trip> {

  static fromObject: (source: any, opts?: any) => Trip;

  departureDateTime: Moment = null;
  returnDateTime: Moment = null;
  departureLocation: ReferentialRef = null;
  returnLocation: ReferentialRef = null;
  sale: Sale = null;
  expectedSale: ExpectedSale = null;
  gears: PhysicalGear[] = null;
  measurements: Measurement[] = null;
  observers: Person[] = null;
  metiers: ReferentialRef[] = null;
  operations?: Operation[] = null;
  operationGroups?: OperationGroup[] = null;
  fishingAreas?: FishingArea[] = null;
  landing?: Landing = null;
  observedLocationId?: number = null;

  constructor() {
    super(Trip.TYPENAME);
  }

  asObject(options?: DataEntityAsObjectOptions & { batchAsTree?: boolean }): any {
    const target = super.asObject(options);
    target.departureDateTime = toDateISOString(this.departureDateTime);
    target.returnDateTime = toDateISOString(this.returnDateTime);
    target.departureLocation = this.departureLocation && this.departureLocation.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.returnLocation = this.returnLocation && this.returnLocation.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.sale = this.sale && this.sale.asObject(options) || undefined;
    target.expectedSale = this.expectedSale && this.expectedSale.asObject(options) || undefined;
    target.gears = this.gears && this.gears.map(p => p && p.asObject(options)) || undefined;
    target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(options)) || undefined;
    target.observers = this.observers && this.observers.map(p => p && p.asObject({...options, ...NOT_MINIFY_OPTIONS})) || undefined;

    // Metiers
    target.metiers = this.metiers && this.metiers.filter(isNotNil).map(p => p && p.asObject({...options, ...NOT_MINIFY_OPTIONS})) || undefined;
    if (isEmptyArray(target.metiers)) delete target.metiers; // Clean is empty, for compat with previous version

    // Operations
    target.operations = this.operations && this.operations.map(o => o.asObject(options)) || undefined;

    // Operation groups
    target.operationGroups = this.operationGroups && this.operationGroups.filter(isNotNil).map(o => o.asObject(options)) || undefined;
    if (isEmptyArray(target.operationGroups)) delete target.operationGroups; // Clean if empty, for compat with previous version

    // Fishing areas
    target.fishingAreas = this.fishingAreas && this.fishingAreas.map(p => p && p.asObject(options)) || undefined;

    // Landing
    target.landing = this.landing && this.landing.asObject(options) || undefined;

    return target;
  }

  fromObject(source: any, opts?: any): Trip {
    super.fromObject(source);
    this.departureDateTime = fromDateISOString(source.departureDateTime);
    this.returnDateTime = fromDateISOString(source.returnDateTime);
    this.departureLocation = source.departureLocation && ReferentialRef.fromObject(source.departureLocation);
    this.returnLocation = source.returnLocation && ReferentialRef.fromObject(source.returnLocation);
    this.sale = source.sale && Sale.fromObject(source.sale) || undefined;
    this.expectedSale = source.expectedSale && ExpectedSale.fromObject(source.expectedSale) || undefined;

    this.gears = source.gears && source.gears.filter(isNotNil).map(PhysicalGear.fromObject)
      // Sort by rankOrder (useful for gears combo, in the operation form)
      .sort(EntityUtils.sortComparator('rankOrder')) || undefined;

    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    this.observers = source.observers && source.observers.map(Person.fromObject) || [];
    this.metiers = source.metiers && source.metiers.map(ReferentialRef.fromObject) || [];

    if (source.operations) {
      this.operations = source.operations
        .map(Operation.fromObject)
        .map((o: Operation) => {
          o.tripId = this.id;
          // Ling to trip's gear
          o.physicalGear = o.physicalGear && (this.gears || []).find(g => o.physicalGear.equals(g));
          return o;
        });
    }

    this.operationGroups = source.operationGroups && source.operationGroups.map(OperationGroup.fromObject) || [];

    // Remove fake dates (e.g. if returnDateTime = departureDateTime)
    if (this.returnDateTime && this.returnDateTime.isSameOrBefore(this.departureDateTime)) {
      this.returnDateTime = undefined;
    }

    // Fishing areas
    this.fishingAreas = source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject) || [];

    this.landing = source.landing && Landing.fromObject(source.landing) || undefined;
    this.observedLocationId = source.observedLocationId;

    this.vesselSnapshot = source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot) || undefined;

    return this;
  }

  equals(other: Trip): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        // Same vessel
        (this.vesselSnapshot && other.vesselSnapshot && this.vesselSnapshot.id === other.vesselSnapshot.id)
        // Same departure date (or, if not set, same return date)
        && ((this.departureDateTime === other.departureDateTime)
          || (!this.departureDateTime && !other.departureDateTime && this.returnDateTime === other.returnDateTime))
      );
  }
}

@EntityClass({typename: 'PhysicalGearVO'})
export class PhysicalGear extends RootDataEntity<PhysicalGear> implements IEntityWithMeasurement<PhysicalGear> {

  static fromObject: (source: any, opts?: any) => PhysicalGear;
  static equals(s1: PhysicalGear, s2: PhysicalGear) {
    return s1 && s2 && s1.id === s2.id
      // Or
      || (
        // Same gear
        (s1.gear && s2.gear && s1.gear.id === s2.gear.id)
        // Same rankOrder
        && (s1.rankOrder === s2.rankOrder)
        // WARN: compare parent (e.g. same trip) is tto complicated, because it can be not set yet, before saving
      );
  }

  static computeSameAsScore(reference: PhysicalGear, source?: PhysicalGear): number {
    if (!source) return -1;
    return (reference.gear?.id === source.gear?.id ? 1 : 0) * 100
      + (reference.rankOrder === source.rankOrder ? 1 : 0) * 10
      + (reference.tripId === source.tripId ? 1 : 0) * 1
  }

  static sameAsComparator(gear: PhysicalGear, sortDirection?: SortDirection): (g1: PhysicalGear, g2: PhysicalGear) => number {
    const direction = !sortDirection || sortDirection === 'desc' ? -1 : 1;
    return (g1, g2) => {
      const score1 = this.computeSameAsScore(gear, g1);
      const score2 = this.computeSameAsScore(gear, g2);
      return score1 === score2 ? 0 : (score1 > score2 ? direction : -direction);
    };

  }

  rankOrder: number = null;
  gear: ReferentialRef = null;
  measurements: Measurement[] = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = {};

  // Parent (used when lookup gears)
  trip: Trip = null;
  tripId: number = null;

  constructor() {
    super(PhysicalGear.TYPENAME);
  }

  copy(target: PhysicalGear) {
    target.fromObject(this);
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.gear = this.gear && this.gear.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    // Fixme gear entityName here
    if (target.gear)
      target.gear.entityName = 'GearVO';

    target.rankOrder = this.rankOrder;

    // Measurements
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
    if (isEmptyArray(target.measurements)) delete target.measurements;

    return target;
  }

  fromObject(source: any): PhysicalGear {
    super.fromObject(source);
    this.rankOrder = source.rankOrder;
    this.gear = source.gear && ReferentialRef.fromObject(source.gear);
    this.measurementValues = source.measurementValues && {...source.measurementValues} || MeasurementUtils.toMeasurementValues(source.measurements);

    // Parent trip
    if (source.trip) {
      this.trip = source.trip && Trip.fromObject(source.trip);
      this.tripId = this.trip && this.trip.id;
    } else {
      this.trip = null;
      this.tripId = source.tripId || null; // to keep tripId on clone even if source.trip is null.
    }

    return this;
  }

  equals(other: PhysicalGear): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        // Same gear
        (this.gear && other.gear && this.gear.id === other.gear.id)
        // Same rankOrder
        && (this.rankOrder === other.rankOrder)
      );
  }
}


export class VesselPositionUtils {

  static dateTimeComparator(sortDirection?: SortDirection): (n1: VesselPosition, n2: VesselPosition) => number {
    const side = sortDirection !== 'desc' ? 1 : -1;
    return (n1, n2) => n1.dateTime.isSame(n2.dateTime) ? 0 : (n1.dateTime.isAfter(n2.dateTime) ? side : -1 * side);
  }

  static findByDate(positions: VesselPosition[], dateTime: Moment, removeFromArray?: boolean): VesselPosition | undefined {
    if (!positions || !dateTime) return undefined;

    // Make sure we have a valid moment object
    if (!isMoment(dateTime)) dateTime = fromDateISOString(dateTime);

    const index = positions.findIndex(p => dateTime.isSame(p.dateTime));
    if (index === -1) return undefined;
    if (removeFromArray) {
      return positions.splice(index, 1)[0];
    }
    else {
      return positions[index];
    }
  }


}
