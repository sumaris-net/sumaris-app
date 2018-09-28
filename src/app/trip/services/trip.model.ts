import {
  Referential, EntityUtils, Department, Person,
  toDateISOString, fromDateISOString,
  vesselFeaturesToString, entityToString, referentialToString,
  StatusIds, Cloneable, Entity, LocationLevelIds, VesselFeatures, GearLevelIds, TaxonGroupIds,
  PmfmStrategy
} from "../../referential/services/model";
import { Moment } from "moment/moment";

export {
  Referential, EntityUtils, Person, Department,
  toDateISOString, fromDateISOString,
  vesselFeaturesToString, entityToString, referentialToString,
  StatusIds, Cloneable, Entity, VesselFeatures, LocationLevelIds, GearLevelIds, TaxonGroupIds,
  PmfmStrategy
};

/* -- Helper function -- */

export function fillRankOrder(values: { rankOrder: number }[]) {
  // Compute rankOrder
  let maxRankOrder = 0;
  (values || []).forEach(m => {
    if (m.rankOrder && m.rankOrder > maxRankOrder) maxRankOrder = m.rankOrder;
  });
  (values || []).forEach(m => {
    m.rankOrder = m.rankOrder || maxRankOrder++;
  });
}

/* -- DATA -- */
export abstract class DataEntity<T> extends Entity<T> {
  recorderDepartment: Department;

  constructor() {
    super();
    this.recorderDepartment = new Department();
  }

  asObject(): any {
    const target = super.asObject();
    target.recorderDepartment = this.recorderDepartment && this.recorderDepartment.asObject() || undefined;
    return target;
  }

  fromObject(source: any): DataEntity<T> {
    super.fromObject(source);
    source.recorderDepartment && this.recorderDepartment.fromObject(source.recorderDepartment);
    return this;
  }

}

export abstract class DataRootEntity<T> extends DataEntity<T> {
  comments: string;
  creationDate: Moment;
  recorderPerson: Person;

  constructor() {
    super();
    this.recorderPerson = new Person();
  }

  asObject(): any {
    const target = super.asObject();
    target.creationDate = toDateISOString(this.creationDate);
    target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject() || undefined;
    return target;
  }

  fromObject(source: any): DataRootEntity<T> {
    super.fromObject(source);
    this.comments = source.comments;
    this.creationDate = fromDateISOString(source.creationDate);
    source.recorderPerson && this.recorderPerson.fromObject(source.recorderPerson);
    return this;
  }
}

export abstract class DataRootVesselEntity<T> extends DataRootEntity<T> {
  vesselFeatures: VesselFeatures;
  // TODO: program: string;

  constructor() {
    super();
    this.vesselFeatures = new VesselFeatures();
  }

  asObject(): any {
    const target = super.asObject();
    target.vesselFeatures = this.vesselFeatures && this.vesselFeatures.asObject() || undefined;
    return target;
  }

  fromObject(source: any): DataRootVesselEntity<T> {
    super.fromObject(source);
    source.vesselFeatures && this.vesselFeatures.fromObject(source.vesselFeatures);
    // TODO: source.program && this.program;
    return this;
  }
}

export class Trip extends DataRootVesselEntity<Trip> {

  static fromObject(source: any): Trip {
    const res = new Trip();
    res.fromObject(source);
    return res;
  }

  program: string;
  departureDateTime: Moment;
  returnDateTime: Moment;
  departureLocation: Referential;
  returnLocation: Referential;
  sale: Sale;
  gears: PhysicalGear[];
  measurements: Measurement[];

  constructor() {
    super();
    this.departureLocation = new Referential();
    this.returnLocation = new Referential();
    this.measurements = [];
  }

  clone(): Trip {
    const target = new Trip();
    target.fromObject(this.asObject);
    return target;
  }

  copy(target: Trip) {
    target.fromObject(this);
  }

  asObject(): any {
    const target = super.asObject();
    target.departureDateTime = toDateISOString(this.departureDateTime);
    target.returnDateTime = toDateISOString(this.returnDateTime);
    target.departureLocation = this.departureLocation && this.departureLocation.asObject() || undefined;
    target.returnLocation = this.returnLocation && this.returnLocation.asObject() || undefined;
    target.sale = this.sale && this.sale.asObject() || undefined;
    target.gears = this.gears && this.gears.map(p => p && p.asObject()) || undefined;
    target.measurements = this.measurements && this.measurements.map(m => m.asObject()) || undefined;
    return target;
  }

