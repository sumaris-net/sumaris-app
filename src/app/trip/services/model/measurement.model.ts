import { DataEntity, DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { UntypedFormGroup } from '@angular/forms';
import { AppFormUtils, arraySize, fromDateISOString, IEntity, isEmptyArray, isNil, isNotNil, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { IPmfm, Pmfm } from '@app/referential/services/model/pmfm.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { PmfmValue, PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';


export const MEASUREMENT_PMFM_ID_REGEXP = /measurements\.\d+$/;
export const MEASUREMENT_VALUES_PMFM_ID_REGEXP = /measurementValues\.\d+$/;


export const MeasurementValuesTypes = {
  MeasurementModelValues: 'MeasurementModelValues',
  MeasurementFormValue: 'MeasurementFormValue'
};


export declare interface MeasurementModelValues {
  __typename?: string;
  [key: number]: string;
}

export declare type MeasurementFormValue = PmfmValue | PmfmValue[];

export declare interface MeasurementFormValues {
  __typename?: string;
  [key: string]: PmfmValue | PmfmValue[];
}

export declare interface IEntityWithMeasurement<T extends IEntity<T, ID>,
  ID = number>
  extends IEntity<T, ID> {
  measurementValues: MeasurementModelValues | MeasurementFormValues;
  rankOrder?: number;
  comments?: string;
  program?: ReferentialRef;
}

export declare interface IMeasurementValue {
  methodId: number;
  estimated: boolean;
  computed: boolean;
  value: number;

  unit?: string|any; // is need ?
}

export declare type MeasurementType = 'ObservedLocationMeasurement' | 'SaleMeasurement' | 'LandingMeasurement'
  | 'VesselUseMeasurement' | 'VesselPhysicalMeasurement'
  | 'GearUseMeasurement' | 'PhysicalGearUseMeasurement'
  | 'BatchQuantificationMeasurement' | 'BatchSortingMeasurement'
  | 'ProduceQuantificationMeasurement' | 'ProduceSortingMeasurement';

export class Measurement extends DataEntity<Measurement> {
  pmfmId: number;
  alphanumericalValue: string;
  numericalValue: number;
  qualitativeValue: ReferentialRef;
  digitCount: number;
  rankOrder: number;
  entityName: MeasurementType;

  static fromObject(source: any): Measurement {
    const res = new Measurement();
    res.fromObject(source);
    return res;
  }

  constructor() {
    super();
    this.__typename = 'MeasurementVO';
    this.rankOrder = null;
  }


  copy(target: Measurement) {
    target.fromObject(this);
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.qualitativeValue = this.qualitativeValue && this.qualitativeValue.asObject(options) || undefined;
    return target;
  }

  fromObject(source: any): Measurement {
    super.fromObject(source);
    this.pmfmId = source.pmfmId;
    this.alphanumericalValue = source.alphanumericalValue;
    this.numericalValue = source.numericalValue;
    this.digitCount = source.digitCount;
    this.rankOrder = source.rankOrder;
    this.qualitativeValue = source.qualitativeValue && ReferentialRef.fromObject(source.qualitativeValue);
    this.entityName = source.entityName as MeasurementType;

    return this;
  }

  equals(other: Measurement): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        // Same [pmfmId, rankOrder]
        (this.pmfmId === other.pmfmId && this.rankOrder === other.rankOrder)
      );
  }

}

export class MeasurementUtils {

  static initAllMeasurements(source: Measurement[], pmfms: IPmfm[], entityName: MeasurementType, keepRankOrder: boolean): Measurement[] {
    // Work on a copy, to be able to reduce the array
    let rankOrder = 1;
    return (pmfms || []).map(pmfm => {
      const measurement = (source || []).find(m => m.pmfmId === pmfm.id) || new Measurement();
      measurement.pmfmId = pmfm.id; // apply the pmfm (need for new object)
      measurement.rankOrder = keepRankOrder ? measurement.rankOrder : rankOrder++;

      // Need by GraphQL cache
      measurement.entityName = measurement.entityName || entityName;
      measurement.__typename = measurement.__typename || 'MeasurementVO';
      return measurement;
    });
  }

