import {EntityAsObjectOptions} from "../../../core/services/model/entity.model";
import {Referential, ReferentialRef} from "../../../core/services/model/referential.model";
import {isNotNil} from "../../../shared/functions";
import {PmfmIds} from "./model.enum";
import {Parameter, ParameterType} from "./parameter.model";
import {PmfmStrategy} from "./pmfm-strategy.model";

export declare type PmfmType = ParameterType | 'integer';

export const PMFM_ID_REGEXP = /\d+/;

export const PMFM_NAME_REGEXP = new RegExp(/^\s*([^\/]+)[/]\s*(.*)$/);


export class Pmfm extends Referential<Pmfm> {

  static TYPENAME = 'Pmfm';

  static fromObject(source: any): Pmfm {
    if (!source || source instanceof Pmfm) return source;
    const res = new Pmfm();
    res.fromObject(source);
    return res;
  }

  type: string | PmfmType;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  maximumNumberDecimals: number;
  signifFiguresNumber: number;

  parameter: Parameter;
  matrix: ReferentialRef;
  fraction: ReferentialRef;
  method: ReferentialRef;
  unit: ReferentialRef;

  qualitativeValues: ReferentialRef[];

  constructor() {
    super();
    this.entityName = Pmfm.TYPENAME;
  }

  clone(): Pmfm {
    const target = new Pmfm();
    this.copy(target);
    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.clone()) || undefined;
    return target;
  }

  copy(target: Pmfm): Pmfm {
    target.fromObject(this);
    return target;
  }

  asObject(options?: EntityAsObjectOptions): any {
    const target: any = super.asObject({
      ...options,
      minify: false // Do NOT minify itself
    });

    if (options && options.minify) {
      target.parameterId = this.parameter && this.parameter.id;
      target.matrixId = this.matrix && this.matrix.id;
      target.fractionId = this.fraction && this.fraction.id;
      target.methodId = this.method && this.method.id;
      target.unitId = this.unit && this.unit.id;
      delete target.parameter;
      delete target.matrix;
      delete target.fraction;
      delete target.method;
      delete target.unit;
    }
    else {
      target.parameter = this.parameter && this.parameter.asObject(options);
      target.matrix = this.matrix && this.matrix.asObject(options);
      target.fraction = this.fraction && this.fraction.asObject(options);
      target.method = this.method && this.method.asObject(options);
      target.unit = this.unit && this.unit.asObject(options);
    }

    target.qualitativeValues = this.qualitativeValues && this.qualitativeValues.map(qv => qv.asObject(options)) || undefined;
    return target;
  }

  fromObject(source: any): Pmfm {
    super.fromObject(source);

    this.entityName = source.entityName || Pmfm.TYPENAME;
    this.type = source.type;
    this.minValue = source.minValue;
    this.maxValue = source.maxValue;
    this.defaultValue = source.defaultValue;
    this.maximumNumberDecimals = source.maximumNumberDecimals;
    this.signifFiguresNumber = source.signifFiguresNumber;

    this.parameter = source.parameter && Parameter.fromObject(source.parameter);
    this.matrix = source.matrix && ReferentialRef.fromObject(source.matrix);
    this.fraction = source.fraction && ReferentialRef.fromObject(source.fraction);
    this.method = source.method && ReferentialRef.fromObject(source.method);
    this.unit = source.unit && ReferentialRef.fromObject(source.unit);

    this.qualitativeValues = source.qualitativeValues && source.qualitativeValues.map(ReferentialRef.fromObject) || undefined;
    return this;
  }
}



export abstract class PmfmUtils {

  static getFirstQualitativePmfm(pmfms: PmfmStrategy[]): PmfmStrategy {
    let qvPmfm = pmfms.find(p => p.isQualitative
      // exclude hidden pmfm (see batch modal)
      && !p.hidden
    );
    // If landing/discard: 'Landing' is always before 'Discard (see issue #122)
    if (qvPmfm && qvPmfm.pmfmId === PmfmIds.DISCARD_OR_LANDING) {
      qvPmfm = qvPmfm.clone(); // copy, to keep original array
      qvPmfm.qualitativeValues.sort((qv1, qv2) => qv1.label === 'LAN' ? -1 : 1);
    }
    return qvPmfm;
  }

  static isNumeric(pmfm: PmfmStrategy | Pmfm): boolean {
    return isNotNil(pmfm.type) && (pmfm.type === 'integer' || pmfm.type === 'double');
  }

  static isAlphanumeric(pmfm: PmfmStrategy | Pmfm): boolean {
    return isNotNil(pmfm.type) && (pmfm.type === 'string');
  }

  static isDate(pmfm: PmfmStrategy | Pmfm): boolean {
    return isNotNil(pmfm.type) && (pmfm.type === 'date');
  }

  static hasUnit(pmfm: PmfmStrategy): boolean {
    return isNotNil(pmfm.unitLabel) && PmfmUtils.isNumeric(pmfm);
  }

  static isWeight(pmfm: PmfmStrategy | Pmfm): boolean {
    return isNotNil(pmfm.label) && pmfm.label.endsWith("WEIGHT");
  }
  static hasParameterLabel(pmfm: Pmfm, label: string): boolean {
    return isNotNil(pmfm.parameter) && pmfm.parameter.label === label;
  }
  static hasParameterLabelIncludes(pmfm: Pmfm, labels: string[]): boolean {
    return isNotNil(pmfm.parameter) && labels.includes(pmfm.parameter.label);
  }
}