  fromObject(source: any): Trip {
    super.fromObject(source);
    this.program = source.program;
    this.departureDateTime = fromDateISOString(source.departureDateTime);
    this.returnDateTime = fromDateISOString(source.returnDateTime);
    source.departureLocation && this.departureLocation.fromObject(source.departureLocation);
    source.returnLocation && this.returnLocation.fromObject(source.returnLocation);
    if (source.sale) {
      this.sale = new Sale();
      this.sale.fromObject(source.sale);
    };
    this.gears = source.gears && source.gears.filter(g => !!g).map(PhysicalGear.fromObject) || undefined;
    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    return this;
  }

  equals(other: Trip): boolean {
    return super.equals(other)
      || (
        // Same vessel
        (this.vesselFeatures && other.vesselFeatures && this.vesselFeatures.vesselId === other.vesselFeatures.vesselId)
        // Same departure date (or, if not set, same return date)
        && ((this.departureDateTime === other.departureDateTime)
          || (!this.departureDateTime && !other.departureDateTime && this.returnDateTime === other.returnDateTime))
      );
  }
}

export class PhysicalGear extends DataRootEntity<PhysicalGear> {

  static fromObject(source: any): PhysicalGear {
    const res = new PhysicalGear();
    res.fromObject(source);
    return res;
  }

  rankOrder: number;
  gear: Referential;
  measurements: Measurement[];

  constructor() {
    super();
    this.gear = new Referential();
    this.measurements = [];
  }

  clone(): PhysicalGear {
    const target = new PhysicalGear();
    target.fromObject(this.asObject());
    return target;
  }

  copy(target: PhysicalGear) {
    target.fromObject(this);
  }

  asObject(): any {
    const target = super.asObject();
    target.gear = this.gear && this.gear.asObject() || undefined;

    // Measurements
    target.measurements = this.measurements && this.measurements.map(m => m.asObject()) || undefined;

    return target;
  }

  fromObject(source: any): PhysicalGear {
    super.fromObject(source);
    this.rankOrder = source.rankOrder;
    source.gear && this.gear.fromObject(source.gear);
    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    return this;
  }

  equals(other: PhysicalGear): boolean {
    return super.equals(other)
      || (
        // Same gear
        (this.gear && other.gear && this.gear.id === other.gear.id)
        // Same rankOrder
        && (this.rankOrder === other.rankOrder)
      );
  }
}

export class Measurement extends DataEntity<Measurement> {
  pmfmId: number;
  alphanumericalValue: string;
  numericalValue: number;
  qualitativeValue: Referential;
  digitCount: number;
  rankOrder: number;

  static fromObject(source: any): Measurement {
    const res = new Measurement();
    res.fromObject(source);
    return res;
  }

  constructor() {
    super();
  }

  clone(): Measurement {
    const target = new Measurement();
    target.fromObject(this.asObject());
    return target;
  }

  copy(target: Measurement) {
    target.fromObject(this);
  }

  asObject(): any {
    const target = super.asObject();
    target.qualitativeValue = this.qualitativeValue && this.qualitativeValue.id && { id: this.qualitativeValue.id };
    return target;
  }

  fromObject(source: any): Measurement {
    super.fromObject(source);
    this.pmfmId = source.pmfmId;
    this.alphanumericalValue = source.alphanumericalValue;
    this.numericalValue = source.numericalValue;
    this.digitCount = source.digitCount;
    this.rankOrder = source.rankOrder;
    this.qualitativeValue = source.qualitativeValue && Referential.fromObject(source.qualitativeValue);

    return this;
  }

  equals(other: Measurement): boolean {
    return super.equals(other)
      || (
        // Same [pmfmId, rankOrder]
        (this.pmfmId && other.pmfmId && this.rankOrder === other.rankOrder)
      );
  }

  isEmpty(): boolean {
    return !this.alphanumericalValue
      && this.numericalValue === undefined
      && !(this.qualitativeValue && this.qualitativeValue.id)
  }
}

export class MeasurementUtils {

