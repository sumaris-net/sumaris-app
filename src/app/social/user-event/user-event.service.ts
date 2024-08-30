import { Injectable } from '@angular/core';
import {
  AbstractUserEventService,
  AccountService,
  Entity,
  EntityServiceLoadOptions,
  fromDateISOString,
  GraphqlService,
  IDebugDataService,
  IEntityService,
  isEmptyArray,
  isNil,
  isNotNil,
  IUserEventMutations,
  IUserEventQueries,
  IUserEventSubscriptions,
  LoadResult,
  MenuService,
  NetworkService,
  Page,
  Person,
  PersonService,
  PersonUtils,
  ShowToastOptions,
  Toasts,
  UserEventWatchOptions,
} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { FetchPolicy } from '@apollo/client/core';
import { UserEvent, UserEventFilter, UserEventTypeEnum } from '@app/social/user-event/user-event.model';
import { environment } from '@environments/environment';
import { NavController, ToastController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';
import { SortDirection } from '@angular/material/sort';
import { UserEventFragments } from './user-event.fragments';
import { UrlTree } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { CacheService } from 'ionic-cache';
import { Job } from '@app/social/job/job.model';
import { JobService } from '@app/social/job/job.service';
import { isNonEmptyArray } from '@apollo/client/utilities';
import { NavigationOptions } from '@ionic/angular/common/providers/nav-controller';

const queries: IUserEventQueries & { loadContent: any } = {
  loadContent: gql`
    query UserEventContent($id: Int!) {
      data: userEvents(filter: { includedIds: [$id], excludeRead: false }, page: { offset: 0, size: 1 }) {
        id
        content
      }
    }
  `,

  loadAll: gql`
    query UserEvents($filter: UserEventFilterVOInput, $page: PageInput) {
      data: userEvents(filter: $filter, page: $page) {
        ...LightUserEventFragment
      }
      total: userEventsCount(filter: $filter)
    }
    ${UserEventFragments.lightUserEvent}
  `,

  loadAllWithContent: gql`
    query UserEventsWithContent($filter: UserEventFilterVOInput, $page: PageInput) {
      data: userEvents(filter: $filter, page: $page) {
        ...UserEventFragment
      }
      total: userEventsCount(filter: $filter)
    }
    ${UserEventFragments.userEvent}
  `,

  count: gql`
    query UserEventsCount($filter: UserEventFilterVOInput) {
      total: userEventsCount(filter: $filter)
    }
  `,
};

const mutations: IUserEventMutations = {
  save: gql`
    mutation SaveUserEvent($data: UserEventVOInput) {
      data: saveUserEvent(userEvent: $data) {
        ...UserEventFragment
      }
    }
    ${UserEventFragments.userEvent}
  `,

  markAsRead: gql`
    mutation MarkAsReadUserEvents($ids: [Int]) {
      markAsReadUserEvents(ids: $ids)
    }
  `,

  deleteByIds: gql`
    mutation DeleteUserEvents($ids: [Int]) {
      deleteUserEvents(ids: $ids)
    }
  `,
};

const subscriptions: Partial<IUserEventSubscriptions> = {
  listenAllChanges: gql`
    subscription UpdateUserEvents($filter: UserEventFilterVOInput, $interval: Int) {
      data: updateUserEvents(filter: $filter, interval: $interval) {
        ...UserEventFragment
      }
    }
    ${UserEventFragments.userEvent}
  `,

  listenCountChanges: gql`
    subscription UpdateUserEventsCount($filter: UserEventFilterVOInput, $interval: Int) {
      total: updateUserEventsCount(filter: $filter, interval: $interval)
    }
  `,
};

const CacheKeys = {
  CACHE_GROUP: UserEvent.TYPENAME,

  PERSON_BY_PUBKEY: 'personByPubkey',
};

@Injectable()
export class UserEventService
  extends AbstractUserEventService<UserEvent, UserEventFilter>
  implements IEntityService<UserEvent, number>, IDebugDataService
{
  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected network: NetworkService,
    protected translate: TranslateService,
    protected toastController: ToastController,
    protected personService: PersonService,
    protected cache: CacheService,
    protected jobService: JobService,
    protected menuService: MenuService,
    protected navController: NavController
  ) {
    super(graphql, accountService, network, translate, {
      queries,
      mutations,
      subscriptions,
      production: environment.production,
    });

    // Customize icons
    this.registerListener({
      accept: () => true,
      onReceived: (e) => this.onReceived(e),
    });
  }

  async loadContent(id: number, opts?: { fetchPolicy?: FetchPolicy }): Promise<any> {
    try {
      const { data } = await this.graphql.query<{ data: any[] }>({
        query: queries.loadContent,
        ...opts,
        variables: { id },
      });
      const entity = data?.[0];
      return (entity && JSON.parse(entity.content)) || undefined;
    } catch (err) {
      console.error('Cannot load event content:', err);
      return null;
    }
  }

  async loadComments(filter: Partial<UserEventFilter>): Promise<any | undefined> {
    try {
      const fixedFilter = {
        ...filter,
        excludeRead: filter.excludeRead ?? false,
      };

      const response = await this.graphql.query<{ data: any[] }>({
        query: queries.loadAllWithContent,
        variables: {
          filter: fixedFilter,
          page: null,
        },
      });

      const entity = response.data?.[0];
      return entity ? JSON.parse(entity.content) : undefined;
    } catch (err) {
      console.error('Cannot load event content:', err);
      return undefined;
    }
  }

  watchAll(
    offset: number,
    size: number,
    sortBy?: string,
    sortDirection?: SortDirection,
    filter?: Partial<UserEventFilter>,
    options?: UserEventWatchOptions
  ): Observable<LoadResult<UserEvent>> {
    return super.watchAll(offset, size, sortBy, sortDirection, filter, options);
  }

  watchPage(page: Page, filter?: Partial<UserEventFilter>, opts?: UserEventWatchOptions): Observable<LoadResult<UserEvent>> {
    filter = filter || this.defaultFilter();
    if (!filter.startDate) {
      filter.startDate = fromDateISOString('1970-01-01T00:00:00.000Z');
    }
    return super.watchPage({ ...page, sortBy: 'creationDate', sortDirection: 'desc' }, filter, {
      fetchPolicy: 'no-cache',
      withContent: false,
      ...opts,
    });
  }

  listenAllChanges(
    filter: Partial<UserEventFilter>,
    options?: UserEventWatchOptions & { interval?: number; fetchPolicy?: FetchPolicy }
  ): Observable<UserEvent[]> {
    return super.listenAllChanges(filter, { ...options, withContent: true });
  }

  listenCountChanges(
    filter: Partial<UserEventFilter>,
    options?: UserEventWatchOptions & { interval?: number; fetchPolicy?: FetchPolicy }
  ): Observable<number> {
    filter = filter || this.defaultFilter();
    filter.excludeRead = true;
    return super.listenCountChanges(filter, { ...options, fetchPolicy: 'no-cache' });
  }

  async load(id: number, opts?: EntityServiceLoadOptions & { withContent?: boolean }): Promise<UserEvent> {
    const filter: Partial<UserEventFilter> = { includedIds: [id] };

    // Allow admin to load SYSTEM notifications
    if (this.accountService.isAdmin()) {
      filter.recipients = [this.defaultRecipient(), 'SYSTEM'];
    }

    const { data } = await this.loadPage({ offset: 0, size: 1 }, filter, {
      withContent: true,
      ...opts,
      withTotal: false,
    });
    const entity = data && data[0];
    return entity;
  }

  canUserWrite(data: UserEvent, opts?: any): boolean {
    return false; // Cannot write an existing UserEvent
  }

  listenChanges(id: number, opts?: any): Observable<UserEvent> {
    const f = this.defaultFilter();
    f.includedIds = [id];
    return super.listenAllChanges(f, { ...opts, /*fetchPolicy: 'network-only',*/ withContent: true }).pipe(
      map((res) => res && res[0]),
      filter(isNotNil)
    );
  }

  asFilter(filter: Partial<UserEventFilter>): UserEventFilter {
    return UserEventFilter.fromObject(filter);
  }

  fromObject(source: any): UserEvent {
    return UserEvent.fromObject(source);
  }

  async add(entity: UserEvent): Promise<UserEvent> {
    throw new Error(`Don't use add for the moment`);
  }

  async showToastErrorWithContext(opts: { error?: any; message?: string; context: any | (() => any) | Promise<any> }) {
    let message = opts.message || (opts.error && opts.error.message) || opts.error;

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

    const res = await this.showToast({
      type: 'error',
      duration: 15000,
      message: message + '<br/><br/><b>' + this.translate.instant('CONFIRM.SEND_DEBUG_DATA') + '</b>',
      buttons: [
        {
          icon: 'bug',
          text: this.translate.instant('COMMON.BTN_SEND'),
          role: 'send',
        },
      ],
    });
    if (!res || res.role !== 'send') return;

    // Send debug data
    try {
      if (this._debug) console.debug('Sending debug data...');

      // Call content factory
      let context: any = opts && opts.context;
      if (typeof context === 'function') {
        context = context();
      }
      if (context instanceof Promise) {
        context = await context;
      }

      // Send the message
      const userEvent = await this.sendDataAsEvent({
        message,
        error: opts.error || undefined,
        context: this.convertObjectToString(context),
      });

      console.info('Debug data successfully sent to admin', userEvent);
      this.showToast({
        type: 'info',
        message: 'INFO.DEBUG_DATA_SEND',
        showCloseButton: true,
      });
    } catch (err) {
      console.error('Error while sending debug data:', err);
    }
  }

  async sendDebugData(data: any) {
    await this.sendDataAsEvent(data);
  }

  async getPersonByPubkey(pubkey: string, opts?: { cache?: boolean; toEntity?: boolean }): Promise<Person> {
    if (!pubkey || pubkey === 'SYSTEM') return null;

    if (!opts || opts.cache !== false) {
      const cacheKey = [CacheKeys.PERSON_BY_PUBKEY, pubkey].join('|');
      return this.cache
        .getOrSetItem(cacheKey, () => this.getPersonByPubkey(pubkey, { cache: false, toEntity: false }), CacheKeys.CACHE_GROUP)
        .then((json) => (!opts || opts.toEntity !== false ? Person.fromObject(json || {}) : json || <Person>{ pubkey }));
    }

    // TODO use this.personService.loadByPubkey() instead
    const { data } = await this.personService.loadAll(0, 1, null, null, { pubkey }, { withTotal: false, ...opts });
    const entity = isNonEmptyArray(data) ? data[0] : opts?.toEntity !== false ? Person.fromObject({ pubkey }) : ({ pubkey } as Person);
    return entity;
  }

  /* -- protected methods -- */

  protected defaultFilter(): UserEventFilter {
    const target = super.defaultFilter();

    // If user is admin: add the SYSTEM recipient
    if (this.accountService.isAdmin() && (isEmptyArray(target.recipients) || !target.recipients.includes('SYSTEM'))) {
      // TODO: fixme: very slow if some DEBUG data are fetched (e.g in ADAP Pod)
      //target.recipients = [...target.recipients, 'SYSTEM'];
    }

    return target;
  }

  protected defaultRecipient(): any {
    return this.accountService.isLogin() ? this.accountService.person.pubkey : undefined;
  }

  protected async onReceived(source: UserEvent): Promise<UserEvent> {
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

    let issuer: Person;

    // Analyse type
    switch (source.type) {
      // Debug data
      case UserEventTypeEnum.FEED: {
        source.avatarIcon = { matIcon: 'rss_feed' };
        source.icon = { matIcon: 'information-circle-outline', color: 'success' };
        break;
      }

      // Debug data
      case UserEventTypeEnum.DEBUG_DATA: {
        issuer = await this.getPersonByPubkey(source.issuer);
        source.icon = { matIcon: 'bug_report', color: 'danger' };
        source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.DEBUG_DATA', {
          ...source,
          message: source.content?.message || '',
          issuer: this.personToString(issuer, { withDepartment: true }),
        });
        source.addDefaultAction({
          executeAction: () => this.navigate(['admin', 'config'], { queryParams: { tab: '2' } }),
        });
        break;
      }

      // Inbox messages:
      case UserEventTypeEnum.INBOX_MESSAGE: {
        issuer = await this.getPersonByPubkey(source.issuer);
        if (isNotNil(issuer?.avatar)) {
          source.avatar = issuer?.avatar;
        } else if (source.issuer === 'SYSTEM') {
          source.avatarIcon = { matIcon: 'person' };
        } else if (isNotNil(issuer?.id)) {
          source.avatarJdenticon = issuer?.id;
          source.avatarIcon = null;
        } else {
          source.avatarIcon = { matIcon: 'mail' };
        }
        source.icon = { matIcon: 'inbox', color: 'success' };
        source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.INBOX_MESSAGE', { issuer: this.personToString(issuer) });
        source.addDefaultAction({
          executeAction: (e) => this.navigate(['inbox', e.id]),
        });
        break;
      }

      // Job event:
      case UserEventTypeEnum.JOB: {
        if (source.hasContent && !source.content) {
          source.content = await this.loadContent(source.id, { fetchPolicy: 'no-cache' });
        }
        const job = Job.fromObject(source.content || {});
        const status = job.status || (source.level === 'INFO' && 'SUCCESS') || (source.level === 'ERROR' && 'ERROR') || 'PENDING';
        const color =
          (status === 'PENDING' && 'secondary') || (status === 'RUNNING' && 'tertiary') || (status === 'SUCCESS' && 'success') || 'danger';
        const matIcon =
          (status === 'PENDING' && 'schedule') ||
          (status === 'RUNNING' && 'pending') ||
          (status === 'SUCCESS' && 'check_circle') ||
          (status === 'WARNING' && 'warning') ||
          (status === 'CANCELLED' && 'cancel') ||
          'error';
        source.icon = { matIcon, color };
        //source.avatarIcon = { matIcon: 'inbox', color: 'success'};
        job.name = job.name || this.translate.instant('SOCIAL.JOB.UNKNOWN_JOB');
        job.status = this.translate.instant('SOCIAL.JOB.STATUS_ENUM.' + status);
        source.message = this.translate.instant('SOCIAL.USER_EVENT.TYPE_ENUM.JOB', job);
        this.decorateJobUserEvent(source, job);

        break;
      }

      default:
        if (this._debug) console.debug(this._logPrefix + `[user-event-service] Unknown event type '${source.type}': `, source);
        break;
    }

    return source;
  }

  protected convertObjectToString(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    // Serialize content into string
    else if (typeof data === 'object') {
      if (data instanceof Entity) {
        return JSON.stringify(data.asObject({ keepTypename: true, keepLocalId: true, minify: false }));
      } else {
        return JSON.stringify(data);
      }
    }
  }

  protected sendDataAsEvent(data: any): Promise<UserEvent> {
    const userEvent = new UserEvent();
    userEvent.type = UserEventTypeEnum.DEBUG_DATA;
    userEvent.content = data;
    return this.save(userEvent);
  }

  sendComment(data: any): Promise<UserEvent> {
    const userEvent = new UserEvent();
    userEvent.recipient = data.objectType;
    userEvent.source = data.objectId;
    userEvent.type = UserEventTypeEnum.COMMENT;
    userEvent.content = data;
    return this.save(userEvent);
  }

  protected async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    if (!this.toastController) throw new Error("Missing toastController in component's constructor");
    return await Toasts.show(this.toastController, this.translate, opts);
  }

  protected personToString(obj: Person, opts?: { withDepartment: boolean }): string {
    if (!obj || isNil(obj.id)) {
      return obj?.pubkey?.substring(0, 8) || '?';
    }
    return PersonUtils.personToString(obj, opts);
  }

  protected decorateJobUserEvent(source: UserEvent, job: Job) {
    console.debug('[user-event-service] Decorate user event on Job:', job);

    source.addDefaultAction({
      executeAction: (e) => this.navigate(['vessels']),
    });

    if (job.report) {
      source.addAction({
        name: 'SOCIAL.JOB.BTN_REPORT',
        title: 'SOCIAL.JOB.BTN_REPORT_HELP',
        iconRef: { icon: 'document-outline' },
        executeAction: (e) => {
          this.menuService.close();
          this.jobService.openJobReport(job);
        },
      });
    }
  }

  protected async navigate(commands: string | any[] | UrlTree, options?: NavigationOptions) {
    await this.navController.navigateRoot(commands, options);
    await this.menuService.close();
  }
}
