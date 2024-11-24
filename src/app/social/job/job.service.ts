import {
  AccountService,
  BaseGraphqlService,
  EntityUtils,
  GraphqlService,
  isNil,
  LoadResult,
  SocialErrorCodes,
  toNumber,
} from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { ErrorCodes } from '@app/referential/services/errors';
import { Observable, Subject, switchMap } from 'rxjs';
import { FetchPolicy, WatchQueryFetchPolicy } from '@apollo/client/core';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Job, JobFilter } from '@app/social/job/job.model';
import { ModalController } from '@ionic/angular';
import { JobReportModal, JobReportModalOptions } from '@app/social/job/report/job.report.modal';
import { Page } from '@app/shared/service/page.model';
import { AppJobErrorCodes } from '@app/social/job/job.errors';

export const JobFragments = {
  light: gql`
    fragment LightJobFragment on JobVO {
      id
      name
      startDate
      status
    }
  `,
  full: gql`
    fragment JobFragment on JobVO {
      id
      name
      type
      status
      startDate
      endDate
      updateDate
      configuration
      report
      log
    }
  `,
};

const JobQueries = {
  loadAll: gql`
    query Jobs($filter: JobFilterVOInput, $page: PageInput) {
      data: jobs(filter: $filter, page: $page) {
        ...LightJobFragment
      }
    }
    ${JobFragments.light}
  `,

  load: gql`
    query Job($id: Int!) {
      data: job(id: $id) {
        ...JobFragment
      }
    }
    ${JobFragments.full}
  `,

  loadTypes: gql`
    query JobTypes {
      data: jobTypes
    }
  `,
};

const JobMutations = {
  cancel: gql`
    mutation CancelJob($id: Int!) {
      data: cancelJob(id: $id) {
        ...JobFragment
      }
    }
    ${JobFragments.full}
  `,

  run: gql`
    mutation RunJob($type: String!, $issuer: String, $params: Map_String_ObjectScalar) {
      data: runJob(type: $type, issuer: $issuer, params: $params) {
        ...JobFragment
      }
    }
    ${JobFragments.full}
  `,
};
const JobSubscriptions = {
  listenChanges: gql`
    subscription UpdateJobs($filter: JobFilterVOInput, $interval: Int) {
      data: updateJobs(filter: $filter, interval: $interval) {
        ...JobFragment
      }
    }
    ${JobFragments.full}
  `,
};

