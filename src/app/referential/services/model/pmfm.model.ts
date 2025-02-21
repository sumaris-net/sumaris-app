import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  IEntity,
  isNil,
  ReferentialRef,
  ReferentialUtils,
  SuggestFn,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Parameter, ParameterType } from './parameter.model';
import { PmfmValue, PmfmValueUtils } from './pmfm-value.model';
import { Moment } from 'moment';
import { FullReferential } from '@app/referential/services/model/referential.model';
import { PmfmUtils } from '@app/referential/services/model/pmfm-utils';

export declare type PmfmType = ParameterType | 'integer';

export declare type ExtendedPmfmType = PmfmType | 'latitude' | 'longitude' | 'duration' | 'dateTime';

export const PMFM_ID_REGEXP = /\d+/;

// eslint-disable-next-line no-useless-escape
export const PMFM_NAME_ENDS_WITH_PARENTHESIS_REGEXP = new RegExp(/^\s*([^\(]+)(?:(\s*\/\s+[^/]+)|(\s*\([^\)]+\s*\)))+$/);

export interface IPmfm<T extends IPmfm<T, ID> = IPmfm<any, any>, ID = number> extends IEntity<T, ID> {
  id: ID;
  label: string;

  type: string | PmfmType;
  minValue: number;
  maxValue: number;
  defaultValue: number | PmfmValue;
  maximumNumberDecimals: number;
  signifFiguresNumber: number;
  detectionThreshold: number;
  precision: number;

  matrixId: number;
  fractionId: number;
  methodId: number;

  qualitativeValues: ReferentialRef[];
  suggestQualitativeValueFn?: SuggestFn<ReferentialRef, any>;

  unitLabel: string;
  rankOrder?: number;
  acquisitionNumber?: number;

  isQualitative: boolean;
  isComputed: boolean;
  isMultiple: boolean;
  required?: boolean;
  hidden?: boolean;

  displayConversion?: UnitConversion;
}

export interface IDenormalizedPmfm<T extends IDenormalizedPmfm<T, ID> = IDenormalizedPmfm<any, any>, ID = number> extends IPmfm<T, ID> {
  completeName?: string;
  name?: string;
  acquisitionNumber?: number;
  acquisitionLevel?: string;

  gearIds: number[];
  taxonGroupIds: number[];
  referenceTaxonIds: number[];
}

export interface IFullPmfm<T extends IFullPmfm<T, ID> = IFullPmfm<any, any>, ID = number> extends IPmfm<T, ID> {
  parameter: Parameter;
  matrix: ReferentialRef;
  fraction: ReferentialRef;
  method: ReferentialRef;
  unit: ReferentialRef;
}

@EntityClass({ typename: 'UnitConversionVO' })
export class UnitConversion {
  static fromObject: (source: any, opts?: any) => UnitConversion;

  static equals(uc1: UnitConversion, uc2: UnitConversion) {
    return (
      uc1 === uc2 ||
      (isNil(uc1)
        ? isNil(uc2)
        : ReferentialUtils.equals(uc1.fromUnit, uc2?.fromUnit) &&
          ReferentialUtils.equals(uc1.toUnit, uc2?.toUnit) &&
          uc1.conversionCoefficient === uc2?.conversionCoefficient)
    );
  }

  fromUnit: ReferentialRef;
  toUnit: ReferentialRef;
  conversionCoefficient: number;
  updateDate: Moment;

  constructor() {}

  clone(opts?: EntityAsObjectOptions & any): UnitConversion {
    const target = new UnitConversion();
    this.copy(target, opts);
    return target;
  }

  copy(target: UnitConversion, opts?: EntityAsObjectOptions & any) {
    target.fromObject(this.asObject(opts), opts);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      fromUnit: this.fromUnit?.asObject(opts),
      toUnit: this.toUnit?.asObject(opts),
      conversionCoefficient: this.conversionCoefficient,
      updateDate: DateUtils.toDateISOString(this.updateDate),
    };
  }

  fromObject(source: any, opts?: any) {
    this.fromUnit = source.fromUnit && ReferentialRef.fromObject(source.fromUnit);
    this.toUnit = source.toUnit && ReferentialRef.fromObject(source.toUnit);
    this.conversionCoefficient = source.conversionCoefficient;
    this.updateDate = fromDateISOString(source.updateDate);
  }

  /**
   * Invert fromUnit and toUnit. Set the conversionCoefficient to its inverse.
   *
   * @return self This object itself.
   */
  reverse() {
    const currentFromUnit = this.fromUnit;
    const currentToUnit = this.toUnit;
    this.fromUnit = currentToUnit;
    this.toUnit = currentFromUnit;
    this.conversionCoefficient = 1 / this.conversionCoefficient;
    return this;
  }
}

@EntityClass({ typename: 'PmfmVO' })
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
  displayConversion?: UnitConversion;

  constructor() {
    super(Pmfm.TYPENAME);
    this.entityName = Pmfm.ENTITY_NAME;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject({
      ...opts,
      minify: false, // Do NOT minify itself
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
      delete target.displayConversion;
    } else {
      target.parameter = this.parameter && this.parameter.asObject(opts);
      target.matrix = this.matrix && this.matrix.asObject(opts);
      target.fraction = this.fraction && this.fraction.asObject(opts);
      target.method = this.method && this.method.asObject(opts);
      target.unit = this.unit && this.unit.asObject(opts);
      target.displayConversion = this.displayConversion?.asObject(opts);
    }

    target.qualitativeValues = (this.qualitativeValues && this.qualitativeValues.map((qv) => qv.asObject(opts))) || undefined;
    target.defaultValue = PmfmValueUtils.toModelValue(this.defaultValue, this, { applyConversion: false });

    // Revert conversion (if any)
    if (this.displayConversion) PmfmUtils.applyConversion(target, this.displayConversion.clone().reverse(), { markAsConverted: false });

    return target;
  }

  fromObject(source: any): Pmfm {
    super.fromObject(source);

    this.entityName = source.entityName || Pmfm.ENTITY_NAME;
    this.type = source.type || source.parameter?.type;
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

    this.qualitativeValues = (source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject)) || undefined;

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
