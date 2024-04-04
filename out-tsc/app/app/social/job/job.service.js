import { __awaiter, __decorate, __metadata } from "tslib";
import { AccountService, BaseGraphqlService, EntityUtils, GraphqlService, isNil, SocialErrorCodes, toNumber } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { ErrorCodes } from '@app/referential/services/errors';
import { Subject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { Job, JobFilter } from '@app/social/job/job.model';
import { ModalController } from '@ionic/angular';
import { JobReportModal } from '@app/social/job/report/job.report.modal';
import { AppJobErrorCodes } from '@app/social/job/job.errors';
export const JobFragments = {
    light: gql `fragment LightJobFragment on JobVO {
    id
    name
    startDate
    status
  }`,
    full: gql `
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
  `
};
const JobQueries = {
    loadAll: gql `
    query Jobs($filter: JobFilterVOInput, $page: PageInput) {
      data: jobs(filter: $filter, page: $page) {
        ...LightJobFragment
      }
    }
    ${JobFragments.light}`,
    load: gql `query Job($id: Int!) {
      data: job(id: $id) {
        ...JobFragment
      }
    }
    ${JobFragments.full}`,
    loadTypes: gql `
    query JobTypes {
      data: jobTypes
    }`,
};
const JobMutations = {
    cancel: gql `
    mutation CancelJob($id: Int!) {
      data: cancelJob(id: $id) {
        ...JobFragment
      }
    }
    ${JobFragments.full}`,
    run: gql `
    mutation RunJob($type: String!, $issuer: String, $params: Map_String_ObjectScalar) {
      data: runJob(type: $type, issuer: $issuer, params: $params) {
        ...JobFragment
      }
    }
    ${JobFragments.full}`,
};
const JobSubscriptions = {
    listenChanges: gql `subscription UpdateJobs($filter: JobFilterVOInput, $interval: Int) {
      data: updateJobs(filter: $filter, interval: $interval) {
        ...JobFragment
      }
    }
    ${JobFragments.full}`
};
let JobService = class JobService extends BaseGraphqlService {
    constructor(graphql, accountService, modalCtrl) {
        super(graphql);
        this.graphql = graphql;
        this.accountService = accountService;
        this.modalCtrl = modalCtrl;
        this.onCancel = new Subject();
        this._logPrefix = '[job-service]';
    }
    addJob(id, job) {
        var _a;
        job = Job.fromObject(job) || new Job();
        job.id = id;
        job.status = job.status || 'PENDING';
        job.issuer = job.issuer || ((_a = this.accountService.account) === null || _a === void 0 ? void 0 : _a.pubkey);
        const data = job.asObject();
        this.insertIntoMutableCachedQueries(this.graphql.cache, { queryName: 'loadAll', data });
    }
    load(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(id))
                return undefined;
            const now = Date.now();
            if (this._debug)
                console.debug(`${this._logPrefix} Loading job #${id} ...`);
            const { data } = yield this.graphql.query({
                query: JobQueries.load,
                variables: { id },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: 'no-cache',
            });
            if (this._debug)
                console.debug(`${this._logPrefix} job loaded in ${Date.now() - now}ms`, data);
            return Job.fromObject(data);
        });
    }
    loadAll(filter, page, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = JobFilter.fromObject(filter);
            const now = Date.now();
            if (this._debug)
                console.debug(`${this._logPrefix} Loading jobs ...`, filter);
            page = Object.assign({ offset: 0, size: 100, sortBy: 'id', sortDirection: 'ASC' }, page);
            const { data } = yield this.graphql.query({
                query: JobQueries.loadAll,
                variables: {
                    filter: filter && filter.asPodObject(),
                    page
                },
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: (opts === null || opts === void 0 ? void 0 : opts.fetchPolicy) || 'no-cache',
            });
            const entities = (opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false
                ? (data || []).map(Job.fromObject)
                : (data || []);
            if (this._debug)
                console.debug(`${this._logPrefix} jobs loaded in ${Date.now() - now}ms`, entities);
            return entities;
        });
    }
    watchAll(filter, page, opts) {
        filter = JobFilter.fromObject(filter);
        let now = Date.now();
        if (this._debug)
            console.debug(this._logPrefix + 'Watching jobs...', filter);
        page = Object.assign({ offset: 0, size: 100, sortBy: 'id', sortDirection: 'ASC' }, page);
        return this.mutableWatchQuery({
            queryName: 'loadAll',
            arrayFieldName: 'data',
            query: JobQueries.loadAll,
            variables: {
                filter: filter && filter.asPodObject(),
                page
            },
            insertFilterFn: filter && filter.asFilterFn(),
            error: { code: SocialErrorCodes.LOAD_JOB_PROGRESSIONS_ERROR, message: 'REFERENTIAL.ERROR.LOAD_JOB_PROGRESSIONS_ERROR' },
            fetchPolicy: (opts === null || opts === void 0 ? void 0 : opts.fetchPolicy) || 'cache-and-network'
        })
            .pipe(map(({ data }) => {
            const entities = (opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false
                ? (data || []).map(Job.fromObject)
                : (data || []);
            if (now && this._debug) {
                console.debug(`${this._logPrefix} ${entities.length} jobs loaded in ${Date.now() - now}ms`, entities);
                now = null;
            }
            return entities;
        }));
    }
    listenChanges(filter, options) {
        filter = JobFilter.fromObject(filter);
        if (this._debug)
            console.debug(`${this._logPrefix} [WS] Listening changes for user jobs with filter:`, filter);
        return this.graphql
            .subscribe({
            query: JobSubscriptions.listenChanges,
            fetchPolicy: (options === null || options === void 0 ? void 0 : options.fetchPolicy) || 'no-cache',
            variables: {
                filter: filter.asPodObject(),
                interval: toNumber(options === null || options === void 0 ? void 0 : options.interval, 10)
            },
            error: {
                code: SocialErrorCodes.SUBSCRIBE_USER_EVENTS_ERROR,
                message: 'SOCIAL.ERROR.SUBSCRIBE_USER_EVENTS_ERROR',
            },
        })
            .pipe(map(({ data }) => {
            if (data && this._debug)
                console.debug(`${this._logPrefix} Received new jobs:`, data);
            return data === null || data === void 0 ? void 0 : data.map(Job.fromObject);
        }));
    }
    openJobReport(job) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`${this._logPrefix} Open report modal for job:`, job);
            const modal = yield this.modalCtrl.create({
                component: JobReportModal,
                componentProps: {
                    job
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // On dismiss
            const res = yield modal.onDidDismiss();
        });
    }
    cancelJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.graphql.mutate({
                mutation: JobMutations.cancel,
                variables: {
                    id: job.id
                },
                update: (proxy, { data }) => {
                    const savedEntity = Job.fromObject(data.data);
                    EntityUtils.copyIdAndUpdateDate(savedEntity, job);
                }
            });
            this.onCancel.next(job);
            return job;
        });
    }
    loadTypes(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.graphql.query({
                query: JobQueries.loadTypes,
                error: { code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR' },
                fetchPolicy: (opts === null || opts === void 0 ? void 0 : opts.fetchPolicy) || 'cache-first'
            });
            return data;
        });
    }
    watchTypes(opts) {
        return this.graphql.watchQuery({
            query: JobQueries.loadTypes,
            error: { code: AppJobErrorCodes.LOAD_TYPES_ERROR, message: 'SOCIAL.JOB.ERROR.LOAD_TYPES_ERROR' },
            fetchPolicy: (opts === null || opts === void 0 ? void 0 : opts.fetchPolicy) || 'cache-and-network'
        }).pipe(map(({ data }) => data), distinctUntilChanged());
    }
    runJob(type, params, issuer) {
        return __awaiter(this, void 0, void 0, function* () {
            let job;
            yield this.graphql.mutate({
                mutation: JobMutations.run,
                error: { code: AppJobErrorCodes.RUN_JOB_ERROR, message: "SOCIAL.JOB.ERROR.RUN_JOB_ERROR" },
                variables: {
                    type,
                    params,
                    issuer
                },
                update: (proxy, { data }) => {
                    if (data.data) {
                        job = Job.fromObject(data.data);
                        this.addJob(job.id, job);
                    }
                }
            });
            return job;
        });
    }
};
JobService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        ModalController])
], JobService);
export { JobService };
//# sourceMappingURL=job.service.js.map