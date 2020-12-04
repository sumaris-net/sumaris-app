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
import {fromDateISOString, toDateISOString} from "../../../shared/functions";
import {TaxonGroupRef, TaxonNameRef} from "./taxon.model";
import {PmfmStrategy} from "./pmfm-strategy.model";


export class Strategy extends Referential<Strategy> {

  static TYPENAME = 'StrategyVO';

  static fromObject(source: any): Strategy {
    if (!source || source instanceof Strategy) return source;
    const res = new Strategy();
    res.fromObject(source);
    return res;
  }

  label: string;
  name: string;
  description: string;
  comments: string;
  analyticReference: string;
  creationDate: Moment;
  statusId: number;
  appliedStrategies: AppliedStrategy[];
  pmfmStrategies: PmfmStrategy[];
  strategyDepartments: StrategyDepartment[];

  gears: any[];
  taxonGroups: TaxonGroupStrategy[];
  taxonNames: TaxonNameStrategy[];

  programId: number;


  constructor(data?: {
    id?: number,
    label?: string,
    name?: string
  }) {
    super();
    this.id = data && data.id;
    this.label = data && data.label;
    this.name = data && data.name;
    this.appliedStrategies = [];
    this.pmfmStrategies = [];
    this.strategyDepartments = [];
    this.gears = [];
    this.taxonGroups = [];
    this.taxonNames = [];
  }

  clone(): Strategy {
    const target = new Strategy();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.programId = this.programId;
    target.creationDate = toDateISOString(this.creationDate);
    target.appliedStrategies = this.appliedStrategies && this.appliedStrategies.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.pmfmStrategies = this.pmfmStrategies && this.pmfmStrategies.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.strategyDepartments = this.strategyDepartments && this.strategyDepartments.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.gears = this.gears && this.gears.map(s => s.asObject(opts));
    target.taxonGroups = this.taxonGroups && this.taxonGroups.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.taxonNames = this.taxonNames && this.taxonNames.map(s => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));

    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.label = source.label;
    this.name = source.name;
    this.description = source.description;
    this.comments = source.comments;
    this.analyticReference = source.analyticReference;
    this.statusId = source.statusId;
    this.creationDate = fromDateISOString(source.creationDate);
    this.appliedStrategies = source.appliedStrategies && source.appliedStrategies.map(AppliedStrategy.fromObject) || [];
    this.pmfmStrategies = source.pmfmStrategies && source.pmfmStrategies.map(PmfmStrategy.fromObject) || [];
    this.strategyDepartments = source.strategyDepartments && source.strategyDepartments.map(StrategyDepartment.fromObject) || [];
    this.gears = source.gears && source.gears.map(ReferentialRef.fromObject) || [];
    // Taxon groups, sorted by priority level
    this.taxonGroups = source.taxonGroups && source.taxonGroups.map(TaxonGroupStrategy.fromObject) || [];
    this.taxonNames = source.taxonNames && source.taxonNames.map(TaxonNameStrategy.fromObject) || [];

  }

  equals(other: Strategy): boolean {
    return super.equals(other)
      // Or by functional attributes
      || (
        // Same label
        this.label === other.label
        // Same program
        && ((!this.programId && !other.programId) || this.programId === other.programId)
      );
  }
}

export class StrategyDepartment extends Entity<StrategyDepartment> {

  strategyId: number;
  location: ReferentialRef;
  privilege: ReferentialRef;
  department: ReferentialRef;

  static fromObject(source: any): StrategyDepartment {
    if (!source || source instanceof StrategyDepartment) return source;
    const res = new StrategyDepartment();
    res.fromObject(source);
    return res;
  }

  clone(): StrategyDepartment {
    const target = new StrategyDepartment();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.location = this.location && this.location.asObject(opts) || undefined;
    target.privilege = this.privilege && this.privilege.asObject(opts);
    target.department = this.department && this.department.asObject(opts);
    return target;
  }

  fromObject(source: any) {
    this.strategyId = source.strategyId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
    this.department = source.department && ReferentialRef.fromObject(source.department);
  }
}

export class AppliedStrategy extends Entity<AppliedStrategy> {

  strategyId: number;
  location: ReferentialRef;
  appliedPeriods: AppliedPeriod[];

  static fromObject(source: any): AppliedStrategy {
    if (!source || source instanceof AppliedStrategy) return source;
    const res = new AppliedStrategy();
    res.fromObject(source);
    return res;
  }

  clone(): AppliedStrategy {
    const target = new AppliedStrategy();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.location = this.location && this.location.asObject(opts);
    target.appliedPeriods = this.appliedPeriods && this.appliedPeriods.map(p => p.asObject(opts)) || undefined;
    return target;
  }

  fromObject(source: any) {
    this.strategyId = source.strategyId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.appliedPeriods = source.appliedPeriods && source.appliedPeriods.map(AppliedPeriod.fromObject) || [];
  }
}

export class AppliedPeriod {

  appliedStrategyId: number;
  startDate: Moment;
  endDate: Moment;
  acquisitionNumber: number;

  static fromObject(source: any): AppliedPeriod {
    if (!source || source instanceof AppliedPeriod) return source;
    const res = new AppliedPeriod();
    res.fromObject(source);
    return res;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    return target;
  }

  fromObject(source: any) {
    this.appliedStrategyId = source.appliedStrategyId;
    this.startDate = source.startDate;
    this.endDate = source.endDate;
    this.acquisitionNumber = source.acquisitionNumber;
  }
}

export class TaxonGroupStrategy {

  strategyId: number;
  priorityLevel: number;
  taxonGroup: TaxonGroupRef;

  static fromObject(source: any): TaxonGroupStrategy {
    if (!source || source instanceof TaxonGroupStrategy) return source;
    const res = new TaxonGroupStrategy();
    res.fromObject(source);
    return res;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject({ ...opts, ...MINIFY_OPTIONS });
    return target;
  }

  fromObject(source: any) {
    this.strategyId = source.strategyId;
    this.priorityLevel = source.priorityLevel;
    this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup);
  }
}

export class TaxonNameStrategy {

  strategyId: number;
  priorityLevel: number;
  taxonName: TaxonNameRef;

  static fromObject(source: any): TaxonNameStrategy {
    if (!source || source instanceof TaxonNameStrategy) return source;
    const res = new TaxonNameStrategy();
    res.fromObject(source);
    return res;
  }

  asObject(opts?: ReferentialAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.taxonGroup = this.taxonName && this.taxonName.asObject({ ...opts, ...MINIFY_OPTIONS });
    return target;
  }

  fromObject(source: any) {
    this.strategyId = source.strategyId;
    this.priorityLevel = source.priorityLevel;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName);
  }
}

