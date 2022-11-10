import { Entity, EntityAsObjectOptions, EntityClass, fromDateISOString, IEntity, isNotNil, ReferentialRef, toNumber} from '@sumaris-net/ngx-components';
import {MethodIdGroups, PmfmIds, PmfmLabelPatterns, UnitLabel, UnitLabelGroups, UnitLabelPatterns, WeightKgConversion, WeightUnitSymbol} from './model.enum';
import {Parameter, ParameterType} from './parameter.model';
import {PmfmValue} from './pmfm-value.model';
import {Moment} from 'moment';
import { FullReferential } from '@app/referential/services/model/referential.model';

export declare type PmfmType = ParameterType | 'integer';

export declare type ExtendedPmfmType = PmfmType | 'latitude' | 'longitude' | 'duration' | 'dateTime';

export const PMFM_ID_REGEXP = /\d+/;

export const PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP = new RegExp(/^\s*([^\/(]+)((?:\s+\/\s+[^/]+)|(?:\([^\)]+\)))$/);

export interface IPmfm<
  T extends IPmfm<T, ID> = IPmfm<any, any>,
  ID = number
  > extends IEntity<T, ID> {
  id: ID;
  label: string;

  type: string | PmfmType;
  minValue: number;
  maxValue: number;
  defaultValue: number|PmfmValue;
  maximumNumberDecimals: number;
  signifFiguresNumber: number;
  detectionThreshold: number;
  precision: number;

  matrixId: number;
  fractionId: number;
  methodId: number;

  qualitativeValues: ReferentialRef[];

  unitLabel: string;
  rankOrder?: number;

  isQualitative: boolean;
  isComputed: boolean;
  isMultiple: boolean;
  required?: boolean;
  hidden?: boolean;

  displayConversion?: UnitConversion;
}

export interface IDenormalizedPmfm<
  T extends IDenormalizedPmfm<T, ID> = IDenormalizedPmfm<any, any>,
  ID = number
  > extends IPmfm<T, ID> {

  completeName?: string;
  name?: string;
  acquisitionNumber?: number;
  acquisitionLevel?: string;

  gearIds: number[];
  taxonGroupIds: number[];
  referenceTaxonIds: number[];

}


export interface IFullPmfm<
  T extends IFullPmfm<T, ID> = IFullPmfm<any, any>,
  ID = number
  > extends IPmfm<T, ID> {

  parameter: Parameter;
  matrix: ReferentialRef;
  fraction: ReferentialRef;
  method: ReferentialRef;
  unit: ReferentialRef;
}


@EntityClass({typename: 'UnitConversionVO'})
export class UnitConversion {

  static fromObject: (source: Partial<UnitConversion>, opts?: any) => UnitConversion;

  fromUnit: ReferentialRef;
  toUnit: ReferentialRef;
  conversionCoefficient: number;
  updateDate: Moment;

  constructor() {
  }

  fromObject(source: any) {
    this.fromUnit = source.fromUnit && ReferentialRef.fromObject(source.fromUnit);
    this.toUnit = source.toUnit && ReferentialRef.fromObject(source.toUnit);
    this.conversionCoefficient = source.conversionCoefficient;
    this.updateDate = fromDateISOString(source.updateDate);
  }
}

@EntityClass({typename: 'PmfmVO'})
export class Pmfm extends FullReferential<Pmfm> implements IFullPmfm<Pmfm> {

  static ENTITY_NAME = 'Pmfm';
  static fromObject: (source: any, opts?: any) => Pmfm;

  type: string | PmfmType;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  maximumNumberDecimals: number;
  signifFiguresNumber: number;
  detectionThreshold: number;
  precision: number;

  parameter: Parameter;
  matrix: ReferentialRef;
  fraction: ReferentialRef;
  method: ReferentialRef;
  unit: ReferentialRef;

  qualitativeValues: ReferentialRef[];

  completeName: string; // Computed attributes
  // alreadyConverted: boolean;

  displayConversion?: UnitConversion;

