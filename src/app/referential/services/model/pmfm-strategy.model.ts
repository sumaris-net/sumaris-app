import { Entity, EntityAsObjectOptions, EntityClass, IReferentialRef, isNil, isNotNil, ReferentialRef, ReferentialUtils, toNumber } from '@sumaris-net/ngx-components';
import { IDenormalizedPmfm, IPmfm, Pmfm, PmfmType, PmfmUtils } from './pmfm.model';
import { PmfmValue, PmfmValueUtils } from './pmfm-value.model';
import { MethodIds, UnitIds } from './model.enum';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";


@EntityClass({typename: "PmfmStrategyVO"})
export class PmfmStrategy extends Entity<PmfmStrategy> {

  static fromObject: (source: any, opts?: any) => PmfmStrategy;
  static asObject: (source: any, opts?: any) => any;
  static isEmpty = (o) => (!o || (!o.pmfm && !o.parameter && !o.matrix && !o.fraction && !o.method));
  static isNotEmpty = (o) => !PmfmStrategy.isEmpty(o);
  static getAcquisitionLevelLabel = (source: PmfmStrategy) => source && ((typeof source.acquisitionLevel === 'object') && source.acquisitionLevel.label || source.acquisitionLevel);
  static getPmfmId = (source: PmfmStrategy) => source && toNumber(source.pmfmId, source.pmfm?.id);
  static equals = (o1: PmfmStrategy, o2: PmfmStrategy) => (isNil(o1) && isNil(o2))
    // Same ID
    || (o1 && o2 && (
      // Same ID
      (isNotNil(o1.id) && o1.id === o2.id)
      // Or same strategy, rankOrder and acquisitionLevel
      || (o1.strategyId === o2.strategyId
        && o1.rankOrder === o2.rankOrder
        && (PmfmStrategy.getAcquisitionLevelLabel(o1) === PmfmStrategy.getAcquisitionLevelLabel(o2))
        // or same Pmfm
        && (PmfmStrategy.getPmfmId(o1) === PmfmStrategy.getPmfmId(o2)
          // or same Pmfm parts (parameter/matrix/fraction/method)
          || (ReferentialUtils.equals(o1.parameter, o2.parameter)
            && ReferentialUtils.equals(o1.matrix, o2.matrix)
            && ReferentialUtils.equals(o1.fraction, o2.fraction)
            && ReferentialUtils.equals(o1.method, o2.method)
        ))
      )));

  pmfmId: number;
  pmfm: IPmfm;
  parameter: ReferentialRef;
  matrix: ReferentialRef;
  fraction: ReferentialRef;
  method: ReferentialRef;

  acquisitionNumber: number;
  minValue: number;
  maxValue: number;
  defaultValue: PmfmValue;
  isMandatory: boolean;
  rankOrder: number;
  acquisitionLevel: string|IReferentialRef;

  gearIds: number[];
  taxonGroupIds: number[];
  referenceTaxonIds: number[];

  strategyId: number;
  hidden?: boolean;

  constructor() {
    super(PmfmStrategy.TYPENAME);
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.acquisitionLevel = PmfmStrategy.getAcquisitionLevelLabel(target);

    target.pmfmId = PmfmStrategy.getPmfmId(this);
    target.pmfm = this.pmfm && this.pmfm.asObject({...NOT_MINIFY_OPTIONS, ...options});
    target.parameter = this.parameter && this.parameter.asObject({...NOT_MINIFY_OPTIONS, ...options});
    target.matrix = this.matrix && this.matrix.asObject({...NOT_MINIFY_OPTIONS, ...options});
    target.fraction = this.fraction && this.fraction.asObject({...NOT_MINIFY_OPTIONS, ...options});
    target.method = this.method && this.method.asObject({...NOT_MINIFY_OPTIONS, ...options});

    // Serialize default value (into a number - because of the DB column's type)
    target.defaultValue = PmfmValueUtils.toModelValueAsNumber(this.defaultValue, this.pmfm);
    if (isNil(target.defaultValue) || this.isComputed) {
      delete target.defaultValue; // Delete if computed PMFM, or nil
    }
    // Delete min/value if NOT numeric
    if (!this.isNumeric) {
      delete target.minValue;
      delete target.maxValue;
    }

    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.pmfm = source.pmfm && Pmfm.fromObject(source.pmfm);
    this.pmfmId = toNumber(source.pmfmId, source.pmfm && source.pmfm.id);
    this.parameter = source.parameter && ReferentialRef.fromObject(source.parameter);
    this.matrix = source.matrix && ReferentialRef.fromObject(source.matrix);
    this.fraction = source.fraction && ReferentialRef.fromObject(source.fraction);
    this.method = source.method && ReferentialRef.fromObject(source.method);

    this.minValue = source.minValue;
    this.maxValue = source.maxValue;
    this.defaultValue = source.defaultValue;
    this.acquisitionNumber = source.acquisitionNumber;
    this.isMandatory = source.isMandatory;
    this.rankOrder = source.rankOrder;
    this.acquisitionLevel = source.acquisitionLevel;
    this.gearIds = source.gearIds && [...source.gearIds] || undefined;
    this.taxonGroupIds = source.taxonGroupIds && [...source.taxonGroupIds] || undefined;
    this.referenceTaxonIds = source.referenceTaxonIds && [...source.referenceTaxonIds] || undefined;
    this.strategyId = source.strategyId;
  }

  get required(): boolean {
    return this.isMandatory;
  }

  set required(value: boolean) {
    this.isMandatory = value;
  }

