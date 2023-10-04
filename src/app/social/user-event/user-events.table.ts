import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input, OnInit } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { UserEventService } from './user-event.service';
import { Moment } from 'moment';
import { SortDirection } from '@angular/material/sort';
import { PredefinedColors } from '@ionic/core';
import {
  AccountService,
  APP_USER_EVENT_SERVICE,
  AppTable,
  EntitiesStorage,
  EntitiesTableDataSource,
  IconRef,
  IEntity,
  IUserEventAction,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  toBoolean,
} from '@sumaris-net/ngx-components';
import { UserEvent, UserEventFilter } from '@app/social/user-event/user-event.model';
import { debounceTime, filter, map, mergeMap, switchMap } from 'rxjs/operators';

export interface UserEventDetail<T extends IEntity<T>> {
  title: string;
  description?: string;
  path?: string;

  action?: string | any;
  actionTitle?: string;
  actionColor?: PredefinedColors;

  icon?: string;
  matIcon?: string;
  color?: string;
  cssClass?: string;
  time?: Moment;

  // A config property, to override the title
  titleProperty?: string;
  titleArgs?: { [key: string]: string };

  // conversion
  fromObject?: (source: any) => T;
  childrenFields?: string[];
}

export interface UserEventIcon {
  icon?: string;
  matIcon?: string;
  color?: PredefinedColors;
}

const DEFAULT_ICONS_BY_TYPE: { [key: string]: IconRef } = {
  DEBUG_DATA: { matIcon: 'bug_report' },
  INBOX_MESSAGE: { matIcon: 'mail' }
};

@Component({
  selector: 'app-user-events-table',
  styleUrls: ['user-events.table.scss'],
  templateUrl: './user-events.table.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserEventsTable
  extends AppTable<UserEvent, UserEventFilter>
  implements OnInit {

  dateTimePattern: string;
  canEdit: boolean;
  canDelete: boolean;
  isAdmin: boolean;

  @Input() mobile: boolean;
  @Input() showToolbar: boolean;
  @Input() showPaginator = true;
  @Input() recipient: string;
  @Input() withContent: boolean;
  @Input() defaultSortBy: string;
  @Input() defaultSortDirection: SortDirection;

  constructor(
    injector: Injector,
    protected accountService: AccountService,
    @Inject(APP_USER_EVENT_SERVICE) protected userEvenService: UserEventService,
    protected entities: EntitiesStorage,
    protected cd: ChangeDetectorRef
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'creationDate',
          'icon',
          'message'
        ])
        .concat(RESERVED_END_COLUMNS),
      null,
      null);

    this.i18nColumnPrefix = 'SOCIAL.USER_EVENT.';
    this.autoLoad = false; // this.start()
    this.inlineEdition = false;
    this.defaultSortBy = 'creationDate';
    this.defaultSortDirection = 'desc';

    this.mobile = this.settings.mobile;

  }

  ngOnInit() {
    super.ngOnInit();

    // Load date/time pattern
    this.dateTimePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');
    this.withContent = toBoolean(this.withContent, false);
    this.showToolbar = toBoolean(this.showToolbar, !this.mobile);

    const account = this.accountService.account;
    const pubkey = account && account.pubkey;
    this.isAdmin = this.accountService.isAdmin();
    this.canEdit = this.isAdmin || pubkey === this.recipient;
    this.canDelete = this.canEdit;
    this.allowRowDetail = this.onOpenRow.observed;

    this.setDatasource(new EntitiesTableDataSource(UserEvent,
      this.userEvenService,
      null,
      {
        prependNewElements: false,
        suppressErrors: true,
        watchAllOptions: {
          withContent: this.withContent
        }
      }));


    this.registerSubscription(
      this.onRefresh.pipe(
        debounceTime(200),
        mergeMap(_ => this.waitIdle({stop: this.destroySubject})),
        map(_ => this.filter),
        switchMap(filter => this.userEvenService.listenCountChanges({...filter, excludeRead: false})),
        filter(count => !this.loading && count !== this.totalRowCount)
      )
      .subscribe(count => {
        this.onRefresh.emit();
      })
    );

     // Apply filter
    {
      const filter = this.filter || new UserEventFilter();
      if (this.recipient) {
        filter.recipients = [this.recipient];
      }
      this.setFilter(filter, { emitEvent: true });
    }


  }

  async start() {
    console.debug('[user-event] Starting...');

    // Waiting account to be ready
    await this.accountService.ready();

    // Load data
    this.onRefresh.emit();
  }

  getIcon(source: UserEvent): IconRef {
    return source.icon || DEFAULT_ICONS_BY_TYPE[source.type];
  }

  async doAction(event: UIEvent, action: IUserEventAction, row: TableElement<UserEvent>): Promise<any> {

    if (action && typeof action.executeAction === 'function') {

      if (event) {
        event.preventDefault(); // Avoid click row
        event.stopPropagation();
      }

      const userEvent = row.currentData;

      this.markAsLoading();

      try {
        let res = action.executeAction(userEvent);
        res = (res instanceof Promise) ? await res : res;
        return res;
      } catch (err) {
        this.setError(err && err.message || err);
        console.error(`[user-event] Failed to execute action ${action.name}: ${err && err.message || err}`, err);
      } finally {
        this.markAsLoaded();
      }
    }
  }

}