  constructor() {
    super(Pmfm.TYPENAME);
    this.entityName = Pmfm.ENTITY_NAME;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject({
      ...opts,
      minify: false // Do NOT minify itself
    });

    if (opts && opts.minify) {
      target.parameterId = toNumber(this.parameter && this.parameter.id, null);
      target.matrixId = toNumber(this.matrix && this.matrix.id, null);
      target.fractionId = toNumber(this.fraction && this.fraction.id, null);
      target.methodId = toNumber(this.method && this.method.id, null);
      target.unitId = toNumber(this.unit && this.unit.id, null);
      delete target.parameter;
      delete target.matrix;
      delete target.fraction;
      delete target.method;
      delete target.unit;
    }
    else {
      target.parameter = this.parameter && this.parameter.asObject(opts);
      target.matrix = this.matrix && this.matrix.asObject(opts);
      target.fraction = this.fraction && this.fraction.asObject(opts);
      target.method = this.method && this.method.asObject(opts);
      target.unit = this.unit && this.unit.asObject(opts);
    }

    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(opts)) || undefined;

    return target;
  }

  fromObject(source: any): Pmfm {
    super.fromObject(source);

    this.entityName = source.entityName || Pmfm.ENTITY_NAME;
    this.type = source.type;
    this.minValue = source.minValue;
    this.maxValue = source.maxValue;
    this.defaultValue = source.defaultValue;
    this.maximumNumberDecimals = source.maximumNumberDecimals;
    this.signifFiguresNumber = source.signifFiguresNumber;
    this.detectionThreshold = source.detectionThreshold;
    this.precision = source.precision;

    this.parameter = source.parameter && Parameter.fromObject(source.parameter);
    this.matrix = source.matrix && ReferentialRef.fromObject(source.matrix);
    this.fraction = source.fraction && ReferentialRef.fromObject(source.fraction);
    this.method = source.method && ReferentialRef.fromObject(source.method);
    this.unit = source.unit && ReferentialRef.fromObject(source.unit);

    this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject) || undefined;

    this.completeName = source.completeName;
    return this;
  }

  get isQualitative(): boolean {
    return this.type === 'qualitative_value';
  }

  get matrixId(): number {
    return this.matrix && this.matrix.id;
  }

  get fractionId(): number {
    return this.fraction && this.fraction.id;
  }

  get methodId(): number {
    return this.method && this.method.id;
  }

  get unitLabel(): string {
    return this.unit && this.unit.label;
  }

  get isComputed(): boolean {
    return PmfmUtils.isComputed(this);
  }

  get isMultiple(): boolean {
    return false; // Default value
  }
}

export abstract class PmfmUtils {

  static NAME_WITH_WEIGHT_UNIT_REGEXP = /^(.* )\((t|kg|g|mg)\)( - .*)?$/;

  static getExtendedType(pmfm: IPmfm): ExtendedPmfmType {
    if (!pmfm || !pmfm.type) return ; // Unknown
    if (pmfm.type === 'double') {
      if (PmfmLabelPatterns.LATITUDE.test(pmfm.label)) {
        return "latitude";
      }
      if (PmfmLabelPatterns.LONGITUDE.test(pmfm.label)) {
        return "longitude";
      }
      if (pmfm.unitLabel === UnitLabel.DECIMAL_HOURS || UnitLabelPatterns.DECIMAL_HOURS.test(pmfm.unitLabel)) {
        return "duration";
      }
    }
    else if (pmfm.type === "date") {
      if (pmfm.unitLabel === UnitLabel.DATE_TIME || UnitLabelPatterns.DATE_TIME.test(pmfm.unitLabel)) {
        return 'dateTime';
      }
    }
    return pmfm.type as ExtendedPmfmType;
  }

  static filterPmfms<P extends IPmfm>(pmfms: P[], opts?: {
    excludeHidden?: boolean; // true by default
    excludePmfmIds?: number[];
  }): P[] {
    return pmfms.filter(p => p
      // Exclude hidden pmfms
      && (!opts || !opts.excludeHidden || !p.hidden)
      // Exclude some pmfm by ids
      && (!opts || !opts.excludePmfmIds?.length || !opts.excludePmfmIds.includes(p.id)));
  }

