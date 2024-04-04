var Job_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass, EntityFilter, fromDateISOString, isNotEmptyArray, toDateISOString } from '@sumaris-net/ngx-components';
export const JobStatusLabels = {
    PENDING: 'PENDING',
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    FATAL: 'FATAL',
    CANCELLED: 'CANCELLED'
};
export const JobStatusList = Object.freeze([
    {
        label: JobStatusLabels.PENDING,
        matIcon: 'schedule',
        name: 'SOCIAL.JOB.STATUS_ENUM.PENDING'
    },
    {
        label: JobStatusLabels.RUNNING,
        matIcon: 'pending',
        name: 'SOCIAL.JOB.STATUS_ENUM.RUNNING'
    },
    {
        label: JobStatusLabels.SUCCESS,
        matIcon: 'check_circle',
        name: 'SOCIAL.JOB.STATUS_ENUM.SUCCESS'
    },
    {
        label: JobStatusLabels.WARNING,
        icon: 'warning',
        name: 'SOCIAL.JOB.STATUS_ENUM.WARNING'
    },
    {
        label: JobStatusLabels.CANCELLED,
        icon: 'cancel',
        name: 'SOCIAL.JOB.STATUS_ENUM.CANCELLED'
    },
    {
        label: JobStatusLabels.ERROR,
        icon: 'error',
        name: 'SOCIAL.JOB.STATUS_ENUM.ERROR'
    },
    {
        label: JobStatusLabels.FATAL,
        icon: 'error',
        name: 'SOCIAL.JOB.STATUS_ENUM.FATAL'
    }
]);
let Job = Job_1 = class Job extends Entity {
    constructor() {
        super(Job_1.TYPENAME);
    }
    asObject(opts) {
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
    fromObject(source) {
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
        }
        catch (err) {
            console.error('Error during UserEvent deserialization', err);
        }
    }
    isActive() {
        return ['PENDING', 'RUNNING'].includes(this.status);
    }
};
Job = Job_1 = __decorate([
    EntityClass({ typename: 'JobVO' }),
    __metadata("design:paramtypes", [])
], Job);
export { Job };
let JobFilter = class JobFilter extends EntityFilter {
    fromObject(source) {
        super.fromObject(source);
        this.issuer = source.issuer;
        this.types = source.types || [];
        this.status = source.status || [];
        this.lastUpdateDate = source.lastUpdateDate;
        this.excludedIds = source.excludedIds;
        this.includedIds = source.includedIds;
    }
    buildFilter() {
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
};
JobFilter = __decorate([
    EntityClass({ typename: 'JobFilterVO' })
], JobFilter);
export { JobFilter };
export class JobStatusUtils {
    static isFinished(status) {
        switch (status) {
            case 'PENDING':
            case 'RUNNING':
                return false;
            default:
                return true;
        }
    }
}
//# sourceMappingURL=job.model.js.map