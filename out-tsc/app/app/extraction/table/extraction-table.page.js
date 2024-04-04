import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { BehaviorSubject, EMPTY, merge, Subject } from 'rxjs';
import { Alerts, DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS, firstNotNilPromise, isNil, isNilOrBlank, isNotNil, isNotNilOrBlank, SETTINGS_DISPLAY_COLUMNS, sleep, StatusIds, TableSelectColumnsComponent, } from '@sumaris-net/ngx-components';
import { TableDataSource } from '@e-is/ngx-material-table';
import { ExtractionCategories, ExtractionFilterCriterion, ExtractionRow, ExtractionType, ExtractionTypeCategory, ExtractionTypeUtils, } from '../type/extraction-type.model';
import { debounceTime, filter, map, throttleTime } from 'rxjs/operators';
import { DEFAULT_CRITERION_OPERATOR, ExtractionAbstractPage } from '../common/extraction-abstract.page';
import { MatTable } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ProductService } from '@app/extraction/product/product.service';
import { ExtractionProduct } from '@app/extraction/product/product.model';
import { ExtractionTypeService } from '@app/extraction/type/extraction-type.service';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { RxState } from '@rx-angular/state';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { ExtractionUtils } from '@app/extraction/common/extraction.utils';
let ExtractionTablePage = class ExtractionTablePage extends ExtractionAbstractPage {
    constructor(injector, state, productService, programRefService, extractionTypeService, cd) {
        super(injector, state);
        this.productService = productService;
        this.programRefService = programRefService;
        this.extractionTypeService = extractionTypeService;
        this.cd = cd;
        this.stopSubject = new Subject();
        this.$programLabel = this._state.select('programLabel');
        this.$programs = this._state.select('programs');
        this.$program = this._state.select('program');
        this.$categories = this._state.select('categories');
        this.$enableTripReport = this._state.select('enableTripReport');
        this.defaultPageSize = DEFAULT_PAGE_SIZE;
        this.defaultPageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS;
        this.cacheDuration = null; // = default
        this.$title = new BehaviorSubject('EXTRACTION.TABLE.TITLE');
        this.$columns = new BehaviorSubject(undefined);
        this.canCreateProduct = false;
        this.isAdmin = false;
        this.filterPanelFloating = true;
        this.stickyEnd = true;
        this.autoload = true;
        this.embedded = false;
        this.showToolbar = true;
        this.showFilter = true;
        this.showDownloadButton = true;
        this.displayedColumns = [];
        this.dataSource = new TableDataSource([], ExtractionRow);
        this.isAdmin = this.accountService.isAdmin();
        this.stickyEnd = !this.mobile;
    }
    set programLabel(value) {
        this._state.set('programLabel', (_) => value);
    }
    get programLabel() {
        var _a;
        return this._state.get('programLabel') || ((_a = this.program) === null || _a === void 0 ? void 0 : _a.label);
    }
    set program(value) {
        this._state.set('program', (_) => value);
    }
    get program() {
        return this._state.get('program');
    }
    set enableTripReport(value) {
        this._state.set('enableTripReport', (_) => value);
    }
    get enableTripReport() {
        return this._state.get('enableTripReport');
    }
    get filterChanges() {
        return this.criteriaForm.form.valueChanges
            .pipe(
        //debounceTime(450),
        map(_ => this.getFilterValue()));
    }
    ngOnInit() {
        var _a, _b;
        super.ngOnInit();
        // If the user changes the sort order, reset back to the first page.
        if (this.sort && this.paginator) {
            this.registerSubscription(this.sort.sortChange.subscribe(() => this.paginator.pageIndex = 0));
        }
        this.registerSubscription(merge(this.onRefresh, ((_a = this.sort) === null || _a === void 0 ? void 0 : _a.sortChange) || EMPTY, ((_b = this.paginator) === null || _b === void 0 ? void 0 : _b.page) || EMPTY)
            .pipe(debounceTime(100), throttleTime(500) // Need because of 'this.paginator.pageIndex = 0' later
        )
            .subscribe(() => {
            if (isNil(this.type))
                return; // Skip if no type
            // If already loading: skip
            if (this.loading) {
                // Warn user that he should wait
                if (this.started && !this.embedded)
                    this.showToast({ type: 'warning', message: 'EXTRACTION.INFO.PLEASE_WAIT_WHILE_RUNNING' });
                return;
            }
            // Reset paginator if filter change
            if (this.paginator && this.paginator.pageIndex > 0 && this.dirty) {
                this.paginator.pageIndex = 0;
            }
            if (!this.started) {
                console.warn('[extraction-table] Service not started: skip refresh event');
                return;
            }
            // Load data
            return this.loadData();
        }));
        this.filterCriteriaCount$ = this.criteriaForm.form.valueChanges
            .pipe(map(_ => this.criteriaForm.criteriaCount));
        this._state.connect('programs', this.programRefService.watchAll(0, 100, 'label', 'asc', {
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            acquisitionLevelLabels: [
                // Acquisition levels used by Trip -> Operation
                AcquisitionLevelCodes.TRIP, AcquisitionLevelCodes.OPERATION, AcquisitionLevelCodes.CHILD_OPERATION,
                // Acquisition levels used by ObservedLocation -> Landing
                AcquisitionLevelCodes.OBSERVED_LOCATION, AcquisitionLevelCodes.LANDING
            ]
        }), (s, { data }) => data);
        this._state.connect('program', this._state.select(['programLabel', 'programs'], res => res)
            .pipe(map(({ programLabel, programs }) => programLabel && (programs || []).find(p => p.label === programLabel) || null)));
        this._state.connect('categories', this.types$
            .pipe(filter(isNotNil), map(ExtractionTypeCategory.fromTypes)));
        this._state.connect('enableTripReport', this._state.select('program')
            .pipe(map(program => (program === null || program === void 0 ? void 0 : program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_ENABLE)) || false)));
        if (this.autoload && !this.embedded) {
            this.loadFromRouteOrSettings();
        }
        else {
            this.markAsLoaded();
        }
    }
    ngOnDestroy() {
        super.ngOnDestroy();
        this.stopSubject.next();
    }
    loadFromRouteOrSettings() {
        const _super = Object.create(null, {
            loadFromRouteOrSettings: { get: () => super.loadFromRouteOrSettings }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const found = yield _super.loadFromRouteOrSettings.call(this);
            if (found)
                return found;
            // Mark as loaded, if not found
            setTimeout(() => this.markAsLoaded());
        });
    }
    updateView(data) {
        const _super = Object.create(null, {
            translateColumns: { get: () => super.translateColumns }
        });
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.data = data;
                // Translate names
                _super.translateColumns.call(this, data.columns);
                // Sort columns, by rankOrder
                this.sortedColumns = data.columns.slice()
                    // Sort by rankOder
                    .sort((col1, col2) => col1.rankOrder - col2.rankOrder);
                this.displayedColumns = this.sortedColumns
                    .map(column => column.columnName)
                    // Remove id
                    .filter(columnName => columnName !== 'id')
                    // Add actions column
                    .concat(['actions']);
                this.$columns.next(data.columns); // WARN: must keep the original column order
                // Update rows
                this.dataSource.updateDatasource(data.rows || []);
                // Update title
                yield this.updateTitle();
                // Wait end of datasource loading
                //await firstFalsePromise(this.dataSource.loadingSubject);
                setTimeout(() => this.updateQueryParams());
            }
            catch (err) {
                console.error('Error while updating the view', err);
            }
            finally {
                this.markAsLoaded({ emitEvent: false });
                this.markAsUntouched({ emitEvent: false });
                this.markAsPristine({ emitEvent: false });
                this.enable({ emitEvent: false });
                this.markForCheck();
            }
        });
    }
    setType(type, opts) {
        const _super = Object.create(null, {
            setType: { get: () => super.setType }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const changed = yield _super.setType.call(this, type, Object.assign(Object.assign({}, opts), { emitEvent: false, skipLocationChange: true }));
            if (changed) {
                this.stopSubject.next(); // Cancelled existing load process
                this.canCreateProduct = this.type && this.accountService.isSupervisor();
                this.resetPaginatorAndSort();
                this.updateTitle();
                // Close the filter panel
                if (this.filterExpansionPanel && this.filterExpansionPanel.expanded) {
                    this.filterExpansionPanel.close();
                }
                // Reset program
                this.resetProgram();
                if (!opts || opts.emitEvent !== false) {
                    this.markAsReady();
                    this.markAsStarted();
                    this.onRefresh.emit();
                }
            }
            return changed;
        });
    }
    setTypeAndProgram(type, programLabel, opts = { emitEvent: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            // Apply type
            yield this.setType(type, { emitEvent: false });
            // Apply filter
            if (this.criteriaForm.sheetName && isNotNilOrBlank(programLabel)) {
                yield this.criteriaForm.setValue([
                    ExtractionFilterCriterion.fromObject({
                        sheetName: this.criteriaForm.sheetName,
                        name: 'project',
                        operator: '=',
                        value: programLabel,
                        hidden: true // Hide
                    }),
                    ExtractionFilterCriterion.fromObject({ operator: '=' })
                ], { emitEvent: false });
            }
            // Apply program label
            this.setProgramLabel(programLabel);
            // Refresh data
            if (!opts || opts.emitEvent !== false) {
                this.markAsReady();
                this.markAsStarted();
                this.onRefresh.emit();
            }
        });
    }
    setSheetName(sheetName, opts) {
        opts = Object.assign({ emitEvent: !this.loading }, opts);
        // Reset sort and paginator
        const resetPaginator = (opts.emitEvent !== false && isNotNil(sheetName) && this.sheetName !== sheetName);
        super.setSheetName(sheetName, opts);
        if (resetPaginator) {
            this.resetPaginatorAndSort();
        }
    }
    setFilterValue(filter, opts) {
        const _super = Object.create(null, {
            setFilterValue: { get: () => super.setFilterValue }
        });
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.service.asFilter(filter);
            // Detect and hide the project (=program) criterion
            let programLabel;
            filter.criteria = (filter.criteria || []).map(criterion => {
                // Detect project field
                if (criterion.name === 'project' && criterion.operator === '=' && isNotNilOrBlank(criterion.value)) {
                    criterion = criterion.clone();
                    // Mark as hidden
                    criterion.hidden = true;
                    // Remember
                    programLabel = criterion.value;
                }
                return criterion;
            });
            // Apply program label
            if (isNotNilOrBlank(programLabel)) {
                this.setProgramLabel(programLabel);
            }
            // Set filter value
            yield _super.setFilterValue.call(this, filter, opts);
        });
    }
    resetPaginatorAndSort() {
        if (this.sort)
            this.sort.active = undefined;
        if (this.paginator)
            this.paginator.pageIndex = 0;
    }
    openSelectColumnsModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = this.sortedColumns
                .map((column) => ({
                name: column.columnName,
                label: column.name,
                visible: this.displayedColumns.indexOf(column.columnName) !== -1
            }));
            const modal = yield this.modalCtrl.create({
                component: TableSelectColumnsComponent,
                componentProps: { columns }
            });
            // On dismiss
            modal.onDidDismiss()
                .then(res => {
                if (!res)
                    return; // CANCELLED
                // Apply columns
                this.displayedColumns = (columns && columns.filter(c => c.visible).map(c => c.name) || [])
                    // Add actions column
                    .concat(['actions']);
                // Update local settings
                return this.settings.savePageSetting(this.settingsId, this.displayedColumns, SETTINGS_DISPLAY_COLUMNS);
            });
            return modal.present();
        });
    }
    onCellValueClick(event, column, value) {
        if (!this.showFilter)
            return; // Skip if cannot filter
        const hasChanged = this.criteriaForm.addFilterCriterion({
            name: column.columnName,
            operator: DEFAULT_CRITERION_OPERATOR,
            value,
            sheetName: this.sheetName
        }, {
            appendValue: event.ctrlKey
        });
        if (!hasChanged)
            return;
        const openExpansionPanel = this.filterExpansionPanel && !this.filterExpansionPanel.expanded;
        if (openExpansionPanel) {
            this.filterExpansionPanel.open();
        }
        if (!event.ctrlKey) {
            this.onRefresh.emit();
            if (openExpansionPanel) {
                setTimeout(() => this.filterExpansionPanel.close(), 500);
            }
        }
    }
    aggregateAndSave(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.type || !this.canCreateProduct)
                return; // Skip
            this.markAsLoading();
            this.error = null;
            const filter = this.getFilterValue();
            this.disable();
            try {
                console.info('[extraction-table] Aggregating and saving as new product...');
                // Compute format, label and name
                const parentFormat = this.type.format.toUpperCase();
                const format = parentFormat.startsWith('AGG_') ? parentFormat : `AGG_${parentFormat}`;
                const [label, name] = yield Promise.all([
                    this.productService.computeNextLabel(format, this.types),
                    this.computeNextProductName(format)
                ]);
                const entity = ExtractionProduct.fromObject({
                    label,
                    name,
                    format,
                    isSpatial: this.type.isSpatial,
                    parent: this.type.id >= 0 ? ExtractionTypeUtils.minify(this.type) : null
                });
                // Save aggregation
                const savedEntity = yield this.productService.save(entity, filter);
                // Wait for types cache updates
                yield sleep(1000);
                // Open the new aggregation (no wait)
                yield this.openProduct(savedEntity);
                // Change current type
                yield this.setType(savedEntity, { emitEvent: true, skipLocationChange: false, sheetName: undefined });
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
                this.markAsDirty();
            }
            finally {
                this.markAsLoaded();
                this.enable();
            }
        });
    }
    save(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.type)
                return; // Skip
            this.markAsLoading();
            this.error = null;
            const filter = this.getFilterValue();
            this.disable();
            try {
                console.info('[extraction-table] Saving as new product...');
                // Compute label and name
                const [label, name] = yield Promise.all([
                    this.productService.computeNextLabel(this.type.format, this.types),
                    this.computeNextProductName(this.type.format)
                ]);
                const entity = ExtractionProduct.fromObject({
                    label,
                    name,
                    format: this.type.format,
                    version: this.type.version,
                    parent: this.type.id >= 0 ? ExtractionTypeUtils.minify(this.type) : null
                });
                // Save extraction
                const savedEntity = yield this.productService.save(entity, filter);
                // Wait for types cache updates
                yield sleep(1000);
                // Open the new aggregation
                yield this.openProduct(savedEntity);
                // Change current type
                yield this.setType(savedEntity, { emitEvent: true, skipLocationChange: false, sheetName: undefined });
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
                this.markAsDirty();
            }
            finally {
                this.markAsLoaded();
                this.enable();
            }
        });
    }
    delete(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.type || isNil(this.type.id))
                return;
            if (this.type.category !== ExtractionCategories.PRODUCT) {
                console.warn('[extraction-table] Only product extraction can be deleted !');
                return;
            }
            const confirm = yield this.askDeleteConfirmation(event);
            if (!confirm)
                return; // user cancelled
            // Mark as loading, and disable
            this.markAsLoading();
            this.error = null;
            this.disable();
            try {
                const aggType = ExtractionProduct.fromObject(this.type.asObject());
                yield this.productService.delete(aggType);
                // Wait propagation to types
                yield sleep(4000);
                // Change type, to the first one
                const types = yield firstNotNilPromise(this.types$);
                if (types && types.length) {
                    yield this.setType(types[0], { emitEvent: false, skipLocationChange: false, sheetName: undefined });
                }
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
                this.markAsDirty();
            }
            finally {
                this.markAsLoaded({ emitEvent: false });
                this.enable();
                this.markForCheck();
            }
        });
    }
    openMap(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (((_a = this.type) === null || _a === void 0 ? void 0 : _a.isSpatial) !== true)
                return; // Skip
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            return setTimeout(() => 
            // open the map
            this.router.navigate(['extraction', 'map'], {
                // TODO replace by ExtractionUtils.asQueryParams(this.type, this.getFilterValue())
                queryParams: Object.assign({ category: this.type.category, label: this.type.label }, this.getFilterAsQueryParams())
            }), 200); // Add a delay need by matTooltip to be hide
        });
    }
    openProduct(type, event) {
        type = type || this.type;
        if (event) {
            // Need, to close mat tooltip
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        if (!type)
            return; // skip if not a aggregation type
        console.debug(`[extraction-table] Opening product {${type.label}`);
        return setTimeout(() => 
        // open the aggregation type
        this.router.navigate(['extraction', 'product', type.id]), 100);
    }
    applyFilterAndClosePanel(event) {
        this.onRefresh.emit(event);
        this.filterExpansionPanel.close();
    }
    resetFilter(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.programLabel) {
                // Keep program (reapply type + program)
                yield this.setTypeAndProgram(this.type, this.programLabel, { emitEvent: false });
            }
            else {
                // Clear all filter
                this.criteriaForm.reset();
            }
            // Apply filter
            this.applyFilterAndClosePanel(event);
        });
    }
    doRefresh(event) {
        this.cacheDuration = 'none';
        this.onRefresh.emit(event);
        // Wait end
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.waitIdle();
            // complete (e.g. IonRefresher)
            if ((event === null || event === void 0 ? void 0 : event.target) && event.target.complete) {
                event.target.complete();
            }
            // Refresh cache duration
            this.cacheDuration = null;
        }), 650);
    }
    /* -- protected method -- */
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    updateQueryParams(type, opts = { skipLocationChange: false, skipSettingsChange: false }) {
        const _super = Object.create(null, {
            updateQueryParams: { get: () => super.updateQueryParams }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.embedded)
                return; // Skip route update route, if embedded
            return _super.updateQueryParams.call(this, type, opts);
        });
    }
    resetProgram() {
        this._state.set({ programLabel: null, program: null });
    }
    watchAllTypes() {
        const filter = {
            statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
        };
        return this.extractionTypeService.watchAll(0, 1000, 'label', 'asc', filter);
    }
    loadType(id, opts) {
        return this.extractionTypeService.load(id, opts);
    }
    loadData() {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            if (!((_a = this.type) === null || _a === void 0 ? void 0 : _a.label))
                return; // skip
            // To many call
            if (this.stopSubject.observers.length >= 1)
                throw new Error('Too many call of loadData()');
            const typeLabel = this.type.label;
            this.markAsLoading();
            this.resetError();
            let cancelled = false;
            const cancelSubscription = this.stopSubject
                .subscribe(() => {
                var _a;
                if (((_a = this.type) === null || _a === void 0 ? void 0 : _a.label) !== typeLabel) {
                    console.debug(`[extraction-table] Loading ${typeLabel} [CANCELLED]`);
                    cancelled = true;
                }
            });
            const filter = this.getFilterValue();
            this.disable();
            this.markForCheck();
            const now = Date.now();
            console.info(`[extraction-table] Loading ${typeLabel} (sheet: ${filter.sheetName}, cacheDuration: ${this.cacheDuration})...`);
            try {
                // Load rows
                const data = yield this.service.loadRows(this.type, this.paginator ? this.paginator.pageIndex * this.paginator.pageSize : null, ((_b = this.paginator) === null || _b === void 0 ? void 0 : _b.pageSize) || DEFAULT_PAGE_SIZE, (_c = this.sort) === null || _c === void 0 ? void 0 : _c.active, (_d = this.sort) === null || _d === void 0 ? void 0 : _d.direction, filter, { cacheDuration: this.cacheDuration });
                if (cancelled)
                    return; // Stop if cancelled
                console.info(`[extraction-table] Loading ${typeLabel} (sheet: ${filter.sheetName}) [OK] in ${Date.now() - now}ms`);
                // Update the view
                yield this.updateView(data);
            }
            catch (err) {
                if (!cancelled) {
                    console.error(err);
                    this.error = err && err.message || err;
                    this.markAsDirty();
                }
            }
            finally {
                if (!cancelled) {
                    this.markAsLoaded();
                    this.enable();
                }
                cancelSubscription === null || cancelSubscription === void 0 ? void 0 : cancelSubscription.unsubscribe();
            }
        });
    }
    fromObject(json) {
        return ExtractionType.fromObject(json);
    }
    isEquals(t1, t2) {
        return ExtractionType.equals(t1, t2);
    }
    askDeleteConfirmation(event) {
        return Alerts.askActionConfirmation(this.alertCtrl, this.translate, true, event);
    }
    parseCriteriaFromString(queryString, sheet) {
        var _a;
        const criteria = super.parseCriteriaFromString(queryString, sheet);
        const programIndex = (criteria || []).findIndex(criterion => (!sheet || criterion.sheetName === sheet)
            && criterion.operator === '='
            && criterion.name === 'project'
            && isNotNilOrBlank(criterion.value));
        if (programIndex !== -1) {
            const programLabel = (_a = criteria[programIndex]) === null || _a === void 0 ? void 0 : _a.value;
            this.setProgramLabel(programLabel);
            criteria[programIndex].hidden = true;
        }
        return criteria;
    }
    setProgramLabel(value) {
        this.programLabel = value;
    }
    /* -- private method -- */
    computeNextProductName(format) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!format)
                return null;
            // Use program as format, if any
            const program = this.program;
            if (isNotNilOrBlank(program === null || program === void 0 ? void 0 : program.label)) {
                format = program.label;
            }
            const i18nPrefix = (format === null || format === void 0 ? void 0 : format.startsWith('AGG_')) ? 'EXTRACTION.AGGREGATION.NEW.' : 'EXTRACTION.PRODUCT.NEW.';
            const defaultName = yield this.translate.get(i18nPrefix + 'DEFAULT_NAME', { format }).toPromise();
            return this.productService.computeNextName(defaultName, this.types);
        });
    }
    updateTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.type) {
                this.$title.next('EXTRACTION.TABLE.TITLE');
                return;
            }
            const categoryKey = `EXTRACTION.CATEGORY.${this.type.category.toUpperCase()}`;
            const categoryName = yield this.translate.get(categoryKey).toPromise();
            const titlePrefix = (categoryName !== categoryKey) ? `<small>${categoryName}<br/></small>` : '';
            if (isNilOrBlank(titlePrefix)) {
                console.warn('Missing i18n key \'' + categoryKey + '\'');
            }
            // Try to get a title with the program
            const program = this.program;
            if (isNotNilOrBlank(program === null || program === void 0 ? void 0 : program.label)) {
                const titleKey = `EXTRACTION.FORMAT.${this.type.format.toUpperCase()}.TITLE_PROGRAM`;
                const title = yield this.translate.get(titleKey, program).toPromise();
                if (title !== titleKey) {
                    this.$title.next(titlePrefix + title);
                    return;
                }
            }
            // By default: use type name (should have been translated before)
            this.$title.next(titlePrefix + this.type.name);
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    openTripReport() {
        return __awaiter(this, void 0, void 0, function* () {
            const program = this.program;
            if (!program || !this.enableTripReport)
                return; // Skip
            const reportType = program.getProperty(ProgramProperties.TRIP_REPORT_TYPE);
            const reportPath = reportType !== 'legacy' ? [reportType] : [];
            const filter = this.getFilterValue();
            yield this.router.navigate(['extraction', 'report', 'trips', ...reportPath], {
                queryParams: ExtractionUtils.asQueryParams(this.type, filter)
            });
        });
    }
    watchExtractionTypesByProgram(programLabel) {
        if (this._extractionTypesProgramLabel !== programLabel) {
            this._extractionTypesProgramLabel = programLabel;
            this._extractionTypesByPrograms$ = this.extractionTypeService.watchAllByProgramLabels([programLabel]);
        }
        return this._extractionTypesByPrograms$;
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionTablePage.prototype, "autoload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionTablePage.prototype, "embedded", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionTablePage.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionTablePage.prototype, "showFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionTablePage.prototype, "showDownloadButton", void 0);
__decorate([
    ViewChild(MatTable, { static: true }),
    __metadata("design:type", MatSort)
], ExtractionTablePage.prototype, "table", void 0);
__decorate([
    ViewChild(MatPaginator, { static: true }),
    __metadata("design:type", MatPaginator)
], ExtractionTablePage.prototype, "paginator", void 0);
__decorate([
    ViewChild(MatSort, { static: true }),
    __metadata("design:type", MatSort)
], ExtractionTablePage.prototype, "sort", void 0);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], ExtractionTablePage.prototype, "filterExpansionPanel", void 0);
ExtractionTablePage = __decorate([
    Component({
        selector: 'app-extraction-table-page',
        templateUrl: './extraction-table.page.html',
        styleUrls: ['./extraction-table.page.scss'],
        providers: [RxState],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        RxState,
        ProductService,
        ProgramRefService,
        ExtractionTypeService,
        ChangeDetectorRef])
], ExtractionTablePage);
export { ExtractionTablePage };
//# sourceMappingURL=extraction-table.page.js.map