  static getMeasurementValuesMap(measurements: Measurement[], pmfms: PmfmStrategy[]): any {
    const res: any = {};
    pmfms.forEach(pmfm => {
      const m = (measurements || []).find(m => m.pmfmId === pmfm.id);
      res[pmfm.id.toString()] = m && MeasurementUtils.getValue(m, pmfm) || null;
    });
    return res;
  }

  static getMeasurements(measurements: Measurement[], pmfms: PmfmStrategy[]): Measurement[] {
    // Work on a copy, to be able to reduce the array
    let rankOrder = 1;
    return (pmfms || []).map(pmfm => {
      const m = (measurements || []).find(m => m.pmfmId === pmfm.id) || new Measurement();
      m.pmfmId = pmfm.id; // apply the pmfm (need for new object)
      m.rankOrder = rankOrder++;
      return m;
    });
  }

  // Update measurement values
  static updateMeasurementValues(valuesMap: { [key: number]: any }, measurements: Measurement[], pmfms: PmfmStrategy[]) {
    (measurements || []).forEach(m => {
      let pmfm = (pmfms || []).find(pmfm => pmfm.id === m.pmfmId);
      if (pmfm) {
        MeasurementUtils.setValue(valuesMap[pmfm.id.toString()] || null, m, pmfm);
      }
    });
  }

  static getValue(source: Measurement, pmfm: PmfmStrategy): any {
    switch (pmfm.type) {
      case "qualitative_value":
        if (source.qualitativeValue && source.qualitativeValue.id) {
          return pmfm.qualitativeValues.find(qv => qv.id == source.qualitativeValue.id);
        }
        return null;
      case "integer":
      case "double":
        return source.numericalValue;
      case "string":
        return source.alphanumericalValue;
      case "boolean":
        return source.numericalValue === 1 ? true : (source.numericalValue === 0 ? false : null);
      case "date":
        return source.alphanumericalValue;
      default:
        throw new Error("Unknown pmfm.type for getting value of measurement: " + pmfm.type);
    }
  }

  static setValue(value: any, target: Measurement, pmfm: PmfmStrategy) {
    if (value === null || value === undefined) return;
    switch (pmfm.type) {
      case "qualitative_value":
        target.qualitativeValue = value;
        break;
      case "integer":
      case "double":
        target.numericalValue = value;
        break;
      case "string":
        target.alphanumericalValue = value;
        break;
      case "boolean":
        target.numericalValue = (value === true || value === "true") ? 1 : 0;
        break;
      default:
        throw new Error("Unknown pmfm.type, to fill measruement value: " + pmfm.type);
    }
  }
}

export class Sale extends DataRootVesselEntity<Sale> {
  startDateTime: Moment;
  endDateTime: Moment;
  saleLocation: Referential;
  saleType: Referential;

  constructor() {
    super();
    this.saleLocation = new Referential();
    this.saleType = new Referential();
  }

  clone(): Sale {
    const target = new Sale();
    target.fromObject(this.asObject());
    return target;
  }

  copy(target: Sale) {
    target.fromObject(this);
  }

  asObject(): any {
    const target = super.asObject();
    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.saleLocation = this.saleLocation && this.saleLocation.asObject() || undefined;
    target.saleType = this.saleType && this.saleType.asObject() || undefined;
    return target;
  }

  fromObject(source: any): Sale {
    super.fromObject(source);
    this.startDateTime = fromDateISOString(source.startDateTime);
    this.endDateTime = fromDateISOString(source.endDateTime);
    source.saleLocation && this.saleLocation.fromObject(source.saleLocation);
    source.saleType && this.saleType.fromObject(source.saleType);
    return this;
  }
}

export class Operation extends DataEntity<Operation> {

  static fromObject(source: any): Operation {
    const res = new Operation();
    res.fromObject(source);
    return res;
  }

  startDateTime: Moment;
  endDateTime: Moment;
  fishingStartDateTime: Moment;
  fishingEndDateTime: Moment;
  comments: string;
  rankOrderOnPeriod: number;
  hasCatch: boolean;
  positions: VesselPosition[];
  startPosition: VesselPosition;
  endPosition: VesselPosition;

  metier: Referential;
  physicalGear: PhysicalGear;
  tripId: number;

  measurements: Measurement[];
  samples: Sample[];
  //catchBatch: Batch;

