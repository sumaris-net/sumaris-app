import { __decorate, __metadata } from "tslib";
import { AccountService, BaseGraphqlService, GraphqlService, isNil, JobProgression, removeDuplicatesFromArray, SocialErrorCodes, toNumber } from '@sumaris-net/ngx-components';
import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map, mergeMap, takeUntil } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { JobService } from '@app/social/job/job.service';
export const JobProgressionFragments = {
    light: gql `fragment LightJobProgressionFragment on JobProgressionVO {
    id
    name
  }`,
    full: gql `fragment JobProgressionFragment on JobProgressionVO {
    id
    name
    message
    current
    total
  }`,
};
const JobProgressionQueries = {
    loadAll: gql `query LoadAllJobProgressions($filter: JobFilterVOInput!){
    data: jobs(filter: $filter) {
      ...LightJobProgressionFragment
    }
  }
  ${JobProgressionFragments.light}`
};
const JobProgressionSubscriptions = {
    listenChanges: gql `subscription UpdateJobProgression($id: Int!, $interval: Int){
    data: updateJobProgression(id: $id, interval: $interval) {
      ...JobProgressionFragment
    }
  }
  ${JobProgressionFragments.full}`
};
let JobProgressionService = class JobProgressionService extends BaseGraphqlService {
    constructor(graphql, jobService, accountService) {
        super(graphql, environment);
        this.graphql = graphql;
        this.jobService = jobService;
        this.accountService = accountService;
        this.dataSubject = new BehaviorSubject([]);
        this._logPrefix = '[job-progression-service]';
        // Clean data on logout
        this.accountService.onLogout.subscribe(() => this.dataSubject.next([]));
        this.jobService.onCancel.subscribe(job => this.removeJob(job === null || job === void 0 ? void 0 : job.id));
    }
    addJob(id, job) {
        const exists = this.dataSubject.value.some(j => j.id === id);
        if (!exists) {
            job = job || new JobProgression();
            job.id = id;
            this.dataSubject.next([...this.dataSubject.value, job]);
        }
    }
    removeJob(id) {
        const jobs = this.dataSubject.value;
        const index = jobs.findIndex(j => j.id === id);
        if (index !== -1) {
            jobs.splice(index, 1);
            this.dataSubject.next(jobs);
        }
    }
    watchAll() {
        return combineLatest(this.dataSubject.asObservable(), this.accountService.onLogin
            .pipe(mergeMap((account) => this.jobService.watchAll({
            issuer: account.pubkey,
            status: ['PENDING', 'RUNNING']
        }, null, { toEntity: false })), takeUntil(this.accountService.onLogout))).pipe(map(([d1, d2]) => removeDuplicatesFromArray([...d1, ...d2], 'id')), map(data => data.map(JobProgression.fromObject)));
    }
    listenChanges(id, options) {
        if (isNil(id))
            throw new Error(`${this._logPrefix}Missing argument 'id'`);
        if (this._debug)
            console.debug(`${this._logPrefix}[WS] Listening changes for job progression {${id}}...`);
        return this.graphql.subscribe({
            query: JobProgressionSubscriptions.listenChanges,
            fetchPolicy: options === null || options === void 0 ? void 0 : options.fetchPolicy,
            variables: { id, interval: toNumber(options === null || options === void 0 ? void 0 : options.interval, 10) },
            error: { code: SocialErrorCodes.SUBSCRIBE_JOB_PROGRESSION_ERROR, message: 'SOCIAL.ERROR.SUBSCRIBE_JOB_PROGRESSION_ERROR' }
        }).pipe(map(({ data }) => {
            const progression = data && JobProgression.fromObject(data);
            if (progression && this._debug)
                console.debug(`${this._logPrefix}Job progression ${id} updated on server`, progression);
            return progression;
        }));
    }
};
JobProgressionService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GraphqlService,
        JobService,
        AccountService])
], JobProgressionService);
export { JobProgressionService };
//# sourceMappingURL=job-progression.service.js.map