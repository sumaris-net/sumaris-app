import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector, Input } from '@angular/core';
import { Observable } from 'rxjs';
import { UntypedFormBuilder } from '@angular/forms';
import { Alerts, AppFormUtils, Entity, filterNotNil, firstNotNilPromise, firstTrue, InMemoryEntitiesService, isNil, isNotEmptyArray, isNotNil, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, toNumber, } from '@sumaris-net/ngx-components';
import { MeasurementValuesUtils } from './measurement.model';
import { PMFM_ID_REGEXP, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { mergeMap } from 'rxjs/operators';
import { AppBaseTable } from '@app/shared/table/base.table';
import { MeasurementsTableEntitiesService } from './measurements-table.service';
import { MeasurementsTableValidatorService } from './measurements-table.validator';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
let BaseMeasurementsTable = class BaseMeasurementsTable extends AppBaseTable {
    constructor(injector, dataType, filterType, dataService, validatorService, options) {
        var _a, _b, _c;
        super(injector, dataType, filterType, 
        // Columns:
        ((options === null || options === void 0 ? void 0 : options.reservedStartColumns) || []).concat((options === null || options === void 0 ? void 0 : options.reservedEndColumns) || []), 
        // Use a decorator data service
        new MeasurementsTableEntitiesService(injector, dataType, dataService, {
            mapPmfms: (options === null || options === void 0 ? void 0 : options.mapPmfms) || undefined,
            requiredStrategy: (_a = options === null || options === void 0 ? void 0 : options.initialState) === null || _a === void 0 ? void 0 : _a.requiredStrategy,
            requiredGear: (_b = options === null || options === void 0 ? void 0 : options.initialState) === null || _b === void 0 ? void 0 : _b.requiredGear,
            debug: (options === null || options === void 0 ? void 0 : options.debug) || false,
        }), 
        // Use a specific decorator validator
        validatorService ? new MeasurementsTableValidatorService(injector, validatorService) : null, Object.assign(Object.assign({}, options), { 
            // IMPORTANT: Always use our private function onRowCreated()
            onRowCreated: (row) => this._onRowCreated(row) }));
        this._autoLoadAfterPmfm = true;
        this._addingRow = false;
        this.i18nPmfmPrefix = null;
        /**
         * Allow to override the rankOrder. See physical-gear, on ADAP program
         */
        this.canEditRankOrder = false;
        this.memoryDataService = dataService instanceof InMemoryEntitiesService ? dataService : null;
        this.programRefService = injector.get(ProgramRefService);
        this.pmfmNamePipe = injector.get(PmfmNamePipe);
        this.formBuilder = injector.get(UntypedFormBuilder);
        this.defaultPageSize = -1; // Do not use paginator
        this.hasRankOrder = Object.getOwnPropertyNames(new dataType()).findIndex((key) => key === 'rankOrder') !== -1;
        this.markAsLoaded({ emitEvent: false });
        this.i18nPmfmPrefix = options === null || options === void 0 ? void 0 : options.i18nPmfmPrefix;
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        this.canEdit = true;
        this._state.hold(this._state.select(['programLabel', 'acquisitionLevel', 'requiredStrategy', 'strategyId', 'strategyLabel', 'requiredGear', 'gearId'], s => s), (state) => this._dataService.set(state));
        const requiredGear = ((_c = options === null || options === void 0 ? void 0 : options.initialState) === null || _c === void 0 ? void 0 : _c.requiredGear) === true;
        this._state.set(Object.assign({ strategyId: null, strategyLabel: null, gearId: null, requiredGear }, options === null || options === void 0 ? void 0 : options.initialState));
        // connect
        this._state.connect('pmfms', this._dataService.pmfms$);
        this._state.hold(this.pmfms$, (pmfms) => {
            this._dataService.pmfms = pmfms;
            this.hasPmfms = isNotEmptyArray(pmfms);
        });
        // For DEV only
        //this.debug = !environment.production;
        this.logPrefix = '[measurements-table] ';
    }
    set showCommentsColumn(value) {
        this.setShowColumn('comments', value);
    }
    get showCommentsColumn() {
        return this.getShowColumn('comments');
    }
    set dataService(value) {
        if (this._dataService.delegate !== value) {
            console.warn("TODO: check if 'get dataService()' is need", new Error());
            this._dataService.delegate = value;
            if (!this.loading) {
                this.onRefresh.emit('new dataService');
            }
        }
    }
    get dataService() {
        return this._dataService.delegate;
    }
    get loading() {
        return super.loading || this._dataService.loading;
    }
    get loaded() {
        return super.loaded && !this._dataService.loading;
    }
    ngOnInit() {
        // Remember the value of autoLoad, but force to false, to make sure pmfm will be loaded before
        this._autoLoadAfterPmfm = this.autoLoad;
        this.autoLoad = false;
        this.i18nPmfmPrefix = this.i18nPmfmPrefix || this.i18nColumnPrefix;
        this.keepEditedRowOnSave =
            !this.mobile &&
                this.inlineEdition &&
                // Disable keepEditedRowOnSave, when in memory data service, because rows are reload twice after save - FIXME
                !this.memoryDataService;
        this.registerSubscription(firstTrue(this.readySubject)
            .pipe(mergeMap((_) => {
            console.debug(this.logPrefix + 'Starting measurements data service...');
            return this._dataService.start();
        }))
            .subscribe());
        super.ngOnInit();
        this.registerSubscription(filterNotNil(this.pmfms$).subscribe((pmfms) => {
            console.debug(this.logPrefix + 'Received PMFMs to applied: ', pmfms);
            if (this.validatorService) {
                this.configureValidator({ pmfms });
                this.validatorService.markAsReady();
            }
            // Update the settings id, as program could have changed
            this.settingsId = this.generateTableId();
            // Add pmfm columns
            this.updateColumns();
            // Load (if autoLoad was enabled)
            if (this._autoLoadAfterPmfm) {
                this.onRefresh.emit();
                this._autoLoadAfterPmfm = false; // Avoid new execution
            }
            // Or reload, only if pristine (to avoid to lost not saved data)
            else if (this.dataSource.loaded && !this.dirty) {
                this.onRefresh.emit();
            }
        }));
        // Listen row edition
        if (this.inlineEdition) {
            this.registerSubscription(this.onStartEditingRow.subscribe((row) => this._onRowEditing(row)));
        }
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        (_a = this._dataService) === null || _a === void 0 ? void 0 : _a.stop();
    }
    configureValidator(opts) {
        // make sure to confirm editing row, before to change validator
        this.confirmEditCreate();
        // Update validator config
        if (opts) {
            this.validatorService.measurementsOptions = opts;
        }
    }
    setFilter(filterData, opts) {
        opts = opts || { emitEvent: !this.loading };
        super.setFilter(filterData, opts);
    }
    trackByFn(index, row) {
        return row.id;
    }
    generateTableId() {
        // Append the program, if any
        return [super.generateTableId(), this.programLabel].filter(isNotNil).join('-');
    }
    getDisplayColumns() {
        const pmfms = this.pmfms;
        if (!pmfms)
            return this.columns;
        const userColumns = this.getUserColumns();
        const pmfmColumnNames = pmfms
            //.filter(p => p.isMandatory || !userColumns || userColumns.includes(p.pmfmId.toString()))
            .filter((p) => !p.hidden)
            .map((p) => p.id.toString());
        const startColumns = ((this.options && this.options.reservedStartColumns) || []).filter((c) => !userColumns || userColumns.includes(c));
        const endColumns = ((this.options && this.options.reservedEndColumns) || []).filter((c) => !userColumns || userColumns.includes(c));
        return (RESERVED_START_COLUMNS.concat(startColumns)
            .concat(pmfmColumnNames)
            .concat(endColumns)
            .concat(RESERVED_END_COLUMNS)
            // Remove columns to hide
            .filter((column) => !this.excludesColumns.includes(column)));
        // DEBUG
        //console.debug("[measurement-table] Updating columns: ", this.displayedColumns)
        //if (!this.loading) this.markForCheck();
    }
    setShowColumn(columnName, show) {
        super.setShowColumn(columnName, show, { emitEvent: false });
        if (!this.loading)
            this.updateColumns();
    }
    ready(opts) {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            opts = Object.assign({ stop: this.destroySubject }, opts);
            yield Promise.all([_super.ready.call(this, opts), this.validatorService ? this.validatorService.ready(opts) : firstNotNilPromise(this.pmfms$, opts)]);
        });
    }
    /**
     * Use in ngFor, for trackBy
     *
     * @param index
     * @param pmfm
     */
    trackPmfmFn(index, pmfm) {
        return toNumber(pmfm === null || pmfm === void 0 ? void 0 : pmfm.id, index);
    }
    translateControlPath(path) {
        if (path.startsWith('measurementValues.')) {
            const pmfmId = parseInt(path.split('.')[1]);
            const pmfm = (this.pmfms || []).find((p) => p.id === pmfmId);
            if (pmfm)
                return PmfmUtils.getPmfmName(pmfm);
        }
        return super.translateControlPath(path);
    }
    /**
     * Convert (or clone) a row currentData, into <T> instance (that extends Entity)
     *
     * @param row
     * @param clone
     */
    toEntity(row, clone) {
        // If no validator, use currentData
        const currentData = row.currentData;
        // Already an entity (e.g. when no validator used): use it
        if (currentData instanceof Entity) {
            return (currentData && clone === true ? currentData.clone() : currentData);
        }
        // If JSON object (e.g. when using validator): create a new entity
        else {
            const target = new this.dataType();
            target.fromObject(currentData);
            return target;
        }
    }
    duplicateRow(event, row, opts) {
        const skipProperties = (opts && opts.skipProperties) || ['id', 'rankOrder', 'updateDate', 'creationDate', 'label'].concat(this.hasRankOrder ? ['rankOrder'] : []);
        return super.duplicateRow(event, row, Object.assign(Object.assign({}, opts), { skipProperties }));
    }
    waitIdle(opts) {
        const _super = Object.create(null, {
            waitIdle: { get: () => super.waitIdle }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                _super.waitIdle.call(this, opts),
                // Waiting PMFMS to be loaded
                this._dataService.waitIdle(opts),
            ]);
        });
    }
    /* -- protected methods -- */
    updateColumns() {
        if (!this.pmfms)
            return; // skip
        super.updateColumns();
    }
    // Can be override by subclass
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.onNewEntity.call(this, data);
            if (this.hasRankOrder && isNil(data.rankOrder)) {
                data.rankOrder = (yield this.getMaxRankOrder()) + 1;
            }
        });
    }
    getMaxRankOrder() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
        });
    }
    existsRankOrder(rankOrder, excludedRows) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows.some((row) => (!excludedRows || !excludedRows.includes(row)) && row.currentData.rankOrder === rankOrder);
        });
    }
    canAddEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Before using the given rankOrder, check if not already exists
            if (this.canEditRankOrder && isNotNil(data.rankOrder)) {
                if (yield this.existsRankOrder(data.rankOrder)) {
                    const message = this.translate.instant('TRIP.MEASUREMENT.ERROR.DUPLICATE_RANK_ORDER', data);
                    yield Alerts.showError(message, this.alertCtrl, this.translate);
                    return false;
                }
            }
            return true;
        });
    }
    canUpdateEntity(data, row) {
        return __awaiter(this, void 0, void 0, function* () {
            // Before using the given rankOrder, check if not already exists
            if (this.canEditRankOrder && isNotNil(data.rankOrder)) {
                if (yield this.existsRankOrder(data.rankOrder, [row])) {
                    const message = this.translate.instant('TRIP.MEASUREMENT.ERROR.DUPLICATE_RANK_ORDER', data);
                    yield Alerts.showError(message, this.alertCtrl, this.translate);
                    return false;
                }
            }
            return true;
        });
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
            // Check entity can be added
            const canAdd = yield this.canAddEntity(data);
            if (!canAdd) {
                console.warn(this.logPrefix + 'Cannot add entity to table');
                return undefined;
            }
            if (this._addingRow) {
                console.warn(this.logPrefix + 'Skipping addEntityToTable(). Another add is in progress.');
                return;
            }
            this._addingRow = true;
            try {
                // Create a row
                const row = yield this.addRowToTable(null, { editing: opts === null || opts === void 0 ? void 0 : opts.editing, emitEvent: opts === null || opts === void 0 ? void 0 : opts.emitEvent });
                if (!row)
                    throw new Error('Could not add row to table');
                // Override rankOrder (with a computed value)
                if (this.hasRankOrder &&
                    // Do NOT override if can edit it and set
                    (!this.canEditRankOrder || isNil(data.rankOrder))) {
                    data.rankOrder = row.currentData.rankOrder;
                }
                yield this.onNewEntity(data);
                // Adapt measurement values to row
                this.normalizeEntityToRow(data, row);
                // Set row's data
                row.currentData = data;
                if (row.editing) {
                    // Confirm the created row
                    if (!opts || opts.confirmCreate !== false) {
                        if (row.pending) {
                            yield AppFormUtils.waitWhilePending(row.validator);
                        }
                        const confirmed = this.confirmEditCreate(null, row);
                        this.editedRow = confirmed ? null : row /*confirmation failed*/;
                    }
                    // Keep editing
                    else {
                        this.editedRow = row;
                    }
                }
                else if (!opts || opts.emitEvent !== false) {
                    this.markForCheck();
                }
                this.markAsDirty({ emitEvent: false });
                return row;
            }
            catch (err) {
                console.error(this.logPrefix + 'Error in addEntityToTable: ', err);
                throw err;
            }
            finally {
                this._addingRow = false;
            }
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
        return super.updateEntityToTable(data, row, opts);
    }
    getI18nColumnName(columnName) {
        // Try to resolve PMFM column, using the cached pmfm list
        if (PMFM_ID_REGEXP.test(columnName)) {
            const pmfmId = parseInt(columnName);
            const pmfm = (this.pmfms || []).find((p) => p.id === pmfmId);
            if (pmfm)
                return this.getI18nPmfmName(pmfm);
        }
        return super.getI18nColumnName(columnName);
    }
    getI18nPmfmName(pmfm) {
        if (pmfm)
            return this.pmfmNamePipe.transform(pmfm, {
                i18nPrefix: this.i18nPmfmPrefix,
                i18nContext: this.i18nColumnSuffix,
            });
    }
    normalizeEntityToRow(data, row, opts) {
        if (!data)
            return; // skip
        // Adapt entity measurement values to reactive form
        MeasurementValuesUtils.normalizeEntityToForm(data, this.pmfms || [], row.validator, opts);
    }
    /* -- private function -- */
    /**
     * /!\ do NOT override this function. Use onPrepareRowForm instead
     *
     * @param row
     * @private
     */
    _onRowCreated(row) {
        return __awaiter(this, void 0, void 0, function* () {
            // WARN: must be called BEFORE row.validator.patchValue(), to be able to add group's validators
            if (row.validator && this.options.onPrepareRowForm) {
                yield this.options.onPrepareRowForm(row.validator);
            }
            if (this._addingRow)
                return; // Skip if already adding a row (e.g. when calling addEntityToTable)
            this._addingRow = true;
            try {
                const data = row.currentData; // if validator enable, this will call a getter function
                yield this.onNewEntity(data);
                // Normalize measurement values
                this.normalizeEntityToRow(data, row);
                // Set row data
                if (row.validator) {
                    row.validator.patchValue(data);
                }
                else {
                    row.currentData = data;
                }
                this.markForCheck();
            }
            finally {
                this._addingRow = false;
            }
        });
    }
    _onRowEditing(row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (row.id === -1)
                return; // Skip new row, because already processed by onRowCreated()
            if (row.validator && this.options.onPrepareRowForm) {
                yield this.options.onPrepareRowForm(row.validator);
            }
        });
    }
};
__decorate([
    RxStateSelect(),
    __metadata("design:type", Observable)
], BaseMeasurementsTable.prototype, "hasPmfms$", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseMeasurementsTable.prototype, "canEditRankOrder", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], BaseMeasurementsTable.prototype, "programLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], BaseMeasurementsTable.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", String)
], BaseMeasurementsTable.prototype, "strategyLabel", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], BaseMeasurementsTable.prototype, "strategyId", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BaseMeasurementsTable.prototype, "requiredStrategy", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BaseMeasurementsTable.prototype, "requiredGear", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Number)
], BaseMeasurementsTable.prototype, "gearId", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BaseMeasurementsTable.prototype, "showCommentsColumn", null);
__decorate([
    RxStateSelect('pmfms'),
    __metadata("design:type", Observable)
], BaseMeasurementsTable.prototype, "pmfms$", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Array)
], BaseMeasurementsTable.prototype, "pmfms", void 0);
__decorate([
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BaseMeasurementsTable.prototype, "hasPmfms", void 0);
BaseMeasurementsTable = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Function, Object, Object, Object])
], BaseMeasurementsTable);
export { BaseMeasurementsTable };
//# sourceMappingURL=measurements-table.class.js.map