  static getFirstQualitativePmfm<P extends IPmfm>(pmfms: P[], opts: {
    excludeHidden?: boolean;
    excludePmfmIds?: number[];
    minQvCount?: number;
    maxQvCount?: number;
    filterFn?: (IPmfm, index) => boolean;
  } = {
    minQvCount: 1 // Should have at least 2 values (by default)
  }): P {
    // exclude hidden pmfm (see batch modal)
    const qvPmfm = this.filterPmfms(pmfms, opts)
      .find((p, index) => {
        return p.type === 'qualitative_value'
          && p.qualitativeValues
          // Exclude if no enough qualitative values
          && p.qualitativeValues.length >= opts.minQvCount
          // Exclude if too many qualitative values
          && (!opts.maxQvCount || p.qualitativeValues.length <= opts.maxQvCount)
          // Apply the first function, if any
          && (!opts.filterFn || opts.filterFn(p, index));
      });
    return qvPmfm;
  }

  static isNumeric(pmfm: IPmfm): boolean {
    return pmfm.type === 'integer' || pmfm.type === 'double';
  }

  static isAlphanumeric(pmfm: IPmfm): boolean {
    return pmfm.type === 'string';
  }

  static isDate(pmfm: IPmfm): boolean {
    return pmfm.type === 'date';
  }

  /**
  * Check if individual weight (e.g. for batches, products)
  * @param pmfm
  */
  static isWeight(pmfm: IPmfm): boolean {
    return UnitLabelGroups.WEIGHT.includes(pmfm.unitLabel)
      || PmfmLabelPatterns.WEIGHT.test(pmfm.label)
      || (pmfm instanceof Pmfm && PmfmLabelPatterns.WEIGHT.test(pmfm.parameter?.label));
  }


  /**
   * Check if dressing pmfms (by id or by  label like 'DRESSING_%')
   * @param pmfm
   */
  static isDressing(pmfm: IPmfm): boolean {
  return pmfm.id === PmfmIds.DRESSING
    || PmfmLabelPatterns.DRESSING.test(pmfm.label)
    || (pmfm instanceof Pmfm && PmfmLabelPatterns.DRESSING.test(pmfm.parameter?.label));
  }

  /**
   * Check if individual length (e.g. for batches, products)
   * @param pmfm
   */
  static isLength(pmfm: IPmfm): boolean {
    return pmfm && (
      (UnitLabelGroups.LENGTH.includes(pmfm.unitLabel) && (PmfmLabelPatterns.LENGTH.test(pmfm.label)))
      || (pmfm instanceof Pmfm
        && UnitLabelGroups.LENGTH.includes(pmfm.unit?.label)
        && PmfmLabelPatterns.LENGTH.test(pmfm.parameter?.label))
    );
  }

  static hasParameterLabelIncludes(pmfm: Pmfm, labels: string[]): boolean {
    return pmfm && labels.includes(pmfm.parameter.label);
  }

  static isComputed(pmfm: IPmfm) {
    return (isNotNil(pmfm.methodId) && MethodIdGroups.CALCULATED.includes(pmfm.methodId))
      || (pmfm instanceof Pmfm && MethodIdGroups.CALCULATED.includes(pmfm.method?.id));
  }

  static isDenormalizedPmfm(pmfm: IPmfm): pmfm is IDenormalizedPmfm {
    return (pmfm['completeName'] || pmfm['name']) && true;
  }

  static isFullPmfm(pmfm: IPmfm): pmfm is IFullPmfm {
    return pmfm['parameter'] && true;
  }

  static isNotHidden(pmfm: IPmfm): boolean {
    return !pmfm.hidden;
  }

