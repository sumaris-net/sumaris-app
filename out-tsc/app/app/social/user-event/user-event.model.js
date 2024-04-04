var UserEvent_1, UserEventFilter_1;
import { __decorate, __metadata } from "tslib";
import { Entity, EntityClass, EntityFilter, fromDateISOString, isNil, isNotEmptyArray, isNotNil, toDateISOString, isNotNilOrBlank } from '@sumaris-net/ngx-components';
export const UserEventTypeEnum = Object.freeze({
    FEED: 'FEED',
    DEBUG_DATA: 'DEBUG_DATA',
    INBOX_MESSAGE: 'INBOX_MESSAGE',
    JOB: 'JOB'
    // TODO: add all types of event
});
let UserEvent = UserEvent_1 = class UserEvent extends Entity {
    constructor() {
        super(UserEvent_1.TYPENAME);
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.creationDate = toDateISOString(this.creationDate);
        target.readDate = toDateISOString(this.readDate);
        // Serialize content
        if (typeof this.content === 'object') {
            target.content = JSON.stringify(this.content);
        }
        else if (typeof this.content === 'string') {
            target.content = this.content;
        }
        else {
            target.content = null;
        }
        target.hasContent = this.hasContent || isNotNilOrBlank(target.content);
        if (opts === null || opts === void 0 ? void 0 : opts.minify) {
            delete target.avatar;
            delete target.avatarIcon;
            delete target.icon;
            delete target.actions;
            delete target.hasContent;
        }
        // Pod
        if ((opts === null || opts === void 0 ? void 0 : opts.keepLocalId) === false) {
            delete target.jobId;
        }
        return target;
    }
    fromObject(source) {
        Object.assign(this, source); // Copy all properties
        super.fromObject(source);
        this.creationDate = fromDateISOString(source.creationDate);
        this.readDate = fromDateISOString(source.readDate);
        try {
            // Deserialize content
            if (typeof source.content === 'string' && source.content.startsWith('{')) {
                this.content = JSON.parse(source.content);
            }
        }
        catch (err) {
            console.error('Error during UserEvent deserialization', err);
            this.content = null;
        }
        this.hasContent = this.hasContent || !!this.content || false;
    }
    addAction(action) {
        if (!action)
            throw new Error(`Argument 'action' is required`);
        if (!action.name)
            throw new Error(`Argument 'action.name' is required`);
        if (!action.executeAction || typeof action.executeAction !== 'function')
            throw new Error(`Argument 'action.executeAction' is required, and should be a function`);
        this.actions = this.actions || [];
        this.actions.push(action);
    }
    addDefaultAction(action) {
        this.addAction(Object.assign(Object.assign({ executeAction: null }, action), { default: true, name: action.name || 'default', title: action.title || action.name }));
    }
};
UserEvent = UserEvent_1 = __decorate([
    EntityClass({ typename: 'UserEventVO' }),
    __metadata("design:paramtypes", [])
], UserEvent);
export { UserEvent };
let UserEventFilter = UserEventFilter_1 = class UserEventFilter extends EntityFilter {
    constructor() {
        super(UserEventFilter_1.TYPENAME);
        this.types = [];
        this.levels = [];
        this.issuers = [];
        this.recipients = [];
        this.startDate = null;
        this.includedIds = [];
        this.excludeRead = false;
        this.jobId = null;
        this.source = null;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.types = source.types || [];
        this.levels = source.levels || [];
        this.issuers = source.issuers || [];
        this.recipients = source.recipients || [];
        this.startDate = fromDateISOString(source.startDate);
        this.includedIds = source.includedIds || [];
        this.excludeRead = source.excludeRead || false;
        this.jobId = source.jobId;
        this.source = source.source;
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.source = target.source || (target.jobId && 'job:' + target.jobId) || undefined;
        // Pod
        if ((opts === null || opts === void 0 ? void 0 : opts.keepLocalId) === false) {
            delete target.jobId;
        }
        return target;
    }
    buildFilter() {
        const filterFns = super.buildFilter();
        if (isNotEmptyArray(this.types)) {
            filterFns.push((t) => this.types.includes(t.type));
        }
        if (isNotEmptyArray(this.levels)) {
            filterFns.push((t) => this.levels.includes(t.level));
        }
        if (isNotEmptyArray(this.issuers)) {
            filterFns.push((t) => this.issuers.includes(t.issuer));
        }
        if (isNotEmptyArray(this.recipients)) {
            filterFns.push((t) => this.recipients.includes(t.recipient));
        }
        if (isNotNil(this.startDate)) {
            filterFns.push((t) => this.startDate.isSameOrBefore(t.creationDate));
        }
        if (isNotEmptyArray(this.includedIds)) {
            filterFns.push((t) => this.includedIds.includes(t.id));
        }
        if (this.excludeRead === true) {
            filterFns.push((t) => isNil(t.readDate));
        }
        if (isNotNil(this.jobId)) {
            filterFns.push(t => t.jobId === this.jobId);
        }
        if (isNotNil(this.source)) {
            filterFns.push(t => t.source === this.source);
        }
        return filterFns;
    }
};
UserEventFilter = UserEventFilter_1 = __decorate([
    EntityClass({ typename: 'UserEventFilterVO' }),
    __metadata("design:paramtypes", [])
], UserEventFilter);
export { UserEventFilter };
//# sourceMappingURL=user-event.model.js.map