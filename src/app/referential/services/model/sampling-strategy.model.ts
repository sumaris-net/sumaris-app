import { Strategy } from './strategy.model';
import { Moment } from 'moment';
import { DateUtils, EntityAsObjectOptions, EntityClass, fromDateISOString, isNil, isNotEmptyArray, isNotNil, ReferentialAsObjectOptions, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export interface SamplingStrategyAsObjectOptions extends ReferentialAsObjectOptions {
  keepEffort: boolean; // false by default
}

@EntityClass({typename: 'SamplingStrategyVO'})
export class SamplingStrategy extends Strategy<SamplingStrategy, SamplingStrategyAsObjectOptions> {

  static fromObject: (source: any, opts?: any) => SamplingStrategy;

  static clone(source: any): SamplingStrategy {
    if (source instanceof SamplingStrategy) return source.clone();
    const res = new SamplingStrategy();
    res.fromObject(source);
    return res;
  }

  parameterGroups: string[];
  efforts: StrategyEffort[];
  effortByQuarter: {
    1?: StrategyEffort;
    2?: StrategyEffort;
    3?: StrategyEffort;
    4?: StrategyEffort;
  };
  year?: Moment;
  sex?: boolean;
  age?: boolean;
  lengthPmfms: PmfmStrategy[];
  weightPmfms: PmfmStrategy[];
  maturityPmfms: PmfmStrategy[];
  fractionPmfms: PmfmStrategy[];

  constructor() {
    super();
    this.efforts = [];
    this.effortByQuarter = {}; // Init, for easier use in UI
  }

  // TODO : Check if clone is needed
  clone(): SamplingStrategy {
    const target = new SamplingStrategy();
    target.fromObject(this);
    return target;
  }

  fromObject(source: any) {
    const target = super.fromObject(source);

    // Copy efforts. /!\ leave undefined is not set, to be able to detect if has been filled. See hasEffortFilled()
    this.efforts = source.efforts && source.efforts.map(StrategyEffort.fromObject) || undefined;

    if (!this.efforts && this.appliedStrategies) {
      this.efforts = this.appliedStrategies.reduce((res, as) => {
        return res.concat(
          (as.appliedPeriods || []).map(period => {
            const quarter = period.startDate?.quarter();
            if (isNil(quarter) || isNil(period.acquisitionNumber)) return null;
            return StrategyEffort.fromObject(<StrategyEffort>{
              quarter,
              startDate: period.startDate,
              endDate: period.endDate,
              expectedEffort: period.acquisitionNumber
            })
          }).filter(isNotNil)
        )
      }, []);
    }

    this.effortByQuarter = source.effortByQuarter && Object.assign({}, source.effortByQuarter) || undefined;
    if (!this.effortByQuarter && isNotEmptyArray(this.efforts)) {
      this.effortByQuarter = {};
      this.efforts.forEach(effort => {
        this.effortByQuarter[effort.quarter] = this.effortByQuarter[effort.quarter] || StrategyEffort.fromObject({
          quarter: effort.quarter,
          startDate: effort.startDate,
          endDate: effort.endDate,
          expectedEffort: 0
        });
        this.effortByQuarter[effort.quarter].expectedEffort += effort.expectedEffort;
        this.effortByQuarter[effort.quarter].startDate = DateUtils.min(this.effortByQuarter[effort.quarter].startDate, effort.startDate);
        this.effortByQuarter[effort.quarter].endDate = DateUtils.max(this.effortByQuarter[effort.quarter].endDate, effort.endDate);
      });
    }
    this.parameterGroups = source.parameterGroups || undefined;

    this.year = fromDateISOString(source.year);
    this.age = source.age;
    this.sex = source.sex;
    this.lengthPmfms = source.lengthPmfms && source.lengthPmfms.map(PmfmStrategy.fromObject);
    this.weightPmfms = source.weightPmfms && source.weightPmfms.map(PmfmStrategy.fromObject);
    this.maturityPmfms = source.maturityPmfms && source.maturityPmfms.map(PmfmStrategy.fromObject);
    this.fractionPmfms = source.fractionPmfms && source.fractionPmfms.map(PmfmStrategy.fromObject);
    return target;
  }

  asObject(opts?: SamplingStrategyAsObjectOptions): any {
    const target = super.asObject(opts);

    // Remove effort
    if (!opts || opts.keepEffort !== true) {
      delete target.efforts;
      delete target.effortByQuarter;
      delete target.parameterGroups;
      delete target.year;
      delete target.age;
      delete target.sex;
      delete target.lengthPmfms;
      delete target.weightPmfms;
      delete target.maturityPmfms;
      delete target.fractionPmfms;
    }
    else {
      target.year = toDateISOString(this.year);

      target.efforts = this.efforts && this.efforts.map(e => e.asObject()) || undefined;



      target.effortByQuarter = {};
      target.efforts.filter(e => e.quarter).forEach(e => target.effortByQuarter[e.quarter] = e);

      target.parameterGroups = this.parameterGroups && this.parameterGroups.slice() || undefined;

      target.lengthPmfms = this.lengthPmfms && this.lengthPmfms.map(ps => ps.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
      target.weightPmfms = this.weightPmfms && this.weightPmfms.map(ps => ps.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
      target.maturityPmfms = this.maturityPmfms && this.maturityPmfms.map(ps => ps.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
      target.fractionPmfms = this.fractionPmfms && this.fractionPmfms.map(ps => ps.asObject({ ...opts, ...NOT_MINIFY_OPTIONS }));
    }
    return target;
  }

  get hasRealizedEffort(): boolean {
    return (this.efforts || []).findIndex(e => e.hasRealizedEffort) !== -1;
  }

  get hasExpectedEffort(): boolean {
    return (this.efforts || []).findIndex(e => e.hasExpectedEffort) !== -1;
  }

  get hasLanding(): boolean {
    return (this.efforts || []).findIndex(e => e.hasLanding) !== -1;
  }
}


export class StrategyEffort {

  static fromObject(value: any): StrategyEffort {
    if (!value || value instanceof StrategyEffort) return value;
    const target = new StrategyEffort();
    target.fromObject(value);
    return target;
  }

  static clone(value: any): StrategyEffort {
    if (!value) return value;
    const target = new StrategyEffort();
    target.fromObject(value);
    return target;
  }

  strategyLabel: string;
  startDate: Moment;
  endDate: Moment;
  quarter: number;
  expectedEffort: number;
  realizedEffort: number;
  landingCount: number;

  constructor() {
  }

// TODO : Check if clone is needed
  clone(): StrategyEffort {
    const target = new StrategyEffort();
    target.fromObject(this);
    return target;
  }

  fromObject(source: any) {
    if (!source) return;
    this.strategyLabel = source.strategy || source.strategyLabel;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
    this.expectedEffort = toNumber(source.expectedEffort);
    this.realizedEffort = toNumber(source.realizedEffort);
    this.landingCount = toNumber(source.landingCount);

    // Compute quarter (if possible = is same between start/end date)
    const startQuarter = this.startDate && this.startDate.quarter();
    const endQuarter = this.endDate && this.endDate.quarter();
    this.quarter = startQuarter === endQuarter ? startQuarter : undefined;
  }

  asObject(opts?: EntityAsObjectOptions) {
    const target: any = Object.assign({}, this);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    return target;
  }

  get realized(): boolean {
    return (!this.expectedEffort || (this.realizedEffort && this.realizedEffort >= this.expectedEffort));
  }

  get missingEffort(): number {
    return isNil(this.expectedEffort) ? undefined :
      // Avoid negative missing effort (when realized > expected)
      Math.max(0, this.expectedEffort - (this.realizedEffort || 0));
  }

  get hasRealizedEffort(): boolean {
    return (this.realizedEffort && this.realizedEffort > 0);
  }

  get hasExpectedEffort(): boolean {
    return (this.expectedEffort && this.expectedEffort > 0);
  }

  get hasLanding(): boolean {
    return (this.landingCount && this.landingCount > 0);
  }
}
