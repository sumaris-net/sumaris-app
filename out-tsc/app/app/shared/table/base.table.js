import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectorRef, Directive, ElementRef, Injector, Input, ViewChild } from '@angular/core';
import { AppTable, changeCaseToUnderscore, EntitiesTableDataSource, EntityUtils, Hotkeys, InMemoryEntitiesService, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, TranslateContextService, } from '@sumaris-net/ngx-components';
import { MatExpansionPanel } from '@angular/material/expansion';
import { environment } from '@environments/environment';
import { filter, first, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PopoverController } from '@ionic/angular';
import { Popovers } from '@app/shared/popover/popover.utils';
import { timer } from 'rxjs';
import { RxStateRegister } from '@app/shared/state/state.decorator';
import { RxState } from '@rx-angular/state';
export const BASE_TABLE_SETTINGS_ENUM = {
    filterKey: 'filter',
    compactRowsKey: 'compactRows',
};
let AppBaseTable = class AppBaseTable extends AppTable {
    constructor(injector, dataType, filterType, columnNames, _dataService, validatorService, options) {
        super(injector, RESERVED_START_COLUMNS.concat(columnNames).concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(dataType, _dataService, validatorService, Object.assign({ prependNewElements: false, restoreOriginalDataOnCancel: false, suppressErrors: environment.production, onRowCreated: (row) => this.onDefaultRowCreated(row) }, options)), null);
        this.injector = injector;
        this.dataType = dataType;
        this.filterType = filterType;
        this._dataService = _dataService;
        this.validatorService = validatorService;
        this.options = options;
        this.logPrefix = null;
        this.canGoBack = false;
        this.showTitle = true;
        this.showToolbar = true;
        this.showPaginator = true;
        this.showFooter = true;
        this.showError = true;
        this.toolbarColor = 'primary';
        this.sticky = false;
        this.stickyEnd = false;
        this.compact = false;
        this.mobile = false;
        this.pressHighlightDuration = 10000; // 10s
        this.filterForm = null;
        this.filterCriteriaCount = 0;
        this.filterPanelFloating = true;
        this.mobile = this.settings.mobile;
        this.hotkeys = injector.get(Hotkeys);
        this.popoverController = injector.get(PopoverController);
        this.i18nColumnPrefix = (options === null || options === void 0 ? void 0 : options.i18nColumnPrefix) || '';
        this.translateContext = injector.get(TranslateContextService);
        this.cd = injector.get(ChangeDetectorRef);
        this.defaultSortBy = 'label';
        this.inlineEdition = !!this.validatorService;
        this.memoryDataService = this._dataService instanceof InMemoryEntitiesService ? this._dataService : null;
        // DEBUG
        this.logPrefix = '[base-table] ';
        this.debug = (options === null || options === void 0 ? void 0 : options.debug) && !environment.production;
    }
    set canEdit(value) {
        this._canEdit = value;
    }
    get canEdit() {
        return this._canEdit && !this.readOnly;
    }
    get filterIsEmpty() {
        return this.filterCriteriaCount === 0;
    }
    markAsPristine(opts) {
        var _a;
        if ((_a = this.memoryDataService) === null || _a === void 0 ? void 0 : _a.dirty)
            return; // Skip if service still dirty
        super.markAsPristine(opts);
    }
    ngOnInit() {
        super.ngOnInit();
        // Propagate dirty state of the in-memory service
        if (this.memoryDataService) {
            this.registerSubscription(this.memoryDataService.dirtySubject.pipe(filter((dirty) => dirty === true && !this.dirty)).subscribe((_) => this.markAsDirty()));
        }
        // Propagate dirty state from the first valueChanges of a row
        if (this.inlineEdition) {
            this.registerSubscription(this.onStartEditingRow
                .pipe(filter((row) => row.id !== -1 && !!row.validator && !this.dirty), switchMap((row) => row.validator.valueChanges.pipe(filter(() => row.dirty), first(), takeUntil(this.onStartEditingRow))))
                .subscribe(() => {
                console.debug(this.logPrefix + 'Mark table as dirty, because row is dirty');
                this.markAsDirty();
            }));
        }
        // Enable permanent selection (to keep selected rows after reloading)
        // (only on desktop, if not already done)
        if (!this.mobile && !this.permanentSelection) {
            this.initPermanentSelection();
        }
        this.restoreCompactMode();
    }
    ngAfterViewInit() {
        var _a;
        super.ngAfterViewInit();
        this.initTableContainer((_a = this.tableContainerRef) === null || _a === void 0 ? void 0 : _a.nativeElement);
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this._state.ngOnDestroy();
    }
    initTableContainer(element) {
        if (!element)
            return; // Skip if already done
        if (!this.mobile) {
            // Add shortcuts
            console.debug(this.logPrefix + 'Add table shortcuts');
            this.registerSubscription(this.hotkeys
                .addShortcut({ keys: 'control.a', element, preventDefault: false /*will prevent default only if no row editing */ })
                .pipe(filter(() => this.canEdit && !this.focusColumn), tap((event) => event === null || event === void 0 ? void 0 : event.preventDefault()), map(() => { var _a; return (_a = this.dataSource) === null || _a === void 0 ? void 0 : _a.getRows(); }), filter(isNotEmptyArray))
                .subscribe((rows) => {
                if (this.isAllSelected()) {
                    this.selection.clear();
                }
                else {
                    this.selection.select(...rows);
                }
                this.markForCheck();
            }));
            this.registerSubscription(this.hotkeys
                .addShortcut({ keys: 'control.shift.+', description: 'COMMON.BTN_ADD', element })
                .pipe(filter((e) => !this.disabled && this.canEdit))
                .subscribe((event) => this.addRow(event)));
        }
    }
    scrollToBottom() {
        if (this.tableContainerRef) {
            // scroll to bottom
            this.tableContainerRef.nativeElement.scroll({
                top: this.tableContainerRef.nativeElement.scrollHeight,
            });
        }
    }
    setFilter(filter, opts) {
        filter = this.asFilter(filter);
        // Update criteria count
        const criteriaCount = this.countNotEmptyCriteria(filter);
        if (criteriaCount !== this.filterCriteriaCount) {
            this.filterCriteriaCount = criteriaCount;
            this.markForCheck();
        }
        // Update the form content
        if (this.filterForm && (!opts || opts.emitEvent !== false)) {
            this.filterForm.patchValue(filter.asObject(), { emitEvent: false });
        }
        super.setFilter(filter, opts);
    }
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    applyFilterAndClosePanel(event) {
        const filter = this.filterForm.value;
        this.setFilter(filter, { emitEvent: false });
        this.onRefresh.emit(event);
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
    }
    closeFilterPanel() {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
    }
    resetFilter(value, opts) {
        this.filterForm.reset(value, opts);
        this.setFilter(value || null, opts);
        this.filterCriteriaCount = 0;
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
    }
    clickRow(event, row) {
        if (!this.inlineEdition)
            this.highlightedRowId = row === null || row === void 0 ? void 0 : row.id;
        //console.debug('[base-table] click row');
        return super.clickRow(event, row);
    }
    pressRow(event, row) {
        if (!this.mobile)
            return; // Skip if inline edition, or not mobile
        event === null || event === void 0 ? void 0 : event.preventDefault();
        // Toggle row selection
        this.selection.toggle(row);
        // Unselect after 4s
        if (this.pressHighlightDuration > 0) {
            if (this.selection.isSelected(row)) {
                // Highlight the row (only for the first row selected)
                if (this.singleSelectedRow === row) {
                    this.highlightedRowId = row.id;
                }
                timer(this.pressHighlightDuration)
                    .pipe(
                //takeUntil(this.selection.changed),
                takeUntil(this.destroySubject), first())
                    .subscribe(() => {
                    // Row is still highlighted: remove highlight
                    if (this.highlightedRowId === row.id) {
                        this.highlightedRowId = null;
                    }
                    // Unselect, if only this row is selected
                    if (this.selection.isSelected(row) && this.selection.selected.length === 1) {
                        this.selection.deselect(row);
                    }
                    this.markForCheck();
                });
            }
            else {
                // Remove highlight
                if (this.highlightedRowId === row.id) {
                    this.highlightedRowId = null;
                }
            }
        }
        this.markForCheck();
    }
    addOrUpdateEntityToTable(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Always try to get the row, even if no ID, because the row can exists (e.g. in memory table)
            // THis find should use a equals() function
            const row = yield this.findRowByEntity(data);
            if (!row) {
                yield this.addEntityToTable(data, opts && { confirmCreate: opts.confirmEditCreate });
            }
            else {
                yield this.updateEntityToTable(data, row, opts && { confirmEdit: opts.confirmEditCreate });
            }
        });
    }
    /**
     * Say if the row can be added. Useful to check unique constraints, and warn user
     * is.s physical gear table can check is the rankOrder
     *
     * @param data
     * @protected
     */
    canAddEntity(data) {
        return Promise.resolve(true);
    }
    canAddEntities(data) {
        return Promise.resolve(true);
    }
    canUpdateEntity(data, row) {
        return Promise.resolve(true);
    }
    /**
     * Insert an entity into the table. This can be useful when entity is created by a modal (e.g. BatchGroupTable).
     *
     * If hasRankOrder=true, then rankOrder is computed only once.
     * Will call method normalizeEntityToRow().
     * The new row will be the edited row.
     *
     * @param data the entity to insert.
     * @param opts
     */
    addEntityToTable(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                throw new Error('Missing data to add');
            if (this.debug)
                console.debug('[measurement-table] Adding new entity', data);
            // Check entity can be added
            const canAdd = yield this.canAddEntity(data);
            if (!canAdd)
                return undefined;
            // Create a row
            const row = yield this.addRowToTable(null, { editing: opts === null || opts === void 0 ? void 0 : opts.editing });
            if (!row)
                throw new Error('Could not add row to table');
            // Adapt measurement values to row
            this.normalizeEntityToRow(data, row);
            // Affect new row
            if (row.validator) {
                row.validator.patchValue(data);
                row.validator.markAsDirty();
            }
            else {
                row.currentData = data;
            }
            // Confirm the created row
            if (row.editing && (!opts || opts.confirmCreate !== false)) {
                const confirmed = this.confirmEditCreate(null, row);
                if (confirmed)
                    this.editedRow = null; // Forget the edited row
            }
            else {
                this.editedRow = row;
            }
            this.markAsDirty();
            return row;
        });
    }
    onNewEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Can be overrided by subclasses
        });
    }
    addEntitiesToTable(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                throw new Error('Missing data to add');
            if (this.debug)
                console.debug('[measurement-table] Adding new entities', data);
            // Check entity can be added
            const canAdd = yield this.canAddEntities(data);
            if (!canAdd)
                return undefined;
            // Prepare entities
            yield Promise.all(data.map((entity) => this.onNewEntity(entity)));
            // Bulk add
            const rows = yield this.dataSource.addMany(data, null, opts);
            if (!rows)
                throw new Error('Failed to add entities to table');
            this.totalRowCount += rows.length;
            this.visibleRowCount += rows.length;
            if (rows.length !== data.length)
                throw new Error('Not all entities has been added to table');
            rows.map((row, index) => {
                const entity = data[index];
                // Adapt measurement values to row
                this.normalizeEntityToRow(entity, row);
                // Affect new row
                if (row.validator) {
                    row.validator.patchValue(entity);
                    row.validator.markAsDirty();
                }
                else {
                    row.currentData = entity;
                }
            });
            this.markAsDirty();
            return rows;
        });
    }
    /**
     * Update an row, using the given entity. Useful when entity is updated using a modal (e.g. BatchGroupModal)
     *
     * The updated row will be the edited row.
     * Will call method normalizeEntityToRow()
     *
     * @param data the input entity
     * @param row the row to update
     * @param opts
     */
    updateEntityToTable(data, row, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || !row)
                throw new Error('Missing data, or table row to update');
            if (this.debug)
                console.debug('[measurement-table] Updating entity to an existing row', data);
            const canUpdate = yield this.canUpdateEntity(data, row);
            if (!canUpdate)
                return undefined;
            // Adapt measurement values to row
            this.normalizeEntityToRow(data, row);
            // Affect new row
            if (row.validator) {
                row.validator.patchValue(data);
                row.validator.markAsDirty();
            }
            else {
                row.currentData = data;
            }
            // Confirm the created row
            if (!opts || opts.confirmEdit !== false) {
                this.confirmEditCreate(null, row);
                this.editedRow = null;
            }
            else if (this.inlineEdition) {
                this.editedRow = row;
            }
            this.markAsDirty();
            return row;
        });
    }
    deleteEntity(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.findRowByEntity(data);
            // Row not exists: OK
            if (!row)
                return true;
            const confirmed = yield this.canDeleteRows([row]);
            if (!confirmed)
                return false;
            const deleted = yield this.deleteRow(null, row, { interactive: false /*already confirmed*/ });
            if (!deleted)
                event === null || event === void 0 ? void 0 : event.preventDefault(); // Mark as cancelled
            return deleted;
        });
    }
    /* -- protected function -- */
    restoreFilterOrLoad(opts) {
        this.markAsLoading();
        const sources = (opts === null || opts === void 0 ? void 0 : opts.sources) || ['settings', 'queryParams'];
        const json = sources
            .map((source) => {
            switch (source) {
                case 'settings':
                    if (isNilOrBlank(this.settingsId))
                        return;
                    console.debug(this.logPrefix + 'Restoring filter from settings...');
                    return this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.filterKey);
                case 'queryParams':
                    const { q } = this.route.snapshot.queryParams;
                    if (q) {
                        console.debug(this.logPrefix + 'Restoring filter from route query param: ', q);
                        try {
                            return JSON.parse(q);
                        }
                        catch (err) {
                            console.error(this.logPrefix + 'Failed to parse route query param: ' + q, err);
                        }
                    }
                    break;
            }
            return null;
        })
            .find(isNotNil);
        if (json) {
            this.setFilter(json, opts);
        }
        else if (!opts || opts.emitEvent !== false) {
            this.onRefresh.emit();
        }
    }
    restoreCompactMode() {
        if (!this.compact && this.settingsId) {
            const compact = this.settings.getPageSettings(this.settingsId, BASE_TABLE_SETTINGS_ENUM.compactRowsKey) || false;
            if (this.compact !== compact) {
                this.compact = compact;
                this.markForCheck();
            }
        }
    }
    toggleCompactMode() {
        this.compact = !this.compact;
        this.markForCheck();
        this.settings.savePageSetting(this.settingsId, this.compact, BASE_TABLE_SETTINGS_ENUM.compactRowsKey);
    }
    openCommentPopover(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            const placeholder = this.translate.instant('REFERENTIAL.COMMENTS');
            const { data } = yield Popovers.showText(this.popoverController, event, {
                editing: this.inlineEdition && this.enabled,
                autofocus: this.enabled,
                multiline: true,
                text: row.currentData.comments,
                placeholder,
            });
            // User cancel
            if (isNil(data) || this.disabled)
                return;
            if (this.inlineEdition) {
                if (row.validator) {
                    row.validator.patchValue({ comments: data });
                    row.validator.markAsDirty();
                }
                else {
                    row.currentData.comments = data;
                }
            }
        });
    }
    /* -- protected functions -- */
    onDefaultRowCreated(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (row.validator) {
                row.validator.patchValue(this.defaultNewRowValue());
            }
            else {
                Object.assign(row.currentData, this.defaultNewRowValue());
            }
            // Start row edition
            if (this.inlineEdition)
                this.clickRow(undefined, row);
            this.scrollToBottom();
        });
    }
    defaultNewRowValue() {
        return {};
    }
    asFilter(source) {
        const target = new this.filterType();
        if (source)
            target.fromObject(source);
        return target;
    }
    countNotEmptyCriteria(filter) {
        return (filter === null || filter === void 0 ? void 0 : filter.countNotEmptyCriteria()) || 0;
    }
    asEntity(source) {
        if (EntityUtils.isEntity(source))
            return source;
        const target = new this.dataType();
        if (source)
            target.fromObject(source);
        return target;
    }
    findRowByEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                throw new Error('Missing argument data');
            // Make sure using an entity class, to be able to use equals()
            data = this.asEntity(data);
            return this.dataSource.getRows().find((r) => data.equals(r.currentData));
        });
    }
    normalizeEntityToRow(data, row, opts) {
        // Can be override by subclasses
    }
    /**
     * Delegate equals to the entity class, instead of simple ID comparison
     *
     * @param d1
     * @param d2
     * @protected
     */
    equals(d1, d2) {
        if (d1)
            return this.asEntity(d1).equals(d2);
        if (d2)
            return this.asEntity(d2).equals(d1);
        return false;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    getI18nColumnName(columnName) {
        if (this.i18nColumnSuffix) {
            return this.translateContext.instant((this.i18nColumnPrefix || '') + changeCaseToUnderscore(columnName).toUpperCase(), this.i18nColumnSuffix);
        }
        else {
            return super.getI18nColumnName(columnName);
        }
    }
};
__decorate([
    RxStateRegister(),
    __metadata("design:type", RxState)
], AppBaseTable.prototype, "_state", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "canGoBack", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "showTitle", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "showFooter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AppBaseTable.prototype, "toolbarColor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "sticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "stickyEnd", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "compact", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppBaseTable.prototype, "pressHighlightDuration", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], AppBaseTable.prototype, "highlightedRowId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AppBaseTable.prototype, "canEdit", null);
__decorate([
    ViewChild('tableContainer', { read: ElementRef }),
    __metadata("design:type", ElementRef)
], AppBaseTable.prototype, "tableContainerRef", void 0);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], AppBaseTable.prototype, "filterExpansionPanel", void 0);
AppBaseTable = __decorate([
    Directive(),
    __metadata("design:paramtypes", [Injector, Function, Function, Array, Object, Object, Object])
], AppBaseTable);
export { AppBaseTable };
//# sourceMappingURL=base.table.js.map