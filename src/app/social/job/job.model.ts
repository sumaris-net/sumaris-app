import {
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  FilterFn,
  fromDateISOString,
  IJob,
  isNotEmptyArray,
  JobStatus,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';

export type JobTypeEnum = 'IMPORT_ORDER_ITEM_SHAPE' | 'IMPORT_MONITORING_LOCATION_SHAPE';

@EntityClass({ typename: 'JobVO' })
export class Job extends Entity<Job> implements IJob {
  static fromObject: (source: any, opts?: any) => Job;

  name: string;
  type: JobTypeEnum;
  status: JobStatus;
  userId: number;
  startDate: Moment;
  endDate: Moment;

  log: string;
  configuration: any;
  report: any;

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

  userId: number;
  types: JobTypeEnum[];
  status: JobStatus[];
  lastUpdateDate: Moment;

  fromObject(source: any) {
    super.fromObject(source);
    this.userId = source.userId;
    this.types = source.types || [];
    this.status = source.status || [];
    this.lastUpdateDate = source.lastUpdateDate;
  }

  protected buildFilter(): FilterFn<Job>[] {
    const filterFns = super.buildFilter();

    if (this.userId) {
      filterFns.push((data) => data.userId === this.userId);
    }
    if (isNotEmptyArray(this.types)) {
      filterFns.push((data) => this.types.includes(data.type));
    }
    if (isNotEmptyArray(this.status)) {
      filterFns.push((data) => this.status.includes(data.status));
    }
    if (this.lastUpdateDate) {
      filterFns.push((data) => data.updateDate >= this.lastUpdateDate);
    }

    return filterFns;
  }
}
