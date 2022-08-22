import { BaseGraphqlService, ENVIRONMENT, Environment, GraphqlService, isNil, SocialErrorCodes, toNumber } from '@sumaris-net/ngx-components';
import { Inject, Injectable, Optional } from '@angular/core';
import gql from 'graphql-tag';
import { ErrorCodes } from '@app/referential/services/errors';
import { Observable } from 'rxjs';
import { FetchPolicy } from '@apollo/client/core';
import { map } from 'rxjs/operators';
import { Job, JobFilter } from '@app/social/job/job.model';

export const jobFragment = gql`
  fragment JobFragment on JobVO {
    id
    name
    type
    status
    userId
    startDate
    endDate
    updateDate
    configuration
    report
    log
  }
`;

const loadQuery = gql`
  query Job($id: Int!) {
    data: job(id: $id) {
      ...JobFragment
    }
  }
  ${jobFragment}
`;

const loadAllQuery = gql`
  query Jobs($filter: JobFilterVOInput) {
    data: jobs(filter: $filter) {
      ...JobFragment
    }
  }
  ${jobFragment}
`;

const updateJobsQuery = gql`
  subscription UpdateJobs($filter: JobFilterVOInput, $interval: Int) {
    data: updateJobs(filter: $filter, interval: $interval) {
      ...JobFragment
    }
  }
  ${jobFragment}
`;

@Injectable()
export class JobService extends BaseGraphqlService<Job, JobFilter> {
  constructor(protected graphql: GraphqlService, @Optional() @Inject(ENVIRONMENT) protected environment: Environment) {
    super(graphql, environment);
    this._logPrefix = '[job-service]';
  }

  async load(id: number): Promise<Job> {
    if (isNil(id)) return undefined;

    const variables: any = { id };
    if (this._debug) console.debug(`${this._logPrefix} Loading job ...`, variables);
    const now = Date.now();
    const res = await this.graphql.query<{ data: any }>({
      query: loadQuery,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: 'no-cache',
    });
    const data = Job.fromObject(res?.data);
    if (this._debug) console.debug(`${this._logPrefix} job loaded in ${Date.now() - now}ms`, data);
    return data;
  }

  async loadAll(filter: Partial<JobFilter>): Promise<Job[]> {
    filter = JobFilter.fromObject(filter);
    const variables: any = { filter: filter.asPodObject() };
    if (this._debug) console.debug(`${this._logPrefix} Loading jobs ...`, variables);
    const now = Date.now();
    const res = await this.graphql.query<{ data: any[] }>({
      query: loadAllQuery,
      variables,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: 'no-cache',
    });
    const data = (res?.data || []).map(Job.fromObject);
    if (this._debug) console.debug(`${this._logPrefix} jobs loaded in ${Date.now() - now}ms`, data);
    return data;
  }

  listenChanges(filter: Partial<JobFilter>, options?: { interval?: number; fetchPolicy?: FetchPolicy }): Observable<Job[]> {
    filter = JobFilter.fromObject(filter);

    if (this._debug) console.debug(`${this._logPrefix} [WS] Listening changes for user jobs with filter:`, filter);

    return this.graphql
      .subscribe<{ data: any[] }, { filter: any; interval: number }>({
        query: updateJobsQuery,
        fetchPolicy: options?.fetchPolicy || 'no-cache',
        variables: { filter: filter.asPodObject(), interval: toNumber(options?.interval, 10) },
        error: {
          code: SocialErrorCodes.SUBSCRIBE_USER_EVENTS_ERROR,
          message: 'SOCIAL.ERROR.SUBSCRIBE_USER_EVENTS_ERROR',
        },
      })
      .pipe(
        map(({ data }) => {
          if (data && this._debug) console.debug(`${this._logPrefix} Received new jobs:`, data);
          return data?.map(Job.fromObject);
        })
      );
  }
}