  static getMeasurementEntityValue(source: Measurement, pmfm: IPmfm): any {
    switch (pmfm.type) {
      case 'qualitative_value':
        if (source.qualitativeValue && source.qualitativeValue.id) {
          return pmfm.qualitativeValues.find(qv => +qv.id === +source.qualitativeValue.id);
        }
        return null;
      case 'integer':
      case 'double':
        return source.numericalValue;
      case 'string':
        return source.alphanumericalValue;
      case 'boolean':
        return source.numericalValue === 1 ? true : (source.numericalValue === 0 ? false : undefined);
      case 'date':
        return fromDateISOString(source.alphanumericalValue);
      default:
        throw new Error('Unknown pmfm.type for getting value of measurement: ' + pmfm.type);
    }
  }


  static setMeasurementValue(value: any, target: Measurement, pmfm: IPmfm) {
    value = (value === null || value === undefined) ? undefined : value;
    switch (pmfm.type) {
      case 'qualitative_value':
        target.qualitativeValue = value;
        break;
      case 'integer':
      case 'double':
        target.numericalValue = value;
        break;
      case 'string':
        target.alphanumericalValue = value;
        break;
      case 'boolean':
        target.numericalValue = (value === true || value === 'true') ? 1 : ((value === false || value === 'false') ? 0 : undefined);
        break;
      case 'date':
        target.alphanumericalValue = toDateISOString(value);
        break;
      default:
        throw new Error('Unknown pmfm.type: ' + pmfm.type);
    }
  }

  static toModelValue(value: any, pmfm: DenormalizedPmfmStrategy | Pmfm): string | string[] {
    return PmfmValueUtils.toModelValue(value, pmfm);
  }

  static isEmpty(source: Measurement | any): boolean {
    if (!source) return true;
    return isNil(source.alphanumericalValue)
      && isNil(source.numericalValue)
      && (!source.qualitativeValue || isNil(source.qualitativeValue.id));
  }

  static areEmpty(source: Measurement[]): boolean {
    if (isEmptyArray(source)) return true;
    return !source.some(MeasurementUtils.isNotEmpty);
  }

  static isNotEmpty(source: Measurement | any): boolean {
    return !MeasurementUtils.isEmpty(source);
  }

  static toMeasurementValues(measurements: Measurement[]): MeasurementFormValues {
    return measurements && measurements.reduce((map, m) => {
      const value = m && m.pmfmId && [m.alphanumericalValue, m.numericalValue, m.qualitativeValue && m.qualitativeValue.id].find(isNotNil);
      map[m.pmfmId] = isNotNil(value) ? value : null;
      return map;
    }, {}) || undefined;
  }

  static asBooleanValue(measurements: Measurement[], pmfmId: number): boolean{
    const measurement = measurements.find(m => m.pmfmId === pmfmId);

    return measurement
      ? [measurement.alphanumericalValue, measurement.numericalValue, measurement.qualitativeValue && measurement.qualitativeValue.id].find(isNotNil) === 1
      : undefined;
  }

  static fromMeasurementValues(measurements: MeasurementFormValues): Measurement[] {
    return measurements && Object.getOwnPropertyNames(measurements).map(pmfmId => Measurement.fromObject({
      pmfmId,
      alphanumericalValue: measurements[pmfmId]
    })) || undefined;
  }

  // Update measurements from source values map
  static setValuesByFormValues(target: Measurement[], source: MeasurementFormValues, pmfms: IPmfm[]) {
    (target || []).forEach(m => {
      const pmfm = pmfms && pmfms.find(p => p.id === m.pmfmId);
      if (pmfm) MeasurementUtils.setMeasurementValue(source[pmfm.id], m, pmfm);
    });
  }

  static equals(array1: Measurement[], array2: Measurement[]): boolean {
    if (arraySize(array1) !== arraySize(array2)) return false;
    return MeasurementValuesUtils.equals(MeasurementUtils.toMeasurementValues(array1), MeasurementUtils.toMeasurementValues(array2));
  }

  static filter(measurements: Measurement[], pmfms: IPmfm[]): Measurement[] {
    const pmfmIds = (pmfms || []).map(pmfm => pmfm.id);
    return (measurements || []).filter(measurement => pmfmIds.includes(measurement.pmfmId));
  }
}

export class MeasurementValuesUtils {

  static valueEquals(v1: any,
                     v2: any): boolean {
    return (v1 === v2) || (v1 && v2 && isNotNil(v1.id) && v1.id === v2.id);
  }

  static equals(m1: MeasurementFormValues | MeasurementModelValues, m2: MeasurementFormValues | MeasurementModelValues): boolean {
    return (isNil(m1) && isNil(m2))
      || (m1 && !(Object.getOwnPropertyNames(m1).some(pmfmId => !this.valueEquals(m1[pmfmId], m2[pmfmId]))))
      || false;
  }

