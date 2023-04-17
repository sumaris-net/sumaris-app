import { Entity, EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, fromDateISOString, IconRef, isNotEmptyArray, toDateISOString } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { ProgressionModel } from '@app/shared/progression/progression.model';

export type JobTypeEnum = 'IMPORT_ORDER_ITEM_SHAPE' | 'IMPORT_MONITORING_LOCATION_SHAPE';
export type JobStatusEnum = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'FATAL' | 'CANCELLED';


@EntityClass({ typename: 'JobVO' })
export class Job extends Entity<Job> {
  static fromObject: (source: any, opts?: any) => Job;

  name: string;
  type: JobTypeEnum;
  status: JobStatusEnum;
  issuer: string;
  startDate: Moment;
  endDate: Moment;

  log: string;
  configuration: any;
  report: any;

  progression?: ProgressionModel;
  icon?: IconRef;

  constructor() {
    super(Job.TYPENAME);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    // Serialize configuration and report
    if (typeof this.configuration === 'object') {
      target.configuration = JSON.stringify(this.configuration);
    }
    if (typeof this.report === 'object') {
      target.report = JSON.stringify(this.report);
    }
    return target;
  }

  fromObject(source: any) {
    Object.assign(this, source); // Copy all properties
    super.fromObject(source);
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);

    try {
      // Deserialize configuration and report
      if (typeof source.configuration === 'string' && source.configuration.startsWith('{')) {
        this.configuration = JSON.parse(source.configuration);
      }
      if (typeof source.report === 'string' && source.report.startsWith('{')) {
        this.report = JSON.parse(source.report);
      }
    } catch (err) {
      console.error('Error during UserEvent deserialization', err);
    }
  }

  isActive(): boolean {
    return ['PENDING', 'RUNNING'].includes(this.status);
  }
}

@EntityClass({ typename: 'JobFilterVO' })
export class JobFilter extends EntityFilter<JobFilter, Job> {
  static fromObject: (source: any, opts?: any) => JobFilter;

  issuer: string;
  types: JobTypeEnum[];
  status: JobStatusEnum[];
  lastUpdateDate: Moment;
  includedIds: number[];
  excludedIds: number[];

  fromObject(source: any) {
    super.fromObject(source);
    this.issuer = source.issuer;
    this.types = source.types || [];
    this.status = source.status || [];
    this.lastUpdateDate = source.lastUpdateDate;
    this.excludedIds = source.excludedIds;
    this.includedIds = source.includedIds;
  }

  protected buildFilter(): FilterFn<Job>[] {
    const filterFns = super.buildFilter();

    if (this.issuer) {
      filterFns.push((data) => data.issuer === this.issuer);
    }
    if (isNotEmptyArray(this.types)) {
      filterFns.push((data) => this.types.includes(data.type));
    }
    if (isNotEmptyArray(this.status)) {
      filterFns.push((data) => this.status.includes(data.status));
    }
    if (isNotEmptyArray(this.includedIds)) {
      filterFns.push((data) => this.includedIds.includes(+data.id));
    }
    if (isNotEmptyArray(this.excludedIds)) {
      filterFns.push((data) => !this.excludedIds.includes(+data.id));
    }
    if (this.lastUpdateDate) {
      filterFns.push((data) => data.updateDate >= this.lastUpdateDate);
    }

    return filterFns;
  }
}

export class JobStatusUtils {
  static isFinished(status: JobStatusEnum) {
    switch (status) {
      case 'PENDING':
      case 'RUNNING':
        return false;
      default:
        return true;
    }
  }
}
