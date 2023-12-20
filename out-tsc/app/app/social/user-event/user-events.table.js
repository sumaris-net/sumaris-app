import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, Input } from '@angular/core';
import { UserEventService } from './user-event.service';
import { AccountService, APP_USER_EVENT_SERVICE, AppTable, EntitiesStorage, EntitiesTableDataSource, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, toBoolean, } from '@sumaris-net/ngx-components';
import { UserEvent, UserEventFilter } from '@app/social/user-event/user-event.model';
import { debounceTime, filter, map, mergeMap, switchMap } from 'rxjs/operators';
const DEFAULT_ICONS_BY_TYPE = {
    DEBUG_DATA: { matIcon: 'bug_report' },
    INBOX_MESSAGE: { matIcon: 'mail' }
};
let UserEventsTable = class UserEventsTable extends AppTable {
    constructor(injector, accountService, userEvenService, entities, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS
            .concat([
            'creationDate',
            'icon',
            'message'
        ])
            .concat(RESERVED_END_COLUMNS), null, null);
        this.accountService = accountService;
        this.userEvenService = userEvenService;
        this.entities = entities;
        this.cd = cd;
        this.showPaginator = true;
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
        this.setDatasource(new EntitiesTableDataSource(UserEvent, this.userEvenService, null, {
            prependNewElements: false,
            suppressErrors: true,
            watchAllOptions: {
                withContent: this.withContent
            }
        }));
        this.registerSubscription(this.onRefresh.pipe(debounceTime(200), mergeMap(_ => this.waitIdle({ stop: this.destroySubject })), map(_ => this.filter), switchMap(filter => this.userEvenService.listenCountChanges(Object.assign(Object.assign({}, filter), { excludeRead: false }))), filter(count => !this.loading && count !== this.totalRowCount))
            .subscribe(count => {
            this.onRefresh.emit();
        }));
        // Apply filter
        {
            const filter = this.filter || new UserEventFilter();
            if (this.recipient) {
                filter.recipients = [this.recipient];
            }
            this.setFilter(filter, { emitEvent: true });
        }
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[user-event] Starting...');
            // Waiting account to be ready
            yield this.accountService.ready();
            // Load data
            this.onRefresh.emit();
        });
    }
    getIcon(source) {
        return source.icon || DEFAULT_ICONS_BY_TYPE[source.type];
    }
    doAction(event, action, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (action && typeof action.executeAction === 'function') {
                if (event) {
                    event.preventDefault(); // Avoid click row
                    event.stopPropagation();
                }
                const userEvent = row.currentData;
                this.markAsLoading();
                try {
                    let res = action.executeAction(userEvent);
                    res = (res instanceof Promise) ? yield res : res;
                    return res;
                }
                catch (err) {
                    this.setError(err && err.message || err);
                    console.error(`[user-event] Failed to execute action ${action.name}: ${err && err.message || err}`, err);
                }
                finally {
                    this.markAsLoaded();
                }
            }
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], UserEventsTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], UserEventsTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], UserEventsTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], UserEventsTable.prototype, "recipient", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], UserEventsTable.prototype, "withContent", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], UserEventsTable.prototype, "defaultSortBy", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], UserEventsTable.prototype, "defaultSortDirection", void 0);
UserEventsTable = __decorate([
    Component({
        selector: 'app-user-events-table',
        styleUrls: ['user-events.table.scss'],
        templateUrl: './user-events.table.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(2, Inject(APP_USER_EVENT_SERVICE)),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        UserEventService,
        EntitiesStorage,
        ChangeDetectorRef])
], UserEventsTable);
export { UserEventsTable };
//# sourceMappingURL=user-events.table.js.map