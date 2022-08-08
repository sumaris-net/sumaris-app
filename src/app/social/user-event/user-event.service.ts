import { Injectable } from '@angular/core';
import {
  AbstractUserEventService,
  AccountService,
  Entity,
  GraphqlService,
  isEmptyArray,
  IUserEventMutations,
  IUserEventQueries,
  IUserEventSubscriptions,
  LoadResult,
  NetworkService,
  Page,
  ShowToastOptions,
  Toasts,
  UserEventTypes,
  UserEventWatchOptions
} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { FetchPolicy } from '@apollo/client/core';
import { UserEvent, UserEventFilter } from '@app/social/user-event/user-event.model';
import { environment } from '@environments/environment';
import { ToastController } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';
import { SortDirection } from '@angular/material/sort';
import { UserEventFragments } from './user-event.fragments';
import { Router } from '@angular/router';

const queries: IUserEventQueries = {
  loadAll: gql`query UserEvents($filter: UserEventFilterVOInput, $page: PageInput) {
    data: userEvents(filter: $filter, page: $page) {
      ...LightUserEventFragment
    }
    total: userEventsCount(filter: $filter)
  }
  ${UserEventFragments.lightUserEvent}`,

  loadAllWithContent: gql`query UserEventsWithContent($filter: UserEventFilterVOInput, $page: PageInput) {
      data: userEvents(filter: $filter, page: $page) {
        ...UserEventFragment
      },
      total: userEventsCount(filter: $filter)
    }
    ${UserEventFragments.userEvent}`,

  count: gql`query UserEventsCount($filter: UserEventFilterVOInput) {
    total: userEventsCount(filter: $filter)
  }`
};

const mutations: IUserEventMutations = {
  save: gql`mutation SaveUserEvent($data: UserEventVOInput) {
    data: saveUserEvent(userEvent: $data) {
      ...UserEventFragment
    }
  }
  ${UserEventFragments.userEvent}`,

  markAsRead: gql`mutation MarkAsReadUserEvents($ids: [Int]) {
    markAsReadUserEvents(ids: $ids)
  }`,

  deleteByIds: gql`mutation DeleteUserEvents($ids: [Int]) {
    deleteUserEvents(ids: $ids)
  }`,
};

const subscriptions: Partial<IUserEventSubscriptions> = {
  listenChanges: gql`subscription UpdateUserEvents($filter: UserEventFilterVOInput, $interval: Int) {
    data: updateUserEvents(filter: $filter, interval: $interval) {
      ...UserEventFragment
    }
  }
  ${UserEventFragments.userEvent}`,

  listenCountChanges: gql`subscription UpdateUserEventsCount($filter: UserEventFilterVOInput, $interval: Int) {
    total: updateUserEventsCount(filter: $filter, interval: $interval)
  }`
};