  constructor() {
    super();
    this.metier = new Referential();
    this.startPosition = new VesselPosition();
    this.endPosition = new VesselPosition();
    this.physicalGear = new PhysicalGear();
    this.measurements = [];
    this.samples = [];
    //this.catchBatch = null;
  }

  clone(): Operation {
    const target = new Operation();
    target.fromObject(this.asObject());
    return target;
  }

  asObject(): any {
    const target = super.asObject();
    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.fishingStartDateTime = toDateISOString(this.fishingStartDateTime);
    target.fishingEndDateTime = toDateISOString(this.fishingEndDateTime);
    target.metier = this.metier && this.metier.asObject() || undefined;

    // Create an array of position, instead of start/end
    target.positions = [this.startPosition, this.endPosition].map(p => p && p.asObject()) || undefined;
    delete target.startPosition;
    delete target.endPosition;

    // Physical gear: keep id
    target.physicalGearId = this.physicalGear && this.physicalGear.id;
    delete target.physicalGear;

    // Measurements
    target.measurements = this.measurements && this.measurements.map(m => m.asObject()) || undefined;

    // Samples
    target.samples = this.samples && this.samples.map(s => s.asObject()) || undefined;

    // Batch
    //target.catchBatch  = this.catchBatch && this.catchBatch.asObject() || undefined;

    return target;
  }

  fromObject(source: any): Operation {
    super.fromObject(source);
    this.hasCatch = source.hasCatch;
    this.comments = source.comments;
    this.tripId = source.tripId;
    this.physicalGear = source.physicalGear && PhysicalGear.fromObject(source.physicalGear) || new PhysicalGear();
    this.physicalGear.id = this.physicalGear.id || source.physicalGearId;
    this.startDateTime = fromDateISOString(source.startDateTime);
    this.endDateTime = fromDateISOString(source.endDateTime);
    this.fishingStartDateTime = fromDateISOString(source.fishingStartDateTime);
    this.fishingEndDateTime = fromDateISOString(source.fishingEndDateTime);
    this.rankOrderOnPeriod = source.rankOrderOnPeriod;
    source.metier && this.metier.fromObject(source.metier);
    this.positions = source.positions && source.positions.map(VesselPosition.fromObject) || undefined;
    if (this.positions && this.positions.length == 2) {
      this.startPosition = this.positions[0];
      this.endPosition = this.positions[1];
    }
    delete this.positions;
    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    this.samples = source.samples && source.samples.map(Sample.fromObject) || undefined;
    // TODO: batch
    return this;
  }

  equals(other: Operation): boolean {
    return super.equals(other)
      || ((this.startDateTime === other.startDateTime
        || (!this.startDateTime && !other.startDateTime && this.fishingStartDateTime === other.fishingStartDateTime))
        && ((!this.rankOrderOnPeriod && !other.rankOrderOnPeriod) || (this.rankOrderOnPeriod === other.rankOrderOnPeriod))
      );
  }
}

export class VesselPosition extends DataEntity<Operation> {

  static fromObject(source: any): VesselPosition {
    const res = new VesselPosition();
    res.fromObject(source);
    return res;
  }

  dateTime: Moment;
  latitude: number;
  longitude: number;
  operationId: number;

  constructor() {
    super();
  }

  clone(): Operation {
    const target = new Operation();
    target.fromObject(this.asObject());
    return target;
  }

  asObject(): any {
    const target = super.asObject();
    target.dateTime = toDateISOString(this.dateTime);
    return target;
  }

  fromObject(source: any): VesselPosition {
    super.fromObject(source);
    this.latitude = source.latitude;
    this.longitude = source.longitude;
    this.operationId = source.operationId;
    this.dateTime = fromDateISOString(source.dateTime);
    return this;
  }

  equals(other: VesselPosition): boolean {
    return super.equals(other)
      || (this.dateTime === other.dateTime
        && (!this.operationId && !other.operationId || this.operationId === other.operationId));
  }
}

export class Sample extends DataRootEntity<Sample> {

  static fromObject(source: any): Sample {
    const res = new Sample();
    res.fromObject(source);
    return res;
  }

  label: string;
  rankOrder: number;
  sampleDate: Moment;
  individualCount: number;
  taxonGroup: Referential;
  //measurements: Measurement[];
  measurementsMap: { [key: string]: any };
  matrixId: number;
  batchId: number;
  operationId: number;

