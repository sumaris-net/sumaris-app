import {
  BaseReferential,
  Entity,
  EntityClass,
  EntityUtils,
  FormFieldDefinition,
  fromDateISOString,
  isNotNil,
  ObjectMap,
  ReferentialAsObjectOptions,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { TaxonGroupRef } from './taxon-group.model';
import { DenormalizedPmfmStrategy, PmfmStrategy } from './pmfm-strategy.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { AppReferentialUtils, MINIFY_OPTIONS, NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { StrategyTaxonPriorityLevels } from '@app/referential/services/model/model.enum';

export interface StrategyAsObjectOptions extends ReferentialAsObjectOptions {
  keepRemoteId?: boolean;
}

@EntityClass({ typename: 'StrategyVO' })
export class Strategy<T extends Strategy<any> = Strategy<any>, O extends StrategyAsObjectOptions = StrategyAsObjectOptions> extends BaseReferential<
  Strategy,
  number,
  O
> {
  static ENTITY_NAME = 'Strategy';
  static fromObject: (source: any, opts?: any) => Strategy;

  properties: ObjectMap = {};
  analyticReference: string | ReferentialRef = null;
  appliedStrategies: AppliedStrategy[] = null;
  pmfms: PmfmStrategy[] = null;
  denormalizedPmfms: DenormalizedPmfmStrategy[] = null;
  departments: StrategyDepartment[] = null;

  gears: any[] = null;
  taxonGroups: TaxonGroupStrategy[] = null;
  taxonNames: TaxonNameStrategy[] = null;
  programId: number = null;

  constructor() {
    super();
    this.__typename = Strategy.TYPENAME;
  }

  clone(): T {
    const target = new Strategy();
    target.fromObject(this);
    return target as T;
  }

  fromObject(source: any) {
    super.fromObject(source);
    if (source.properties && source.properties instanceof Array) {
      this.properties = EntityUtils.getPropertyArrayAsObject(source.properties);
    } else {
      this.properties = { ...source.properties };
    }
    this.analyticReference = source.analyticReference;
    this.programId = source.programId;
    this.appliedStrategies = (source.appliedStrategies && source.appliedStrategies.map(AppliedStrategy.fromObject)) || [];
    this.pmfms = (source.pmfms && source.pmfms.map(PmfmStrategy.fromObject)) || [];
    this.denormalizedPmfms = (source.denormalizedPmfms && source.denormalizedPmfms.map(DenormalizedPmfmStrategy.fromObject)) || [];
    this.departments = (source.departments && source.departments.map(StrategyDepartment.fromObject)) || [];
    this.gears = (source.gears && source.gears.map(ReferentialRef.fromObject)) || [];
    // Taxon groups, sorted by priority level
    this.taxonGroups = (source.taxonGroups && source.taxonGroups.map(TaxonGroupStrategy.fromObject)) || [];
    this.taxonNames = (source.taxonNames && source.taxonNames.map(TaxonNameStrategy.fromObject)) || [];
  }

  asObject(opts?: O): any {
    const target: any = super.asObject({ ...opts, ...NOT_MINIFY_OPTIONS });
    target.properties = { ...this.properties };
    target.programId = this.programId;
    target.appliedStrategies = this.appliedStrategies && this.appliedStrategies.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.pmfms = this.pmfms && this.pmfms.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.denormalizedPmfms = this.denormalizedPmfms && this.denormalizedPmfms.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.departments = this.departments && this.departments.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.gears = this.gears && this.gears.map((s) => s.asObject(opts));
    target.taxonGroups = this.taxonGroups && this.taxonGroups.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    target.taxonNames = this.taxonNames && this.taxonNames.map((s) => s.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));

    if (opts?.keepRemoteId === false && (EntityUtils.isRemoteId(target.id) || EntityUtils.isRemoteId(target.programId))) {
      AppReferentialUtils.cleanIdAndDates(target, true, ['appliedStrategies', 'pmfms', 'departments', 'gears', 'taxonGroups', 'taxonNames']);
      delete target.programId;
    }

    return target;
  }

  equals(other: T): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Or by functional attributes
      // Same label
      (this.label === other.label &&
        // Same program
        ((!this.programId && !other.programId) || this.programId === other.programId))
    );
  }

  duplicate(): Strategy {
    const target = this.clone();
    AppReferentialUtils.cleanIdAndDates(target, true, ['gears', 'taxonGroups', 'taxonNames']);

    return target;
  }

  getPropertyAsBoolean(definition: FormFieldDefinition): boolean {
    const value = this.getProperty(definition);
    return isNotNil(value) ? value && value !== 'false' : undefined;
  }

  getPropertyAsInt(definition: FormFieldDefinition): number {
    const value = this.getProperty(definition);
    return isNotNil(value) ? parseInt(value) : undefined;
  }

  getPropertyAsNumbers(definition: FormFieldDefinition): number[] {
    const value = this.getProperty(definition);
    if (typeof value === 'string') return value.split(',').map(parseFloat) || undefined;
    return isNotNil(value) ? [parseFloat(value)] : undefined;
  }

  getPropertyAsStrings(definition: FormFieldDefinition): string[] {
    const value = this.getProperty(definition);
    return (value && value.split(',')) || undefined;
  }

  getProperty<T = string>(definition: FormFieldDefinition): T {
    if (!definition) throw new Error("Missing 'definition' argument");
    return isNotNil(this.properties[definition.key]) ? this.properties[definition.key] : definition.defaultValue;
  }
}

@EntityClass({ typename: 'StrategyDepartmentVO' })
export class StrategyDepartment extends Entity<StrategyDepartment> {
  static fromObject: (source: any, opts?: any) => StrategyDepartment;