  get type(): string|PmfmType {
    return this.pmfm && this.pmfm.type;
  }

  get isNumeric(): boolean {
    return this.type === 'integer' || this.type === 'double';
  }

  get isAlphanumeric(): boolean {
    return this.type === 'string';
  }

  get isDate(): boolean {
    return this.type === 'date';
  }

  get isComputed(): boolean {
    return this.method && this.method.id === MethodIds.CALCULATED;
  }

  get isQualitative(): boolean {
    return this.type === 'qualitative_value';
  }

  get isBoolean(): boolean {
    return this.type === 'boolean';
  }

  equals(other: PmfmStrategy): boolean {
    return PmfmStrategy.equals(this, other);
  }
}

@EntityClass({typename: 'DenormalizedPmfmStrategyVO'})
export class DenormalizedPmfmStrategy
  extends Entity<DenormalizedPmfmStrategy>
  implements IDenormalizedPmfm<DenormalizedPmfmStrategy> {

  static fromObject: (source: any, opts?: any) => DenormalizedPmfmStrategy;
  static fromFullPmfm(source: Pmfm, opts?: any): DenormalizedPmfmStrategy {
    if (!source) return undefined;
    const target = new DenormalizedPmfmStrategy();
    target.fromObject({
      id: source.id,
      label: source.label,
      name: source.name,
      type: source.type,
      completeName: PmfmUtils.getPmfmName(source,{withDetails:true, withUnit: source.unit?.id !== UnitIds.NONE}),
      minValue: source.minValue,
      maxValue: source.maxValue,
      defaultValue: source.defaultValue,
      maximumNumberDecimals: source.maximumNumberDecimals,
      signifFiguresNumber: source.signifFiguresNumber,
      detectionThreshold: source.detectionThreshold,
      precision: source.precision,
      parameterId: source.parameter.id,
      matrixId: source.matrixId,
      fractionId: source.fractionId,
      methodId: source.methodId,
      unitLabel: source.unitLabel,
      qualitativeValues: source.parameter.qualitativeValues && source.parameter.qualitativeValues.map(ReferentialRef.fromObject),
    });
    return target;
  };

  label: string;
  name: string;
  completeName: string;
  unitLabel: string;
  type: string | PmfmType;
  minValue: number;
  maxValue: number;
  defaultValue: PmfmValue;
  maximumNumberDecimals: number;
  signifFiguresNumber: number;
  detectionThreshold: number;
  precision: number;
  isMandatory: boolean;
  acquisitionNumber: number;
  rankOrder: number;
  acquisitionLevel: string;

  parameterId: number;
  matrixId: number;
  fractionId: number;
  methodId: number;

  gearIds: number[];
  taxonGroupIds: number[];
  referenceTaxonIds: number[];

  qualitativeValues: ReferentialRef[];

  strategyId: number;
  hidden?: boolean;

  constructor() {
    super(DenormalizedPmfmStrategy.TYPENAME);
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject(options);
    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(options)) || undefined;
    target.defaultValue = +(PmfmValueUtils.toModelValue(this.defaultValue, this));
    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.parameterId = toNumber(source.parameterId, source.parameter?.id);
    this.matrixId = source.matrixId;
    this.fractionId = source.fractionId;
    this.methodId = source.methodId;
    this.label = source.label;
    this.name = source.name;
    this.completeName = source.completeName;
    this.unitLabel = source.unitLabel || source.unit?.label;
    this.type = source.type;
    this.minValue = source.minValue;
    this.maxValue = source.maxValue;
    this.maximumNumberDecimals = source.maximumNumberDecimals;
    this.defaultValue = source.defaultValue;
    this.acquisitionNumber = source.acquisitionNumber;
    this.signifFiguresNumber = source.signifFiguresNumber;
    this.isMandatory = source.isMandatory;
    this.rankOrder = source.rankOrder;
    this.acquisitionLevel = source.acquisitionLevel;
    this.gearIds = source.gearIds && [...source.gearIds] || undefined;
    this.taxonGroupIds = source.taxonGroupIds && [...source.taxonGroupIds] || undefined;
    this.referenceTaxonIds = source.referenceTaxonIds && [...source.referenceTaxonIds] || undefined;
    this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject);
    this.strategyId = source.strategyId;
  }

  get required(): boolean {
    return this.isMandatory;
  }

  set required(value: boolean) {
    this.isMandatory = value;
  }

  get isNumeric(): boolean {
    return this.type === 'integer' || this.type === 'double';
  }

  get isAlphanumeric(): boolean {
    return this.type === 'string';
  }

  get isDate(): boolean {
    return this.type === 'date';
  }

  get isComputed(): boolean {
    return this.type && PmfmUtils.isComputed(this);
  }

  get isQualitative(): boolean {
    return this.type === 'qualitative_value';
  }

  get hasUnit(): boolean {
    return this.unitLabel && this.isNumeric;
  }

  get isWeight(): boolean {
    return PmfmUtils.isWeight(this);
  }

  get isMultiple(): boolean {
    return (this.acquisitionNumber || 1) > 1;
  }

  /**
   * @deprecated Use id instead
   */
  get pmfmId(): number {
    return this.id;
  }

  equals(other: DenormalizedPmfmStrategy): boolean {
    return other && (
      (isNotNil(this.id) && this.id === other.id)
      // Same strategy, acquisitionLevel, pmfmId
      || (this.strategyId === other.strategyId && this.acquisitionLevel === other.acquisitionLevel)
    );
  }
}