  static equalsPmfms(m1: { [pmfmId: number]: any },
                     m2: { [pmfmId: number]: any },
                     pmfms: IPmfm[]): boolean {
    return (isNil(m1) && isNil(m2))
      || !pmfms.find(pmfm => !this.valueEquals(m1[pmfm.id], m2[pmfm.id]));
  }

  static valueToString(value: any, opts: { pmfm: IPmfm; propertyNames?: string[]; htmls?: boolean }): string | undefined {
    return PmfmValueUtils.valueToString(value, opts);
  }

  static normalizeValueToModel(value: PmfmValue | PmfmValue[], pmfm: IPmfm): string {
    return PmfmValueUtils.toModelValue(value, pmfm);
  }

  static isMeasurementFormValues(value: MeasurementFormValues | MeasurementModelValues | any): value is MeasurementFormValues {
    return value.__typename === MeasurementValuesTypes.MeasurementFormValue;
  }

  static isMeasurementModelValues(value: MeasurementFormValues | MeasurementModelValues): value is MeasurementModelValues {
    return value.__typename !== MeasurementValuesTypes.MeasurementFormValue;
  }

  static resetTypename(value: MeasurementFormValues | MeasurementModelValues) {
    if (!value) return; // skip
    delete value.__typename;
  }

  static normalizeValuesToModel(source: MeasurementFormValues | MeasurementModelValues, pmfms: IPmfm[], opts = {
    keepSourceObject: false
  }): MeasurementModelValues {

    // DEBUG
    //console.debug('calling normalizeValuesToModel() from ' +  source.__typename);

    const target: MeasurementModelValues = opts.keepSourceObject ? source as MeasurementModelValues : {};

    if (this.isMeasurementFormValues(source)) {
      (pmfms || []).forEach(pmfm => {
        target[pmfm.id] = this.normalizeValueToModel(source[pmfm.id] as PmfmValue, pmfm);
      });
      // DO NOT delete __typename, but force it to MeasurementModelValues
      // If not: there is a bug when edition a row, saving and editing it again: the conversion to form is not applied!
      //delete target.__typename;
      target.__typename = MeasurementValuesTypes.MeasurementModelValues;
    }

    // Source = model values. Copy pmfm's values if need
    else if (!opts.keepSourceObject){
      (pmfms || []).forEach(pmfm => {
        target[pmfm.id] = source[pmfm.id];
      });
      target.__typename = MeasurementValuesTypes.MeasurementModelValues;
    }

    return target;
  }

  static normalizeValueToForm(value: any, pmfm: IPmfm): MeasurementFormValue {
    return PmfmValueUtils.fromModelValue(value, pmfm);
  }

  /**
   *
   * @param source
   * @param pmfms
   * @param opts
   *  - keepSourceObject: keep existing map unchanged (useful to keep extra pmfms) - false by default
   *  - onlyExistingPmfms: Will not init all pmfms, but only those that exists in the source map - false by default
   */
  static normalizeValuesToForm(source: MeasurementModelValues | MeasurementFormValues,
                               pmfms: IPmfm[],
                               opts?: {
                                 keepSourceObject?: boolean;
                                 onlyExistingPmfms?: boolean;
                               }): MeasurementFormValues {
    pmfms = pmfms || [];

    // DEBUG
    //console.debug('calling normalizeValueToForm() from ' +  source.__typename);

    // Normalize only given pmfms (reduce the pmfms list)
    if (opts?.onlyExistingPmfms) {
      pmfms = Object.getOwnPropertyNames(source || {})
        .filter(controlName => controlName !== '__typename')
        .reduce((res, pmfmId) => {
        const pmfm = pmfms.find(p => p.id === +pmfmId);
        return pmfm ? res.concat(pmfm) : res;
      }, []);
    }

    // Create target, or copy existing (e.g. useful to keep extra pmfms)
    const target: MeasurementFormValues | MeasurementModelValues = opts?.keepSourceObject
      ? {...source} : {};

    if (this.isMeasurementModelValues(target)) {
      // Copy from source, without value conversion (not need)
      if (this.isMeasurementFormValues(source)) {
        // Normalize all pmfms from the list
        pmfms.forEach(pmfm => {
          const pmfmId = pmfm?.id;
          if (isNil(pmfmId)) {
            console.warn('Invalid pmfm instance: missing required id. Please make sure to load DenormalizedPmfmStrategy or Pmfm', pmfm);
            return;
          }
          let value = source[pmfmId];
          // Apply default value, if any
          if (isNil(value) && isNotNil(pmfm.defaultValue)) {
            value = PmfmValueUtils.fromModelValue(pmfm.defaultValue, pmfm);
          }
          target[pmfmId.toString()] = value;
        });
      }
      // Copy from source, WITH value conversion
      else {
        // Normalize all pmfms from the list
        pmfms.forEach(pmfm => {
          const pmfmId = pmfm?.id;
          if (isNil(pmfmId)) {
            console.warn('Invalid pmfm instance: missing required id. Please make sure to load DenormalizedPmfmStrategy or Pmfm', pmfm);
            return;
          }
          target[pmfmId.toString()] = PmfmValueUtils.fromModelValue(source[pmfmId], pmfm);
        });
      }
      target.__typename = MeasurementValuesTypes.MeasurementFormValue;
    }

    return target;
  }

