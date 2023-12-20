import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, Output } from '@angular/core';
import { AppFormUtils, AppInMemoryTable, changeCaseToUnderscore, EntityUtils, firstNotNilPromise, InMemoryEntitiesService, isEmptyArray, isNotEmptyArray, isNotNil, ReferentialUtils, removeDuplicatesFromArray, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusIds, } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { PmfmStrategyValidatorService } from '../services/validator/pmfm-strategy.validator';
import { ReferentialRefService } from '../services/referential-ref.service';
import { merge, Observable, of } from 'rxjs';
import { PmfmService } from '../services/pmfm.service';
import { debounceTime, distinctUntilChanged, filter, map, mergeMap, startWith, takeUntil } from 'rxjs/operators';
import { PmfmStrategy } from '../services/model/pmfm-strategy.model';
import { PmfmValueUtils } from '../services/model/pmfm-value.model';
import { PmfmStrategyFilter } from '@app/referential/services/filter/pmfm-strategy.filter';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { RxState } from '@rx-angular/state';
let PmfmStrategiesTable = class PmfmStrategiesTable extends AppInMemoryTable {
    constructor(injector, validatorService, pmfmService, referentialRefService, state, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS
            .concat([
            'acquisitionLevel',
            'rankOrder',
            'pmfm',
            'parameter',
            'isMandatory',
            'acquisitionNumber',
            'minValue',
            'maxValue',
            'defaultValue',
            'conditions'
        ])
            .concat(RESERVED_END_COLUMNS), PmfmStrategy, new InMemoryEntitiesService(PmfmStrategy, PmfmStrategyFilter, {
            onLoad: (data) => this.onLoadData(data),
            equals: PmfmStrategy.equals
        }), validatorService, {
            prependNewElements: false,
            suppressErrors: true,
            onRowCreated: (row) => this.onRowCreated(row)
        }, new PmfmStrategyFilter());
        this.injector = injector;
        this.validatorService = validatorService;
        this.pmfmService = pmfmService;
        this.referentialRefService = referentialRefService;
        this.state = state;
        this.cd = cd;
        this.acquisitionLevels$ = this.state.select('acquisitionLevels');
        this.fieldDefinitions = {};
        this.columnDefinitions = [];
        this.filterCriteriaCount = 0;
        this.showToolbar = true;
        this.showPaginator = true;
        this.showHeaderRow = true;
        this.withDetails = true;
        this.showPmfmLabel = true;
        this.allowEmpty = false;
        this.canEdit = false;
        this.sticky = false;
        this.i18nColumnPrefix = 'PROGRAM.STRATEGY.PMFM_STRATEGY.';
        this.inlineEdition = true;
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        this.saveBeforeDelete = true;
        this.saveBeforeSort = true;
        this.saveBeforeFilter = true;
        this.debug = !environment.production;
    }
    set showDetailsColumns(value) {
        // Set details columns visibility
        this.setShowColumn('acquisitionLevel', value);
        this.setShowColumn('rankOrder', value);
        this.setShowColumn('isMandatory', value);
        this.setShowColumn('acquisitionNumber', value);
        this.setShowColumn('minValue', value);
        this.setShowColumn('maxValue', value);
        this.setShowColumn('defaultValue', value);
        // Inverse visibility of the parameter columns
        this.setShowColumn('parameter', !value);
    }
    set showIdColumn(value) {
        this.setShowColumn('id', value);
    }
    get showIdColumn() {
        return this.getShowColumn('id');
    }
    set showSelectColumn(value) {
        this.setShowColumn('select', value);
    }
    get showSelectColumn() {
        return this.getShowColumn('select');
    }
    get selectionChanges() {
        return this.selection.changed.pipe(map(_ => this.selection.selected));
    }
    get loading$() {
        return merge(this.loadingSubject, this.acquisitionLevels$
            .pipe(startWith(true), filter(isNotNil), map(_ => false))).pipe(distinctUntilChanged());
    }
    get filterIsEmpty() {
        return this.filterCriteriaCount === 0;
    }
    get acquisitionLevels() {
        return this.state.get('acquisitionLevels');
    }
    get qualitativeValues() {
        return this.state.get('qualitativeValues');
    }
    ngOnInit() {
        super.ngOnInit();
        this.validatorService.withDetails = this.withDetails;
        // Acquisition level
        this.registerColumnDefinition({
            key: 'acquisitionLevel',
            type: 'entity',
            required: true,
            autocomplete: this.registerAutocompleteField('acquisitionLevel', {
                items: this.state.select('acquisitionLevels'),
                attributes: ['name'],
                showAllOnFocus: true,
                class: 'mat-autocomplete-panel-large-size'
            })
        });
        // Load acquisition levels
        this.state.connect('acquisitionLevels', this.watchAcquisitionLevels());
        // Rank order
        this.registerColumnDefinition({
            key: 'rankOrder',
            type: 'integer',
            minValue: 1,
            defaultValue: 1,
            required: true
        });
        // Pmfm
        const basePmfmAttributes = (!this.showPmfmLabel ? ['name'] : this.settings.getFieldDisplayAttributes('pmfm', ['label', 'name']));
        const pmfmAttributes = basePmfmAttributes
            .map(attr => attr === 'name' ? 'parameter.name' : attr)
            .concat(['unit.label', 'matrix.name', 'fraction.name', 'method.name']);
        const pmfmColumnNames = basePmfmAttributes.map(attr => 'REFERENTIAL.' + attr.toUpperCase())
            .concat(['REFERENTIAL.PMFM.UNIT', 'REFERENTIAL.PMFM.MATRIX', 'REFERENTIAL.PMFM.FRACTION', 'REFERENTIAL.PMFM.METHOD']);
        this.registerColumnDefinition({
            key: 'pmfm',
            type: 'entity',
            required: false,
            autocomplete: this.registerAutocompleteField('pmfm', {
                suggestFn: (value, opts) => this.suggestPmfms(value, opts),
                attributes: pmfmAttributes,
                columnSizes: pmfmAttributes.map(attr => {
                    switch (attr) {
                        case 'label':
                            return 2;
                        case 'name':
                            return 3;
                        case 'unit.label':
                            return 1;
                        case 'method.name':
                            return 4;
                        default: return undefined;
                    }
                }),
                columnNames: pmfmColumnNames,
                displayWith: (pmfm) => this.displayPmfm(pmfm, { withUnit: true, withDetails: true }),
                showAllOnFocus: false,
                class: 'mat-autocomplete-panel-full-size'
            })
        });
        // PMFM.PARAMETER
        const pmfmParameterAttributes = ['label', 'name'];
        this.registerColumnDefinition({
            key: 'parameter',
            type: 'entity',
            required: false,
            autocomplete: this.registerAutocompleteField('parameter', {
                suggestFn: (value, opts) => this.suggestParameters(value, opts),
                attributes: pmfmParameterAttributes,
                columnSizes: [4, 8],
                columnNames: ['REFERENTIAL.PARAMETER.CODE', 'REFERENTIAL.PARAMETER.NAME'],
                showAllOnFocus: false,
                class: 'mat-autocomplete-panel-large-size'
            })
        });
        // Is mandatory
        this.registerColumnDefinition({
            key: 'isMandatory',
            type: 'boolean',
            defaultValue: false,
            required: true
        });
        // Acquisition number
        this.registerColumnDefinition({
            key: 'acquisitionNumber',
            type: 'integer',
            minValue: 0,
            defaultValue: 1,
            required: true
        });
        // Min / Max
        this.registerColumnDefinition({
            key: 'minValue',
            type: 'double',
            required: false
        });
        this.registerColumnDefinition({
            key: 'maxValue',
            type: 'double',
            required: false
        });
        // Register default value definition
        this.registerFieldDefinition({
            key: 'defaultValue',
            type: 'double',
            required: false
        });
        const qvAttributes = this.settings.getFieldDisplayAttributes('qualitativeValue', ['label', 'name']);
        this.registerFieldDefinition({
            key: 'defaultQualitativeValue',
            type: 'entity',
            autocomplete: {
                attributes: qvAttributes,
                items: this.state.select('qualitativeValues'),
                showAllOnFocus: true,
                class: 'mat-autocomplete-panel-large-size'
            },
            required: false
        });
        // Load default qualitative value
        this.state.connect('qualitativeValues', this.watchQualitativeValues());
    }
    getDisplayColumns() {
        let userColumns = this.getUserColumns();
        // No user override: use defaults
        if (!userColumns) {
            userColumns = this.columns;
        }
        // Get fixed start columns
        const fixedStartColumns = this.columns.filter(c => RESERVED_START_COLUMNS.includes(c));
        // Remove end columns
        const fixedEndColumns = this.columns.filter(c => RESERVED_END_COLUMNS.includes(c));
        // Remove fixed columns from user columns
        userColumns = userColumns.filter(c => (!fixedStartColumns.includes(c) && !fixedEndColumns.includes(c) && this.columns.includes(c)));
        return fixedStartColumns
            .concat(userColumns)
            .concat(fixedEndColumns)
            // Remove columns to hide
            .filter(column => !this.excludesColumns.includes(column));
    }
    editRow(event, row, opts) {
        return super.editRow(event, row, opts);
    }
    setFilter(source, opts) {
        const target = new PmfmStrategyFilter();
        Object.assign(target, source);
        // Update criteria count
        const criteriaCount = target.countNotEmptyCriteria();
        if (criteriaCount !== this.filterCriteriaCount) {
            this.filterCriteriaCount = criteriaCount;
            this.markForCheck();
        }
        super.setFilter(target, opts);
    }
    onLoadData(sources) {
        return __awaiter(this, void 0, void 0, function* () {
            // Wait acquisition levels to be loaded
            const acquisitionLevels = yield firstNotNilPromise(this.acquisitionLevels$);
            // Add at least one item
            if (!this.allowEmpty && isEmptyArray(sources)) {
                console.debug('[pmfm-strategy-table] Force add empty PmfmSTrategy, because allowEmpty=false');
                sources = [new PmfmStrategy()];
            }
            console.debug('[pmfm-strategy-table] Adapt loaded data to table...');
            const entities = sources.map(source => {
                const target = PmfmStrategy.fromObject(source);
                // Convert acquisition level, from string to entity
                if (typeof target.acquisitionLevel === 'string') {
                    target.acquisitionLevel = acquisitionLevels.find(i => i.label === target.acquisitionLevel);
                }
                if (isNotNil(target.defaultValue) && target.pmfm) {
                    target.defaultValue = target.pmfm && PmfmValueUtils.fromModelValue(target.defaultValue, target.pmfm);
                    console.debug('[pmfm-strategy-table] Received default value: ', target.defaultValue);
                }
                else {
                    target.defaultValue = null;
                }
                return target;
            });
            return entities;
        });
    }
    onRowCreated(row) {
        return __awaiter(this, void 0, void 0, function* () {
            // Creating default values, from the current filter
            const filter = this.filter;
            const acquisitionLevelLabel = filter && filter.acquisitionLevel;
            const acquisitionLevel = acquisitionLevelLabel && (this.acquisitionLevels || []).find(item => item.label === acquisitionLevelLabel);
            const gearIds = filter && filter.gearIds;
            const taxonGroupIds = filter && filter.taxonGroupIds;
            const referenceTaxonIds = filter && filter.referenceTaxonIds;
            let rankOrder = null;
            if (acquisitionLevel) {
                rankOrder = ((yield this.getMaxRankOrder(acquisitionLevel)) || 0) + 1;
            }
            const defaultValues = {
                acquisitionLevel,
                rankOrder,
                gearIds,
                taxonGroupIds,
                referenceTaxonIds
            };
            // Applying defaults
            if (row.validator) {
                row.validator.patchValue(defaultValues);
            }
            else {
                Object.assign(row.currentData, defaultValues);
            }
        });
    }
    getMaxRankOrder(acquisitionLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            return rows
                .map(row => row.currentData)
                .filter(data => ReferentialUtils.equals(data.acquisitionLevel, acquisitionLevel))
                .reduce((res, data) => Math.max(res, data.rankOrder || 0), 0);
        });
    }
    registerColumnDefinition(def) {
        const definition = Object.assign({ label: this.i18nColumnPrefix + changeCaseToUnderscore(def.key).toUpperCase() }, def);
        this.columnDefinitions.push(definition);
    }
    registerFieldDefinition(def) {
        const definition = Object.assign({ label: this.i18nColumnPrefix + changeCaseToUnderscore(def.key).toUpperCase() }, def);
        this.fieldDefinitions[def.key] = definition;
    }
    watchAcquisitionLevels() {
        return this.referentialRefService.watchAll(0, 100, null, null, {
            entityName: 'AcquisitionLevel'
        }, { withTotal: false })
            .pipe(map(res => (res === null || res === void 0 ? void 0 : res.data) || []));
    }
    watchQualitativeValues() {
        return this.onStartEditingRow
            .pipe(
        // DEBUG
        //tap(row => console.debug('DEV - Starting editing row', row.currentData)),
        debounceTime(200), mergeMap(row => {
            var _a;
            const control = (_a = row.validator) === null || _a === void 0 ? void 0 : _a.get('pmfm');
            if (control) {
                return control.valueChanges.pipe(startWith(control.value), takeUntil(this.onStartEditingRow));
            }
            else {
                return of(row.currentData.pmfm);
            }
        }), map(pmfm => pmfm === null || pmfm === void 0 ? void 0 : pmfm.id), filter(isNotNil), 
        //tap(pmfmId => console.debug("TODO current pmdm id=", pmfmId)),
        //distinctUntilChanged(),
        //debounceTime(200),
        mergeMap(pmfmId => this.pmfmService.load(pmfmId)), map(pmfm => { var _a; return ((isNotEmptyArray(pmfm.qualitativeValues) ? pmfm.qualitativeValues : (_a = pmfm.parameter) === null || _a === void 0 ? void 0 : _a.qualitativeValues) || []); }), filter(isNotEmptyArray)
        // DEBUG
        //,tap(items => console.debug("TODO Check Pmfm QV", items))
        );
    }
    resetRow(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event === null || event === void 0 ? void 0 : event.defaultPrevented)
                return false;
            console.debug('[pmfm-strategies-table] Resetting row');
            if (event)
                event.preventDefault(); // Avoid clickRow to be executed
            AppFormUtils.copyEntity2Form({}, row.validator);
            row.validator.markAsUntouched();
            row.validator.markAsPristine();
            row.validator.disable();
            this.editedRow = undefined;
            return true;
        });
    }
    get valueChanges() {
        return merge(this.dataSource.connect(null), this.onStartEditingRow.pipe(filter(row => !!row.validator), mergeMap(row => row.validator.valueChanges
            .pipe(
        //debounceTime(250),
        map((_) => this.dataSource.getRows()), map((rows) => rows.map(r => r.id === row.id ? row : r))))))
            .pipe(map(rows => (rows || []).map(r => r.currentData)));
    }
    duplicateSelection(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.selection.isEmpty())
                return; // Skip if empty
            if (!this.confirmEditCreate())
                return; // Stop if cannot confirm previous row
            try {
                const rows = this.selection.selected
                    // Sort by ID desc (need to insertAt)
                    .sort((r1, r2) => r1.id > r2.id ? -1 : 1);
                console.debug(`[pmfm-strategy-table] Duplicating ${rows.length} rows...`);
                for (const sourceRow of rows) {
                    const source = PmfmStrategy.fromObject(sourceRow.currentData);
                    const target = source.clone();
                    EntityUtils.cleanIdAndUpdateDate(target);
                    const targetRow = yield this.addRowToTable(sourceRow.id + 1, { editing: false });
                    if (!targetRow)
                        break;
                    targetRow.validator.patchValue(target);
                    if (!this.confirmEditCreate(null, targetRow))
                        break;
                    this.selection.deselect(sourceRow);
                }
            }
            finally {
                this.markAsDirty();
            }
        });
    }
    /* -- protected functions -- */
    suggestPmfms(value, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pmfmService.suggest(value, Object.assign({ searchJoin: 'parameter', searchAttribute: !this.showPmfmLabel ? 'name' : undefined /*label + name*/ }, this.pmfmFilter));
        });
    }
    suggestParameters(value, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pmfmFilter) {
                const { data } = yield this.pmfmService.suggest(value, Object.assign({ searchJoin: 'parameter' }, this.pmfmFilter));
                const pmfmParameters = data.map(p => p.parameter).filter(isNotNil);
                return removeDuplicatesFromArray(pmfmParameters, 'label');
            }
            else {
                return yield this.referentialRefService.suggest(value, Object.assign(Object.assign({}, opts), { entityName: 'Parameter', statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] }));
            }
        });
    }
    /**
     * Compute a PMFM.NAME, with the last part of the name
     *
     * @param pmfm
     * @param opts
     */
    displayPmfm(pmfm, opts) {
        if (!pmfm)
            return undefined;
        let name = pmfm.parameter && pmfm.parameter.name;
        if (opts && opts.withDetails) {
            name = [
                name,
                pmfm.matrix && pmfm.matrix.name,
                pmfm.fraction && pmfm.fraction.name,
                pmfm.method && pmfm.method.name
            ].filter(isNotNil).join(' - ');
        }
        // Append unit
        const unitLabel = (pmfm.type === 'integer' || pmfm.type === 'double') && pmfm.unit && pmfm.unit.label;
        if ((!opts || opts.withUnit !== false) && unitLabel) {
            if (opts && opts.html) {
                name += `<small><br/>(${unitLabel})</small>`;
            }
            else {
                name += ` (${unitLabel})`;
            }
        }
        return name;
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "showHeaderRow", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "withDetails", void 0);
__decorate([
    Input(),
    __metadata("design:type", PmfmFilter)
], PmfmStrategiesTable.prototype, "pmfmFilter", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "showPmfmLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "allowEmpty", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "canEdit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PmfmStrategiesTable.prototype, "sticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PmfmStrategiesTable.prototype, "showDetailsColumns", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PmfmStrategiesTable.prototype, "showIdColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], PmfmStrategiesTable.prototype, "showSelectColumn", null);
__decorate([
    Input(),
    __metadata("design:type", String)
], PmfmStrategiesTable.prototype, "title", void 0);
__decorate([
    Output(),
    __metadata("design:type", Observable),
    __metadata("design:paramtypes", [])
], PmfmStrategiesTable.prototype, "selectionChanges", null);
PmfmStrategiesTable = __decorate([
    Component({
        selector: 'app-pmfm-strategies-table',
        templateUrl: './pmfm-strategies.table.html',
        styleUrls: ['./pmfm-strategies.table.scss'],
        providers: [
            RxState
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        PmfmStrategyValidatorService,
        PmfmService,
        ReferentialRefService,
        RxState,
        ChangeDetectorRef])
], PmfmStrategiesTable);
export { PmfmStrategiesTable };
//# sourceMappingURL=pmfm-strategies.table.js.map