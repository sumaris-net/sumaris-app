import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { AccountService, AppTable, chainPromises, EntitiesStorage, EntitiesTableDataSource, isEmptyArray, isNotNil, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, toBoolean } from '@sumaris-net/ngx-components';
import { Trip } from '../trip.model';
import { TripService } from '../trip.service';
import { TripFilter } from '../trip.filter';
import { UntypedFormBuilder } from '@angular/forms';
import { environment } from '@environments/environment';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
let TripTrashModal = class TripTrashModal extends AppTable {
    constructor(injector, accountService, service, entities, trashRemoteService, formBuilder, cd) {
        super(injector, RESERVED_START_COLUMNS
            .concat([
            'updateDate',
            'program',
            'vessel',
            'departureLocation',
            'departureDateTime',
            'returnDateTime',
            'observers',
            'comments'
        ])
            .concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(Trip, service, null, {
            prependNewElements: false,
            suppressErrors: environment.production,
            saveOnlyDirtyRows: true,
            readOnly: true,
            watchAllOptions: {
                trash: true
            }
        }), null // Filter
        );
        this.accountService = accountService;
        this.service = service;
        this.entities = entities;
        this.trashRemoteService = trashRemoteService;
        this.formBuilder = formBuilder;
        this.cd = cd;
        this.i18nColumnPrefix = 'TRIP.TABLE.';
        this.readOnly = true;
        this.inlineEdition = false;
        this.confirmBeforeDelete = true;
        this.saveBeforeSort = false;
        this.saveBeforeFilter = false;
        this.saveBeforeDelete = false;
        this.autoLoad = false;
        this.defaultSortBy = 'updateDate';
        this.defaultSortDirection = 'desc';
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    get isOfflineMode() {
        return !this.synchronizationStatus || this.synchronizationStatus !== 'SYNC';
    }
    get isOnlineMode() {
        return !this.isOfflineMode;
    }
    ngOnInit() {
        super.ngOnInit();
        this.showIdColumn = toBoolean(this.showIdColumn, this.accountService.isAdmin());
        this.canDelete = this.isOnlineMode && this.accountService.isAdmin();
        this.displayedAttributes = {
            vesselSnapshot: this.settings.getFieldDisplayAttributes('vesselSnapshot'),
            location: this.settings.getFieldDisplayAttributes('location')
        };
        const filter = TripFilter.fromObject(Object.assign(Object.assign({}, this.filter), { synchronizationStatus: this.synchronizationStatus }));
        this.setFilter(filter, { emitEvent: true });
    }
    ngOnDestroy() {
        super.ngOnDestroy();
    }
    closeAndRestore(event, rows) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.restore(event, rows);
            if (isEmptyArray(data))
                return; // User cancelled
            return this.close(null, data);
        });
    }
    restore(event, rows) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // Skip
            const confirm = yield this.askRestoreConfirmation();
            if (!confirm)
                return;
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            this.markAsLoading();
            try {
                let entities = (rows || []).map(row => row.currentData).filter(isNotNil);
                if (isEmptyArray(entities))
                    return; // Skip
                // If online: get trash data full content
                if (this.isOnlineMode) {
                    entities = (yield chainPromises(entities.map(e => () => this.trashRemoteService.load('Trip', e.id))))
                        .map(Trip.fromObject);
                }
                // Copy locally
                entities = yield this.service.copyAllLocally(entities, {
                    deletedFromTrash: this.isOfflineMode,
                    displaySuccessToast: false
                });
                // Deselect rows
                this.selection.deselect(...rows);
                // Success toast
                setTimeout(() => {
                    this.showToast({
                        type: 'info',
                        message: rows.length === 1 ?
                            'TRIP.TRASH.INFO.ONE_TRIP_RESTORED' :
                            'TRIP.TRASH.INFO.MANY_TRIPS_RESTORED'
                    });
                }, 200);
                return entities;
            }
            catch (err) {
                console.error(err && err.message || err, err);
                this.error = err && err.message || err;
                return;
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    toggleRow(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event && event.defaultPrevented)
                return; // Skip
            if (this.selection.isEmpty()) {
                this.selection.select(row);
            }
            else if (!this.selection.isSelected(row)) {
                if (!event.ctrlKey) {
                    this.selection.clear();
                }
                this.selection.select(row);
            }
            else {
                this.selection.toggle(row);
            }
            return true;
        });
    }
    close(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modalCtrl.dismiss(data);
        });
    }
    cancel(event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modalCtrl.dismiss(null, 'cancel');
        });
    }
    cleanLocalTrash(event, confirm) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!confirm) {
                confirm = yield this.askDeleteConfirmation(event);
                if (!confirm)
                    return; // skip
            }
            console.debug('[trip-trash] Cleaning the trash...');
            yield this.entities.clearTrash(Trip.TYPENAME);
            yield this.close();
            // Success toast
            setTimeout(() => {
                this.showToast({
                    type: 'info',
                    message: 'TRIP.TRASH.INFO.LOCAL_TRASH_CLEANED'
                });
            }, 200);
        });
    }
    cleanRemoteTrash(event, rows) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // Skip
            if (!(yield this.askRestoreConfirmation(event)))
                return; // User cancelled
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            this.markAsLoading();
            try {
                const remoteIds = rows.map(row => row.currentData)
                    .map(trip => trip.id)
                    .filter(id => isNotNil(id) && id >= 0);
                if (isEmptyArray(remoteIds))
                    return; // Skip if no remote ids
                yield this.trashRemoteService.deleteAll(Trip.ENTITY_NAME, remoteIds);
                // Unselect rows, then refresh
                this.selection.deselect(...rows);
                this.onRefresh.emit();
            }
            catch (err) {
                console.error(err && err.message || err, err);
                this.error = err && err.message || err;
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    /* -- protected method -- */
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], TripTrashModal.prototype, "showIdColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], TripTrashModal.prototype, "synchronizationStatus", void 0);
TripTrashModal = __decorate([
    Component({
        selector: 'app-trip-trash-modal',
        templateUrl: './trip-trash.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        TripService,
        EntitiesStorage,
        TrashRemoteService,
        UntypedFormBuilder,
        ChangeDetectorRef])
], TripTrashModal);
export { TripTrashModal };
//# sourceMappingURL=trip-trash.modal.js.map