  strategyId: number;
  location: ReferentialRef;
  privilege: ReferentialRef;
  department: ReferentialRef;

  constructor() {
    super(StrategyDepartment.TYPENAME);
  }

  clone(): StrategyDepartment {
    const target = new StrategyDepartment();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: StrategyAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.location = (this.location && this.location.asObject(opts)) || undefined;
    target.privilege = this.privilege && this.privilege.asObject(opts);
    target.department = this.department && this.department.asObject(opts);
    if (opts?.keepRemoteId === false && EntityUtils.isRemoteId(target.strategyId)) {
      delete target.strategyId;
    }
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.strategyId = source.strategyId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.privilege = source.privilege && ReferentialRef.fromObject(source.privilege);
    this.department = source.department && ReferentialRef.fromObject(source.department);
  }
}

export class AppliedStrategy extends Entity<AppliedStrategy, number, StrategyAsObjectOptions> {
  static TYPENAME = 'AppliedStrategyVO';

  strategyId: number;
  location: ReferentialRef;
  appliedPeriods: AppliedPeriod[];

  static fromObject(source: any): AppliedStrategy {
    if (!source || source instanceof AppliedStrategy) return source;
    const res = new AppliedStrategy();
    res.fromObject(source);
    return res;
  }

  constructor() {
    super();
    this.__typename = AppliedStrategy.TYPENAME;
  }

  clone(): AppliedStrategy {
    const target = new AppliedStrategy();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: StrategyAsObjectOptions): any {
    const target: any = super.asObject(opts);
    target.location = this.location && this.location.asObject({ ...opts, ...NOT_MINIFY_OPTIONS });
    target.appliedPeriods = (this.appliedPeriods && this.appliedPeriods.map((p) => p.asObject(opts))) || undefined;

    // Clean remote id
    if (opts && opts.keepRemoteId === false && (EntityUtils.isRemoteId(target.id) || EntityUtils.isRemoteId(target.strategyId))) {
      AppReferentialUtils.cleanIdAndDates(target, false);
      delete target.strategyId;
    }
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.strategyId = source.strategyId;
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.appliedPeriods = (source.appliedPeriods && source.appliedPeriods.map(AppliedPeriod.fromObject)) || [];
  }

  equals(other: AppliedStrategy) {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same strategyId and location
      (this.strategyId === other.strategyId &&
        ((!this.location && !other.location) || (this.location && other.location && this.location.id === other.location.id)))
    );
  }
}

export class AppliedPeriod {
  static TYPENAME = 'AppliedPeriodVO';

  __typename: string;
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

  constructor() {
    this.__typename = AppliedPeriod.TYPENAME;
  }

  asObject(opts?: StrategyAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    // Clean remote id
    if (opts?.keepRemoteId === false && EntityUtils.isRemoteId(target.appliedStrategyId)) {
      delete target.appliedStrategyId;
    }
    return target;
  }

  fromObject(source: any) {
    this.appliedStrategyId = source.appliedStrategyId;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.acquisitionNumber = source.acquisitionNumber;
  }

  // TODO : Check if clone is needed
  clone(): AppliedPeriod {
    const target = new AppliedPeriod();
    target.fromObject(this.asObject());
    return target;
  }
}

export class TaxonGroupStrategy {
  static TYPENAME = 'TaxonGroupStrategyVO';

  strategyId: number;
  priorityLevel: number;
  taxonGroup: TaxonGroupRef;

  static fromObject(source: any): TaxonGroupStrategy {
    if (!source || source instanceof TaxonGroupStrategy) return source;
    const res = new TaxonGroupStrategy();
    res.fromObject(source);
    return res;
  }

  asObject(opts?: StrategyAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.__typename;
    target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject({ ...MINIFY_OPTIONS, ...opts });
    if (opts?.keepRemoteId === false && EntityUtils.isRemoteId(target.strategyId)) {
      delete target.strategyId;
    }
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

  // TODO : Check if clone is needed
  clone(): TaxonNameStrategy {
    const target = new TaxonNameStrategy();
    target.fromObject(this);
    return target;
  }

  asObject(opts?: StrategyAsObjectOptions): any {
    const target: any = Object.assign({}, this); //= {...this};
    if (!opts || opts.keepTypename !== true) delete target.taxonName.__typename;
    if (opts?.keepRemoteId === false && EntityUtils.isRemoteId(target.strategyId)) {
      delete target.strategyId;
    }
    return target;
  }

  fromObject(source: any) {
    this.strategyId = source.strategyId;
    this.priorityLevel = source.priorityLevel;
    this.taxonName = source.taxonName && TaxonNameRef.fromObject(source.taxonName);
  }
}

export abstract class StrategyUtils {
  /**
   * In SIH-OBSVENTE, absolute priority species are called 'PETS'. They have priorityLevel === 0
   * @param taxonNameOrGroup
   */
  static isAbsolutePriorityTaxon(taxonNameOrGroup: TaxonGroupRef | TaxonNameRef) {
    return taxonNameOrGroup?.priority === StrategyTaxonPriorityLevels.ABSOLUTE;
  }

  static isNotAbsolutePriorityTaxon(taxonNameOrGroup: TaxonGroupRef | TaxonNameRef) {
    return taxonNameOrGroup?.priority !== StrategyTaxonPriorityLevels.ABSOLUTE;
  }

  /**
   * In SIH-OBSVENTE, random selected species used a priorityLevel > 0
   * @param taxonNameOrGroup
   */
  static isRandomSelectedTaxon(taxonNameOrGroup: TaxonGroupRef | TaxonNameRef) {
    return taxonNameOrGroup?.priority > StrategyTaxonPriorityLevels.ABSOLUTE;
  }
}
