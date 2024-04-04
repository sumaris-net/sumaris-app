import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { AbstractUserEventService, AccountService, Entity, fromDateISOString, GraphqlService, isEmptyArray, isNotNil, MenuService, NetworkService, Person, PersonService, Toasts, } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import gql from 'graphql-tag';
import { UserEvent, UserEventFilter, UserEventTypeEnum } from '@app/social/user-event/user-event.model';
import { environment } from '@environments/environment';
import { NavController, ToastController } from '@ionic/angular';
import { UserEventFragments } from './user-event.fragments';
import { filter, map } from 'rxjs/operators';
import { CacheService } from 'ionic-cache';
import { Job } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { isNonEmptyArray } from '@apollo/client/utilities';
const queries = {
    loadContent: gql `
    query UserEventContent($id: Int!) {
      data: userEvents(filter: { includedIds: [$id], excludeRead: false }, page: { offset: 0, size: 1 }) {
        id
        content
      }
    }
  `,
    loadAll: gql `
    query UserEvents($filter: UserEventFilterVOInput, $page: PageInput) {
      data: userEvents(filter: $filter, page: $page) {
        ...LightUserEventFragment
      }
      total: userEventsCount(filter: $filter)
    }
    ${UserEventFragments.lightUserEvent}
  `,
    loadAllWithContent: gql `
    query UserEventsWithContent($filter: UserEventFilterVOInput, $page: PageInput) {
      data: userEvents(filter: $filter, page: $page) {
        ...UserEventFragment
      }
      total: userEventsCount(filter: $filter)
    }
    ${UserEventFragments.userEvent}
  `,
    count: gql `
    query UserEventsCount($filter: UserEventFilterVOInput) {
      total: userEventsCount(filter: $filter)
    }
  `,
};
const mutations = {
    save: gql `mutation SaveUserEvent($data: UserEventVOInput) {
    data: saveUserEvent(userEvent: $data) {
      ...UserEventFragment
    }
  }
  ${UserEventFragments.userEvent}`,
    markAsRead: gql `mutation MarkAsReadUserEvents($ids: [Int]) {
    markAsReadUserEvents(ids: $ids)
  }`,
    deleteByIds: gql `mutation DeleteUserEvents($ids: [Int]) {
    deleteUserEvents(ids: $ids)
  }`,
};
const subscriptions = {
    listenAllChanges: gql `subscription UpdateUserEvents($filter: UserEventFilterVOInput, $interval: Int) {
    data: updateUserEvents(filter: $filter, interval: $interval) {
      ...UserEventFragment
    }
  }
  ${UserEventFragments.userEvent}`,
    listenCountChanges: gql `subscription UpdateUserEventsCount($filter: UserEventFilterVOInput, $interval: Int) {
    total: updateUserEventsCount(filter: $filter, interval: $interval)
  }`
};
const CacheKeys = {
    CACHE_GROUP: UserEvent.TYPENAME,
    PERSON_BY_PUBKEY: 'personByPubkey'
};
let UserEventService = class UserEventService extends AbstractUserEventService {
    constructor(graphql, accountService, network, translate, toastController, personService, cache, jobService, menuService, navController) {
        super(graphql, accountService, network, translate, {
            queries,
            mutations,
            subscriptions,
            production: environment.production
        });
        this.graphql = graphql;
        this.accountService = accountService;
        this.network = network;
        this.translate = translate;
        this.toastController = toastController;
        this.personService = personService;
        this.cache = cache;
        this.jobService = jobService;
        this.menuService = menuService;
        this.navController = navController;
        // Customize icons
        this.registerListener({
            accept: () => true,
            onReceived: (e) => this.onReceived(e)
        });
    }
    loadContent(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data } = yield this.graphql.query(Object.assign(Object.assign({ query: queries.loadContent }, opts), { variables: { id } }));
                const entity = data === null || data === void 0 ? void 0 : data[0];
                return entity && JSON.parse(entity.content) || undefined;
            }
            catch (err) {
                console.error('Cannot load event content:', err);
                return null;
            }
        });
    }
    watchAll(offset, size, sortBy, sortDirection, filter, options) {
        return super.watchAll(offset, size, sortBy, sortDirection, filter, options);
    }
    watchPage(page, filter, opts) {
        filter = filter || this.defaultFilter();
        if (!filter.startDate) {
            filter.startDate = fromDateISOString('1970-01-01T00:00:00.000Z');
        }
        return super.watchPage(Object.assign(Object.assign({}, page), { sortBy: 'creationDate', sortDirection: 'desc' }), filter, Object.assign({ fetchPolicy: 'no-cache', withContent: false }, opts));
    }
    listenAllChanges(filter, options) {
        return super.listenAllChanges(filter, Object.assign(Object.assign({}, options), { withContent: true }));
    }
    listenCountChanges(filter, options) {
        filter = filter || this.defaultFilter();
        filter.excludeRead = true;
        return super.listenCountChanges(filter, Object.assign(Object.assign({}, options), { fetchPolicy: 'no-cache' }));
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { includedIds: [id] };
            // Allow admin to load SYSTEM notifications
            if (this.accountService.isAdmin()) {
                filter.recipients = [this.defaultRecipient(), 'SYSTEM'];
            }
            const { data } = yield this.loadPage({ offset: 0, size: 1 }, filter, Object.assign(Object.assign({ withContent: true }, opts), { withTotal: false }));
            const entity = data && data[0];
            return entity;
        });
    }
    canUserWrite(data, opts) {
        return false; // Cannot write an existing UserEvent
    }
    listenChanges(id, opts) {
        const f = this.defaultFilter();
        f.includedIds = [id];
        return super.listenAllChanges(f, Object.assign(Object.assign({}, opts), { withContent: true }))
            .pipe(map(res => res && res[0]), filter(isNotNil));
    }
    asFilter(filter) {
        return UserEventFilter.fromObject(filter);
    }
    fromObject(source) {
        return UserEvent.fromObject(source);
    }
    add(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error(`Don't use add for the moment`);
        });
    }
    showToastErrorWithContext(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let message = opts.message || (opts.error && opts.error.message || opts.error);
            // Make sure message a string
            if (!message || typeof message !== 'string') {
                message = 'ERROR.UNKNOWN_TECHNICAL_ERROR';
            }
            // If offline, display a simple alert
            if (this.network.offline) {
                this.showToast({ message, type: 'error' });
                return;
            }
            // Translate the message (to be able to extract details content)
            message = this.translate.instant(message);
            // Clean details parts
            if (message && message.indexOf('<small>') !== -1) {
                message = message.substring(0, message.indexOf('<small>') - 1);
            }
            const res = yield this.showToast({
                type: 'error',
                duration: 15000,
                message: message + '<br/><br/><b>' + this.translate.instant('CONFIRM.SEND_DEBUG_DATA') + '</b>',
                buttons: [{
                        icon: 'bug',
                        text: this.translate.instant('COMMON.BTN_SEND'),
                        role: 'send'
                    }]
            });
            if (!res || res.role !== 'send')
                return;
            // Send debug data
            try {
                if (this._debug)
                    console.debug('Sending debug data...');
                // Call content factory
                let context = opts && opts.context;
                if (typeof context === 'function') {
                    context = context();
                }
                if (context instanceof Promise) {
                    context = yield context;
                }
                // Send the message
                const userEvent = yield this.sendDataAsEvent({
                    message,
                    error: opts.error || undefined,
                    context: this.convertObjectToString(context)
                });
                console.info('Debug data successfully sent to admin', userEvent);
                this.showToast({
                    type: 'info',
                    message: 'INFO.DEBUG_DATA_SEND',
                    showCloseButton: true
                });
            }
            catch (err) {
                console.error('Error while sending debug data:', err);
            }
        });
    }
    sendDebugData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.sendDataAsEvent(data);
        });
    }
    getPersonByPubkey(pubkey, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pubkey || pubkey === 'SYSTEM')
                return null;
            if (!opts || opts.cache !== false) {
                const cacheKey = [CacheKeys.PERSON_BY_PUBKEY, pubkey].join('|');
                return this.cache.getOrSetItem(cacheKey, () => this.getPersonByPubkey(pubkey, { cache: false, toEntity: false }), CacheKeys.CACHE_GROUP)
                    .then(json => (!opts || opts.toEntity !== false) ? Person.fromObject(json || {}) : (json || { pubkey }));
            }
            // TODO use this.personService.loadByPubkey() instead
            const { data } = yield this.personService.loadAll(0, 1, null, null, { pubkey }, Object.assign({ withTotal: false }, opts));
            const entity = isNonEmptyArray(data)
                ? data[0]
                : (opts === null || opts === void 0 ? void 0 : opts.toEntity) !== false ? Person.fromObject({ pubkey }) : { pubkey };
            return entity;
        });
    }
    /* -- protected methods -- */
    defaultFilter() {
        const target = super.defaultFilter();
        // If user is admin: add the SYSTEM recipient
        if (this.accountService.isAdmin() && (isEmptyArray(target.recipients) || !target.recipients.includes('SYSTEM'))) {
            // TODO: fixme: very slow if some DEBUG data are fetched (e.g in ADAP Pod)
            //target.recipients = [...target.recipients, 'SYSTEM'];
        }
        return target;
    }
    defaultRecipient() {
        return this.accountService.isLogin() ? this.accountService.person.pubkey : undefined;
    }
    onReceived(source) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[user-event-service] Converting user event', source);
            // Choose default avatarIcon
            switch (source.level) {
                case 'ERROR':
                    source.avatarIcon = { icon: 'close-circle-outline', color: 'danger' };
                    break;
                case 'WARNING':
                    source.avatarIcon = { icon: 'warning-outline', color: 'warning' };
                    break;
                case 'INFO':
                    source.avatarIcon = { icon: 'information-circle-outline' };
                    break;
                case 'DEBUG':
                    source.avatarIcon = { icon: 'cog', color: 'medium' };
                    break;
            }
            // Add message
            source.message = source.message || this.translate.instant(`SOCIAL.USER_EVENT.TYPE_ENUM.${source.type}`);
            let issuer;
            // Analyse type
            switch (source.type) {
                // Debug data
                case UserEventTypeEnum.FEED:
                    source.avatarIcon = { matIcon: 'rss_feed' };
                    source.icon = { matIcon: 'information-circle-outline', color: 'success' };
                    break;
                // Debug data
                case UserEventTypeEnum.DEBUG_DATA:
                    issuer = yield this.getPersonByPubkey(source.issuer);
                    source.icon = { matIcon: 'bug_report', color: 'danger' };
                    source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.DEBUG_DATA', Object.assign(Object.assign({}, source), { message: ((_a = source.content) === null || _a === void 0 ? void 0 : _a.message) || '', issuer: this.personToString(issuer, { withDepartment: true }) }));
                    source.addDefaultAction({
                        executeAction: () => this.navigate(['admin', 'config'], { queryParams: { tab: '2' } })
                    });
                    break;
                // Inbox messages:
                case UserEventTypeEnum.INBOX_MESSAGE:
                    issuer = yield this.getPersonByPubkey(source.issuer);
                    if (isNotNil(issuer === null || issuer === void 0 ? void 0 : issuer.avatar)) {
                        source.avatar = issuer === null || issuer === void 0 ? void 0 : issuer.avatar;
                    }
                    else if (source.issuer === 'SYSTEM') {
                        source.avatarIcon = { matIcon: 'person' };
                    }
                    else if (isNotNil(issuer === null || issuer === void 0 ? void 0 : issuer.id)) {
                        source.avatarJdenticon = issuer === null || issuer === void 0 ? void 0 : issuer.id;
                        source.avatarIcon = null;
                    }
                    else {
                        source.avatarIcon = { matIcon: 'mail' };
                    }
                    source.icon = { matIcon: 'inbox', color: 'success' };
                    source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.INBOX_MESSAGE', { issuer: this.personToString(issuer) });
                    source.addDefaultAction({
                        executeAction: (e) => this.navigate(['inbox', e.id])
                    });
                    break;
                // Job event:
                case UserEventTypeEnum.JOB:
                    if (source.hasContent && !source.content) {
                        source.content = yield this.loadContent(source.id, { fetchPolicy: 'no-cache' });
                    }
                    const job = Job.fromObject(source.content || {});
                    const status = job.status
                        || (source.level === 'INFO' && 'SUCCESS')
                        || (source.level === 'ERROR' && 'ERROR')
                        || 'PENDING';
                    const color = (status === 'PENDING' && 'secondary')
                        || (status === 'RUNNING' && 'tertiary')
                        || (status === 'SUCCESS' && 'success')
                        || 'danger';
                    const matIcon = (status === 'PENDING' && 'schedule')
                        || (status === 'RUNNING' && 'pending')
                        || (status === 'SUCCESS' && 'check_circle')
                        || (status === 'WARNING' && 'warning')
                        || (status === 'CANCELLED' && 'cancel')
                        || 'error';
                    source.icon = { matIcon, color };
                    //source.avatarIcon = { matIcon: 'inbox', color: 'success'};
                    job.name = job.name || this.translate.instant('SOCIAL.JOB.UNKNOWN_JOB');
                    job.status = this.translate.instant('SOCIAL.JOB.STATUS_ENUM.' + status);
                    source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.JOB', job);
                    this.decorateJobUserEvent(source, job);
                    break;
                default:
                    if (this._debug)
                        console.debug(this._logPrefix + `[user-event-service] Unknown event type '${source.type}': `, source);
                    break;
            }
            return source;
        });
    }
    convertObjectToString(data) {
        if (typeof data === 'string') {
            return data;
        }
        // Serialize content into string
        else if (typeof data === 'object') {
            if (data instanceof Entity) {
                return JSON.stringify(data.asObject({ keepTypename: true, keepLocalId: true, minify: false }));
            }
            else {
                return JSON.stringify(data);
            }
        }
    }
    sendDataAsEvent(data) {
        const userEvent = new UserEvent();
        userEvent.type = UserEventTypeEnum.DEBUG_DATA;
        userEvent.content = data;
        return this.save(userEvent);
    }
    showToast(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toastController)
                throw new Error('Missing toastController in component\'s constructor');
            return yield Toasts.show(this.toastController, this.translate, opts);
        });
    }
    personToString(obj, opts) {
        var _a, _b, _c;
        if (!obj || !obj.id) {
            return ((_a = obj === null || obj === void 0 ? void 0 : obj.pubkey) === null || _a === void 0 ? void 0 : _a.substring(0, 8)) || '?';
        }
        if ((opts === null || opts === void 0 ? void 0 : opts.withDepartment) && ((_b = obj.department) === null || _b === void 0 ? void 0 : _b.label)) {
            return obj.firstName + ' ' + obj.lastName + ' (' + ((_c = obj.department) === null || _c === void 0 ? void 0 : _c.label) + ')';
        }
        return obj && obj.id && (obj.firstName + ' ' + obj.lastName) || undefined;
    }
    decorateJobUserEvent(source, job) {
        console.debug('[user-event-service] Decorate user event on Job:', job);
        source.addDefaultAction({
            executeAction: (e) => this.navigate(['vessels'])
        });
        if (job.report) {
            source.addAction({
                name: 'SOCIAL.JOB.BTN_REPORT',
                title: 'SOCIAL.JOB.BTN_REPORT_HELP',
                iconRef: { icon: 'document-outline' },
                executeAction: (e) => {
                    this.menuService.close();
                    this.jobService.openJobReport(job);
                }
            });
        }
    }
    navigate(commands, options) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.navController.navigateRoot(commands, options);
            yield this.menuService.close();
        });
    }
};
UserEventService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GraphqlService,
        AccountService,
        NetworkService,
        TranslateService,
        ToastController,
        PersonService,
        CacheService,
        JobService,
        MenuService,
        NavController])
], UserEventService);
export { UserEventService };
//# sourceMappingURL=user-event.service.js.map