  constructor() {
    super();
    this.taxonGroup = new Referential();
    //this.measurements = [];
    this.measurementsMap = {};
  }

  clone(): Sample {
    const target = new Sample();
    target.fromObject(this.asObject());
    return target;
  }

  asObject(): any {
    const target = super.asObject();
    target.sampleDate = toDateISOString(this.sampleDate);
    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject() || undefined;

    // Measurement: keep only the map
    delete target.measurements;
    target.measurementsMap = this.measurementsMap && Object.getOwnPropertyNames(this.measurementsMap)
      .reduce((map, pmfmId) => {
        const value = this.measurementsMap[pmfmId] && this.measurementsMap[pmfmId].id || this.measurementsMap[pmfmId];
        if (value || value === 0) {
          map[pmfmId] = value;
        }
        return map;
      }, {}) || undefined;
    return target;
  }

  fromObject(source: any): Sample {
    super.fromObject(source);
    this.label = source.label;
    this.rankOrder = source.rankOrder;
    this.sampleDate = fromDateISOString(source.sampleDate);
    this.individualCount = source.individualCount;
    this.comments = source.comments;
    this.taxonGroup = source.taxonGroup && Referential.fromObject(source.taxonGroup) || undefined;

    // Convert measurement to map
    if (source.measurements) {
      this.measurementsMap = source.measurements && source.measurements.reduce((map, m) => {
        const value = m && m.pmfmId && (m.alphanumericalValue || m.numericalValue || (m.qualitativeValue && m.qualitativeValue.id));
        if (value) map[m.pmfmId.toString()] = value;
        return map;
      }, {}) || undefined;
    }
    else {
      this.measurementsMap = source.measurementsMap;
    }
    this.matrixId = source.matrixId;
    this.batchId = source.batchId;
    this.operationId = source.operationId;
    return this;
  }

  equals(other: Sample): boolean {
    return super.equals(other)
      || (this.rankOrder === other.rankOrder
        && (!this.operationId && !other.operationId || this.operationId === other.operationId)
      );
  }
}

export class Batch extends DataEntity<Batch> {

  static fromObject(source: any): Batch {
    const res = new Batch();
    res.fromObject(source);
    return res;
  }

  rankOrder: number;
  exhaustiveInventory: boolean;
  samplingRatio: number;
  samplingRatioText: string;
  individualCount: number;
  taxonGroup: Referential;
  comments: string;
  parentBatch: Batch;
  children: Batch[];
  measurements: Measurement[];
  operationId: number;

  constructor() {
    super();
    this.parentBatch = null;
    this.taxonGroup = new Referential();
    this.measurements = [];
    this.children = [];
  }

  clone(): Batch {
    const target = new Batch();
    target.fromObject(this.asObject());
    return target;
  }

  asObject(): any {
    let parent = this.parentBatch; // avoid parent conversion
    this.parentBatch = null;
    const target = super.asObject();
    this.parentBatch = parent;

    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject() || undefined;

    target.children = this.children && this.children.map(c => c.asObject()) || undefined;
    target.measurements = this.measurements && this.measurements.map(m => m.asObject()) || undefined;
    return target;
  }

  fromObject(source: any): Batch {
    super.fromObject(source);
    this.rankOrder = source.rankOrder;
    this.exhaustiveInventory = source.exhaustiveInventory;
    this.samplingRatio = source.samplingRatio;
    this.samplingRatioText = source.samplingRatioText;
    this.individualCount = source.individualCount;
    this.taxonGroup = source.taxonGroup && Referential.fromObject(source.taxonGroup) || undefined;
    this.comments = source.comments;
    this.operationId = source.operationId;
    this.children = source.children && source.children.filter(c => !!c).map(Batch.fromObject) || undefined;
    this.children && this.children.forEach(c => c.parentBatch = this); // link children to self
    this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
    return this;
  }

  equals(other: Batch): boolean {
    // equals by ID
    return super.equals(other)
      // Or by functional attributes
      || (this.rankOrder === other.rankOrder
        && (!this.parentBatch && !other.parentBatch || this.parentBatch.equals(other.parentBatch)) // same parent
        && (!this.operationId && !other.operationId || this.operationId === other.operationId)); // same operation
  }
}