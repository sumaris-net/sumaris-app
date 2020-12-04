import {
  MINIFY_OPTIONS,
  NOT_MINIFY_OPTIONS,
  Referential,
  ReferentialAsObjectOptions,
  ReferentialRef
} from "../../../core/services/model/referential.model";
import {Entity} from "../../../core/services/model/entity.model";
import {Moment} from "moment";
import {EntityAsObjectOptions} from "../../../core/services/model/entity.model";
import {fromDateISOString, isEmptyArray, isNotNil, toDateISOString} from "../../../shared/functions";
import {TaxonGroupRef, TaxonNameRef} from "./taxon.model";
import {PmfmStrategy} from "./pmfm-strategy.model";
import {AppliedStrategy, Strategy, StrategyDepartment, TaxonGroupStrategy, TaxonNameStrategy} from "./strategy.model";
import {options} from "ionicons/icons";


export class SimpleStrategy extends Strategy {

  static TYPENAME = 'StrategyVO';

  static fromObject(source: any): Strategy {
    if (!source || source instanceof Strategy) return source;
    const res = new Strategy();
    res.fromObject(source);
    return res;
  }
  year : Moment;
  comments : string;
  sampleRowCode : string;
  eotp: string;
  taxonName: TaxonNameRef;
  laboratories: ReferentialRef [];
  fishingAreas: ReferentialRef [];
  calcifiedTypes: ReferentialRef[];
  sex : boolean;
  age : boolean;

  constructor() {
    super();

    this.year=null;
    this.comments=null;
    this.taxonName = null;
    this.eotp = null;
    this.sampleRowCode = null;
    this.laboratories =  [];
    this.fishingAreas = [];
    this.sex = null;
    this.age =null;
    this.calcifiedTypes = [];

  }
    clone(): SimpleStrategy {
    const target = new SimpleStrategy();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);

    target.year = toDateISOString(this.year);
    target.comments = this.comments;
    target.taxonName = this.taxonName;
    target.eotp = this.eotp;
    target.sampleRowCode = this.sampleRowCode;
    target.laboratories = this.laboratories && this.laboratories.filter(isNotNil).map(p => p && p.asObject({...opts, ...NOT_MINIFY_OPTIONS})) || undefined;
    if (isEmptyArray(target.laboratories)) delete target.laboratories; // Clean is empty, for compat with previous version
    target.fishingAreas = this.fishingAreas && this.fishingAreas.filter(isNotNil).map(p => p && p.asObject({...opts, ...NOT_MINIFY_OPTIONS})) || undefined;
    if (isEmptyArray(target.fishingAreas)) delete target.fishingAreas; // Clean is empty, for compat with previous version
    target.calcifiedTypes = this.calcifiedTypes && this.calcifiedTypes.filter(isNotNil).map(p => p && p.asObject({...opts, ...NOT_MINIFY_OPTIONS})) || undefined;
    if (isEmptyArray(target.calcifiedTypes)) delete target.calcifiedTypes; // Clean is empty, for compat with previous version
    target.sex = this.sex;
    target.age = this.age;

    return target;
  }

  fromObject(source: any) {
    this.year = fromDateISOString(source.year);
    this.comments = source.comments;
    this.sampleRowCode = source.sampleRowCode;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName) || undefined;
    this.eotp = source.eotp;
    this.laboratories = source.laboratories && source.laboratories.map(ReferentialRef.fromObject) || [];
    this.fishingAreas = source.fishingAreas && source.fishingAreas.map(ReferentialRef.fromObject) || [];
    this.calcifiedTypes = source.calcifiedTypes && source.calcifiedTypes.map(ReferentialRef.fromObject) || [];
    this.sex = source.sex  || undefined;
    this.age = source.age  || undefined;
  }

}