  static normalizeEntityToForm(data: IEntityWithMeasurement<any, any>,
                               pmfms: IPmfm[],
                               form?: UntypedFormGroup,
                               opts?: {
                                 keepOtherExistingPmfms?: boolean;
                                 onlyExistingPmfms?: boolean;
                               }) {
    if (!data) return; // skip

    // If a form exists
    if (form) {
      const measFormGroup = form.get('measurementValues');

      if (measFormGroup instanceof UntypedFormGroup) {
        // Remove extra PMFMS values (before adapt to form)
        const measurementValues = AppFormUtils.getFormValueFromEntity(data.measurementValues || {}, measFormGroup);

        // Adapt to form (e.g. transform a QV_ID into an object)
        data.measurementValues = this.normalizeValuesToForm(measurementValues, pmfms, {
          keepSourceObject: opts?.keepOtherExistingPmfms || false,
          onlyExistingPmfms: opts?.onlyExistingPmfms || false
        });
      } else {
        throw Error('No measurementValues found in form ! Make sure you use the right validator');
      }
    }
    // No validator: just normalize values
    else {
      data.measurementValues = this.normalizeValuesToForm(data.measurementValues || {}, pmfms, {
        // Keep extra pmfm values (not need to remove, when no validator used)
        keepSourceObject: true,
        onlyExistingPmfms: opts && opts.onlyExistingPmfms
      });
    }
  }

  static asObject(source: MeasurementModelValues | MeasurementFormValues, opts?: DataEntityAsObjectOptions): MeasurementModelValues | MeasurementFormValues {
    if (!opts || opts.minify !== true || !source) return source;

    return Object.getOwnPropertyNames(source)
      .filter(controlName => controlName !== '__typename') // Ignore __typename
      .reduce((target, pmfmId) => {
        target[pmfmId] = PmfmValueUtils.asObject(source[pmfmId]);
        return target;
      }, {});
  }

  static getFormValue(measurementValues: MeasurementFormValues | MeasurementModelValues, pmfms: IPmfm[], pmfmId: number, remove?: boolean): MeasurementFormValue {
    if (!measurementValues || !pmfms || isNil(pmfmId))
      return undefined;

    const pmfm = pmfms.find(p => p.id === +pmfmId);
    if (pmfm && isNotNil(measurementValues[pmfm.id])) {
      const value = this.normalizeValueToForm(measurementValues[pmfm.id], pmfm);
      if (remove === true) {
        console.warn('DEPRECATED used of `remove` argument, when call MeasurementValuesUtils.getFormValue()!! Please make sure you need this');
        delete measurementValues[pmfm.id];
      }
      return value;
    }
    return undefined;
  }

  static setFormValue(measurementValues: MeasurementFormValues | MeasurementModelValues, pmfms: IPmfm[], pmfmId: number, value: MeasurementFormValue) {
    if (!measurementValues || !pmfms || !pmfmId)
      return undefined;

    const pmfm = pmfms.find(p => p.id === +pmfmId);
    if (pmfm) {
      measurementValues[pmfm.id] = this.normalizeValueToForm(value, pmfm);
    }
    return undefined;
  }

  static isEmpty(measurementValues: MeasurementModelValues | MeasurementFormValues) {
    return isNil(measurementValues)
      || isEmptyArray(Object.getOwnPropertyNames(measurementValues).filter(pmfmId => !PmfmValueUtils.isEmpty(measurementValues[pmfmId])));
  }

  static isNotEmpty(measurementValues: MeasurementModelValues | MeasurementFormValues) {
    return isNotNil(measurementValues)
      && Object.getOwnPropertyNames(measurementValues).some(pmfmId => !PmfmValueUtils.isEmpty(measurementValues[pmfmId]));
  }
}