@Injectable()
export class UserEventService extends AbstractUserEventService<UserEvent, UserEventFilter> {
  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected network: NetworkService,
    protected translate: TranslateService,
    protected toastController: ToastController,
    protected router: Router
  ) {
    super(graphql, accountService, network, translate,
      {
        queries,
        mutations,
        subscriptions,
        production: environment.production
      });

    // Customize icons
    this.registerListener({
      accept: () => true,
      onReceived: (userEvent: UserEvent) => {
        this.customize(userEvent);
        return userEvent;
      }
    });
  }

  asFilter(filter: Partial<UserEventFilter>): UserEventFilter {
    const target = UserEventFilter.fromObject(filter || {});

    // Add SYSTEM notification, if Admin
    if (this.accountService.isAdmin() && (isEmptyArray(target.recipients) || !target.recipients.includes('SYSTEM'))) {
      target.recipients = [...target.recipients, 'SYSTEM'];
    }

    return target;
  }

  fromObject(source: any): UserEvent {
    return UserEvent.fromObject(source);
  }

  watchAll(offset: number, size: number, sortBy?: string, sortDirection?: SortDirection, filter?: Partial<UserEventFilter>, options?: UserEventWatchOptions): Observable<LoadResult<UserEvent>> {
    return super.watchAll(offset, size, sortBy, sortDirection, filter, options);
  }

  watchPage(page: Page, filter?: Partial<UserEventFilter>, options?: UserEventWatchOptions): Observable<LoadResult<UserEvent>> {
    if (!filter) filter = {};
    if (!filter.recipients?.length) {
      filter.recipients = [this.defaultRecipient()];
    }
    return super.watchPage({ ...page, sortBy: 'creationDate', sortDirection: 'desc' }, filter, {
      ...options,
      fetchPolicy: 'network-only',
      withContent: true,
    });
  }

  listenChanges(
    filter: Partial<UserEventFilter>,
    options?: UserEventWatchOptions & { interval?: number; fetchPolicy?: FetchPolicy }
  ): Observable<UserEvent[]> {
    return super.listenChanges(filter, { ...options, /*fetchPolicy: 'network-only',*/ withContent: true });
  }

  listenCountChanges(
    filter: Partial<UserEventFilter>,
    options?: UserEventWatchOptions & { interval?: number; fetchPolicy?: FetchPolicy }
  ): Observable<number> {
    filter = filter || {};
    filter.excludeRead = true;
    return super.listenCountChanges(filter, { ...options, fetchPolicy: 'no-cache' });
  }

  add(entity: UserEvent) {
    throw new Error(`Don't use add for the moment`);
  }

  async showToastErrorWithContext(opts: {
    error?: any;
    message?: string;
    context: any | (() => any) | Promise<any>;
  }) {

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
      message = message.substr(0, message.indexOf('<small>') - 1);
    }

    const res = await this.showToast({
      type: 'error',
      duration: 15000,
      message: message + '<br/><br/><b>' + this.translate.instant('CONFIRM.SEND_DEBUG_DATA') + '</b>',
      buttons: [{
        icon: 'bug',
        text: this.translate.instant('COMMON.BTN_SEND'),
        role: 'send'
      }]
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
      const userEvent = await this.sendDataForDebug({
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
    } catch (err) {
      console.error('Error while sending debug data:', err);
    }
  }

  sendDataForDebug(data: any): Promise<UserEvent> {
    const userEvent = new UserEvent();
    userEvent.type = UserEventTypes.DEBUG_DATA;
    userEvent.content = this.convertObjectToString(data);
    return this.save(userEvent);
  }

  /* -- protected methods -- */

  protected defaultRecipient(): any {
    return this.accountService.person.pubkey;
  }

  protected customize(userEvent: UserEvent) {
    // Choose default avatarIcon
    switch (userEvent.level) {
      case 'ERROR':
        userEvent.avatarIcon = { icon: 'close-circle-outline', color: 'danger' };
        break;
      case 'WARNING':
        userEvent.avatarIcon = { icon: 'warning-outline', color: 'warning' };
        break;
      case 'INFO':
        userEvent.avatarIcon = { icon: 'information-circle-outline' };
        break;
      case 'DEBUG':
        userEvent.avatarIcon = { icon: 'cog', color: 'medium' };
        break;
    }

    // Add message
    userEvent.message = userEvent.message || this.translate.instant(`SOCIAL.USER_EVENT.TYPE_ENUM.${userEvent.type}`);

    // Abalyse type
    switch (userEvent.type) {
      case 'DEBUG_DATA':
        userEvent.addDefaultAction({
            executeAction: () => this.router.navigate(['admin', 'config'], {queryParams: {tab: '2'}})
          });
        break;
    }
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

  protected async showToast<T = any>(opts: ShowToastOptions): Promise<OverlayEventDetail<T>> {
    if (!this.toastController) throw new Error('Missing toastController in component\'s constructor');
    return await Toasts.show(this.toastController, this.translate, opts);
  }
}