@Injectable({ providedIn: 'root' })
export class JobService extends BaseGraphqlService<Job, JobFilter> {
  onCancel = new Subject<Job>();

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected modalCtrl: ModalController
  ) {
    super(graphql);
    this._logPrefix = '[job-service]';
    this._debug = true;
  }

  addJob(id: number, job?: Job) {
    job = Job.fromObject(job) || new Job();
    job.id = id;
    job.status = job.status || 'PENDING';
    job.issuer = job.issuer || this.accountService.account?.pubkey;

    const data: Job = job.asObject();
    this.insertIntoMutableCachedQueries(this.graphql.cache, { queryName: 'loadAll', data });
  }

  async load(id: number): Promise<Job> {
    if (isNil(id)) return undefined;

    const now = Date.now();
    if (this._debug) console.debug(`${this._logPrefix} Loading job #${id} ...`);

    const { data } = await this.graphql.query<{ data: any }>({
      query: JobQueries.load,
      variables: { id },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: 'no-cache',
    });
    if (this._debug) console.debug(`${this._logPrefix} job loaded in ${Date.now() - now}ms`, data);
    return Job.fromObject(data);
  }

  async loadAll(filter: Partial<JobFilter>, page?: Page, opts?: { fetchPolicy?: FetchPolicy; toEntity?: boolean }): Promise<Job[]> {
    filter = JobFilter.fromObject(filter);

    const now = Date.now();
    if (this._debug) console.debug(`${this._logPrefix} Loading jobs ...`, filter);

    page = {
      offset: 0,
      size: 100,
      sortBy: 'id',
      sortDirection: 'ASC',
      ...page,
    };

    const { data } = await this.graphql.query<{ data: any[] }>({
      query: JobQueries.loadAll,
      variables: {
        filter: filter && filter.asPodObject(),
        page,
      },
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: opts?.fetchPolicy || 'no-cache',
    });

    const entities = opts?.toEntity !== false ? (data || []).map(Job.fromObject) : ((data || []) as Job[]);

    if (this._debug) console.debug(`${this._logPrefix} jobs loaded in ${Date.now() - now}ms`, entities);

    return entities;
  }

  watchAll(filter: Partial<JobFilter>, page?: Page, opts?: { fetchPolicy?: WatchQueryFetchPolicy; toEntity?: boolean }): Observable<Job[]> {
    // Make sure to get the min profile (USER) - required by the pod
    if (!this.accountService.isUser()) {
      return this.accountService.onLogin.pipe(switchMap((_) => this.watchAll(filter, page, opts)));
    }

    filter = JobFilter.fromObject(filter);

    let now = Date.now();
    if (this._debug) console.debug(this._logPrefix + 'Watching jobs...', filter);
    page = {
      offset: 0,
      size: 100,
      sortBy: 'id',
      sortDirection: 'ASC',
      ...page,
    };

    return this.mutableWatchQuery<LoadResult<any>>({
      queryName: 'loadAll',
      arrayFieldName: 'data',
      query: JobQueries.loadAll,
      variables: {
        filter: filter && filter.asPodObject(),
        page,
      },
      insertFilterFn: filter && filter.asFilterFn(),
      error: { code: SocialErrorCodes.LOAD_JOB_PROGRESSIONS_ERROR, message: 'REFERENTIAL.ERROR.LOAD_JOB_PROGRESSIONS_ERROR' },
      fetchPolicy: opts?.fetchPolicy || 'cache-and-network',
    }).pipe(
      map(({ data }) => {
        const entities = opts?.toEntity !== false ? (data || []).map(Job.fromObject) : ((data || []) as Job[]);
        if (now && this._debug) {
          console.debug(`${this._logPrefix} ${entities.length} jobs loaded in ${Date.now() - now}ms`, entities);
          now = null;
        }
        return entities;
      })
    );
  }

  listenChanges(filter: Partial<JobFilter>, options?: { interval?: number; fetchPolicy?: FetchPolicy }): Observable<Job[]> {
    filter = JobFilter.fromObject(filter);

    if (this._debug) console.debug(`${this._logPrefix} [WS] Listening changes for user jobs with filter:`, filter);

    return this.graphql
      .subscribe<{ data: any[] }, { filter: any; interval: number }>({
        query: JobSubscriptions.listenChanges,
        fetchPolicy: options?.fetchPolicy || 'no-cache',
        variables: {
          filter: filter.asPodObject(),
          interval: toNumber(options?.interval, 10),
        },
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

  async openJobReport(job: Job) {
    console.debug(`${this._logPrefix} Open report modal for job:`, job);

    const modal = await this.modalCtrl.create({
      component: JobReportModal,
      componentProps: <Partial<JobReportModalOptions>>{
        job,
      },
      keyboardClose: true,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // On dismiss
    const res = await modal.onDidDismiss();
  }

  async cancelJob(job: Job): Promise<Job> {
    await this.graphql.mutate<{ data: Job }>({
      mutation: JobMutations.cancel,
      variables: {
        id: job.id,
      },
      update: (proxy, { data }) => {
        const savedEntity = Job.fromObject(data.data);
        EntityUtils.copyIdAndUpdateDate(savedEntity, job);
      },
    });

    this.onCancel.next(job);

    return job;
  }

  async loadTypes(opts?: { fetchPolicy?: FetchPolicy }): Promise<string[]> {
    const { data } = await this.graphql.query<{ data: string[] }>({
      query: JobQueries.loadTypes,
      error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
      fetchPolicy: opts?.fetchPolicy || 'cache-first',
    });

    return data;
  }

  watchTypes(opts?: { fetchPolicy?: FetchPolicy }): Observable<string[]> {
    return this.graphql
      .watchQuery<{ data: string[] }>({
        query: JobQueries.loadTypes,
        error: { code: AppJobErrorCodes.LOAD_TYPES_ERROR, message: 'SOCIAL.JOB.ERROR.LOAD_TYPES_ERROR' },
        fetchPolicy: opts?.fetchPolicy || 'cache-and-network',
      })
      .pipe(
        map(({ data }) => data),
        distinctUntilChanged()
      );
  }

  async runJob(type: string, params?: any, issuer?: string): Promise<Job> {
    let job: Job;
    await this.graphql.mutate<{ data: Job }>({
      mutation: JobMutations.run,
      error: { code: AppJobErrorCodes.RUN_JOB_ERROR, message: 'SOCIAL.JOB.ERROR.RUN_JOB_ERROR' },
      variables: {
        type,
        params,
        issuer,
      },
      update: (proxy, { data }) => {
        if (data.data) {
          job = Job.fromObject(data.data);
          this.addJob(job.id, job);
        }
      },
    });

    return job;
  }
}