  /**
   * Compute a PMFM.NAME, with the last part of the name
   * @param pmfm
   * @param opts
   */
  static getPmfmName(pmfm: IPmfm, opts?: {
    withUnit?: boolean; // true by default
    compact?: boolean; // true by default
    html?: boolean; // false by default
    withDetails?: boolean; // false by default
  }): string {
    if (!pmfm) return undefined;

    let name;
    if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
      // If withDetails = true, use complete name if exists
      if (opts && opts.withDetails && pmfm.completeName) {
        if (!opts.html) return pmfm.completeName;

        // Html: secondary elements (matrix, fraction, method, etc.) small
        const index = pmfm.completeName.indexOf(' - ');
        return index !== -1
          ? `<b>${pmfm.completeName.substr(0, index)}</b><div class="pmfm-details">${pmfm.completeName.substr(index + 3)}</div>`
          : pmfm.completeName;
      }

      // Remove parenthesis content (=synonym), if any
      // e.g.
      // - 'Longueur totale (LT)' should becomes 'Longueur totale'
      // - 'D1 / Open wounds' should becomes 'D1'

      if (!opts || opts.compact !== false) {
        const matches = PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP.exec(pmfm.name || '');
        name = matches && matches[1] || pmfm.name;
      }
      else {
        name = pmfm.name;
      }
    } else if (PmfmUtils.isFullPmfm(pmfm)) {
      name = pmfm.parameter && pmfm.parameter.name;
      if (opts && opts.withDetails) {
        name += [
          pmfm.matrix && pmfm.matrix.name,
          pmfm.fraction && pmfm.fraction.name,
          pmfm.method && pmfm.method.name
        ].filter(isNotNil).join(' - ');
      }
    }

    // Append unit
    if ((!opts || opts.withUnit !== false) && (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unitLabel && pmfm.unitLabel !== '°') {
      if (opts && opts.html) {
        name += `<small><br/>(${pmfm.unitLabel})</small>`;
      } else {
        name += ` (${pmfm.unitLabel})`;
      }
    }
    return name;
  }

  /**
   * Add weight conversion to a list of pmfms
   * @param pmfms
   * @param expectedWeightSymbol
   * @param opts
   */
  static setWeightUnitConversions<P extends IPmfm>(pmfms: P[],
                                                   expectedWeightSymbol: WeightUnitSymbol,
                                                   opts = { clone: true }): P[] {
    (pmfms || []).forEach((pmfm, i) => {
      pmfms[i] = this.setWeightUnitConversion(pmfm, expectedWeightSymbol, opts);
    });
    return pmfms;
  }

  static setWeightUnitConversion<P extends IPmfm>(source: P,
                                                  expectedWeightSymbol: WeightUnitSymbol,
                                                  opts = { clone: true }): P {
    if (!this.isWeight(source)) return source;

    const actualWeightUnit = source.unitLabel?.toLowerCase() || UnitLabel.KG;
    if (actualWeightUnit === expectedWeightSymbol) return; // Conversion not need

    // actual -> kg (pivot) -> expected
    const conversionCoefficient = WeightKgConversion[actualWeightUnit] / WeightKgConversion[expectedWeightSymbol];

    // Clone to keep existing pmfm unchanged
    const target = opts.clone ? source.clone() as P : source;

    target.displayConversion =  UnitConversion.fromObject({conversionCoefficient});

    if (this.isDenormalizedPmfm(target)) {
      target.unitLabel = expectedWeightSymbol;

      // Update the complete name (the unit part), if exists
      const matches = target.completeName && this.NAME_WITH_WEIGHT_UNIT_REGEXP.exec(target.completeName);
      if (matches) {
        target.completeName = `${matches[1]}(${expectedWeightSymbol})${matches[3]||''}`;
      }

      // Convert max number decimals
      if (isNotNil(target.maximumNumberDecimals)) {
        const convertedMaximumNumberDecimals = Math.log10(conversionCoefficient);
        target.maximumNumberDecimals = Math.max(0, target.maximumNumberDecimals - convertedMaximumNumberDecimals);
      }
    }
    else if ((target instanceof Pmfm) && target.unit) {
      target.unit.label = expectedWeightSymbol;
      target.unit.name = expectedWeightSymbol;
    }
    return target;
  }
}


