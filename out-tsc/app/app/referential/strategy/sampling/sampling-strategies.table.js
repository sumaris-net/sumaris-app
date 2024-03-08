import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, Output, TemplateRef, ViewChild } from '@angular/core';
import { Alerts, AppFormUtils, AppTable, DateUtils, EntitiesTableDataSource, fromDateISOString, isEmptyArray, isNotEmptyArray, isNotNil, PersonService, PersonUtils, removeDuplicatesFromArray, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, SharedValidators, sleep, StatusIds, toBoolean, } from '@sumaris-net/ngx-components';
import { Program } from '../../services/model/program.model';
import { LocationLevelGroups, ParameterLabelGroups, TaxonomicLevelIds } from '../../services/model/model.enum';
import { ReferentialRefService } from '../../services/referential-ref.service';
import { ProgramProperties, SAMPLING_STRATEGIES_FEATURE_NAME } from '../../services/config/program.config';
import { environment } from '@environments/environment';
import { SamplingStrategy } from '../../services/model/sampling-strategy.model';
import { SamplingStrategyService } from '../../services/sampling-strategy.service';
import { StrategyService } from '../../services/strategy.service';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { ParameterService } from '@app/referential/services/parameter.service';
import { debounceTime, filter, tap } from 'rxjs/operators';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';
import { MatExpansionPanel } from '@angular/material/expansion';
import { Subject } from 'rxjs';
import { StrategyFilter } from '@app/referential/services/filter/strategy.filter';
import { StrategyModal } from '@app/referential/strategy/strategy.modal';
import { TaxonNameRefService } from '@app/referential/services/taxon-name-ref.service';
import moment from 'moment';
import { RxState } from '@rx-angular/state';
import { LandingFilter } from '@app/trip/landing/landing.filter';
export const SamplingStrategiesPageSettingsEnum = {
    PAGE_ID: 'samplingStrategies',
    FILTER_KEY: 'filter',
    FEATURE_ID: SAMPLING_STRATEGIES_FEATURE_NAME,
};
let SamplingStrategiesTable = class SamplingStrategiesTable extends AppTable {
    constructor(injector, samplingStrategyService, strategyService, referentialRefService, taxonNameRefService, personService, parameterService, formBuilder, _state, cd) {
        super(injector, 
        // columns
        RESERVED_START_COLUMNS
            .concat([
            'label',
            'analyticReference',
            'recorderDepartments',
            'locations',
            'taxonNames',
            'comments',
            'parameterGroups',
            'effortQ1',
            'effortQ2',
            'effortQ3',
            'effortQ4'
        ])
            .concat(RESERVED_END_COLUMNS), new EntitiesTableDataSource(SamplingStrategy, samplingStrategyService, null, {
            prependNewElements: false,
            suppressErrors: environment.production,
            readOnly: true,
            watchAllOptions: {
                withTotal: true
            }
        }));
        this.samplingStrategyService = samplingStrategyService;
        this.strategyService = strategyService;
        this.referentialRefService = referentialRefService;
        this.taxonNameRefService = taxonNameRefService;
        this.personService = personService;
        this.parameterService = parameterService;
        this.formBuilder = formBuilder;
        this._state = _state;
        this.cd = cd;
        this.canEdit$ = this._state.select('canEdit');
        this.canDelete$ = this._state.select('canDelete');
        this.quarters = Object.freeze([1, 2, 3, 4]);
        this.filterCriteriaCount = 0;
        this.i18nContext = {};
        this.showToolbar = true;
        this.canOpenRealizedLandings = false;
        this.showError = true;
        this.showPaginator = true;
        this.filterPanelFloating = true;
        this.useSticky = true;
        this.onNewDataFromRow = new Subject();
        this.parameterGroupLabels = ['LENGTH', 'WEIGHT', 'SEX', 'MATURITY', 'AGE'];
        this.filterForm = formBuilder.group({
            searchText: [null],
            levelId: [null, Validators.required],
            analyticReference: [null],
            department: [null, SharedValidators.entity],
            location: [null, SharedValidators.entity],
            taxonName: [null, SharedValidators.entity],
            startDate: [null, SharedValidators.validDate],
            endDate: [null, SharedValidators.validDate],
            //recorderPerson: [null, SharedValidators.entity],
            effortByQuarter: formBuilder.group({
                1: [null],
                2: [null],
                3: [null],
                4: [null]
            }),
            parameterGroups: formBuilder.group(this.parameterGroupLabels.reduce((controlConfig, label) => {
                controlConfig[label] = [null];
                return controlConfig;
            }, {}))
        });
        this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.'; // Can be overwritten by a program property - see setProgram()
        this.autoLoad = false; // waiting program to be loaded - see setProgram()
        this.defaultSortBy = 'label';
        this.defaultSortDirection = 'asc';
        this.confirmBeforeDelete = true;
        this.inlineEdition = false;
        // Will be overridden when getting program - see setProgram()
        this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#?';
        this._state.set({
            canEdit: false,
            canDelete: false
        });
        // FOR DEV ONLY ----
        this.debug = !environment.production;
    }
    set canEdit(value) {
        this._state.set('canEdit', _ => value);
    }
    get canEdit() {
        return this._state.get('canEdit');
    }
    set canDelete(value) {
        this._state.set('canDelete', _ => value);
    }
    get canDelete() {
        return this._state.get('canDelete');
    }
    set program(program) {
        this.setProgram(program);
    }
    get program() {
        return this._program;
    }
    ngOnInit() {
        super.ngOnInit();
        // By default, use floating filter if toolbar not shown
        this.filterPanelFloating = toBoolean(this.filterPanelFloating, !this.showToolbar);
        // Remove error after changed selection
        this.selection.changed.subscribe(() => this.resetError());
        // Watch 'canEdit' and 'canDelete' to update 'readonly'
        this._state.hold(this._state.select(['canEdit', 'canDelete'], res => res).pipe(debounceTime(250)), ({ canEdit, canDelete }) => {
            this.readOnly = !canEdit && !canDelete;
            this.markForCheck();
        });
        // Analytic reference autocomplete
        this.registerAutocompleteField('analyticReference', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.strategyService.suggestAnalyticReferences(value, Object.assign(Object.assign({}, filter), { statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY] })),
            columnSizes: [4, 6],
            mobile: this.mobile
        });
        this.registerAutocompleteField('department', {
            showAllOnFocus: false,
            service: this.referentialRefService,
            filter: {
                entityName: 'Department',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
        this.registerAutocompleteField('location', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => __awaiter(this, void 0, void 0, function* () {
                // Note: wait enumeration override, before using LocationLevelGroups.FISHING_AREA
                yield this.referentialRefService.ready();
                return this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: LocationLevelGroups.FISHING_AREA }));
            }),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
        this.registerAutocompleteField('taxonName', {
            showAllOnFocus: false,
            service: this.taxonNameRefService,
            attributes: ['name'],
            filter: {
                levelIds: [TaxonomicLevelIds.SPECIES, TaxonomicLevelIds.SUBSPECIES],
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
            },
            mobile: this.mobile
        });
        // Combo: recorder person (filter)
        this.registerAutocompleteField('person', {
            showAllOnFocus: false,
            service: this.personService,
            filter: {
                statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
            },
            attributes: ['lastName', 'firstName', 'department.name'],
            displayWith: PersonUtils.personToString,
            mobile: this.mobile
        });
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(
        //debounceTime(250),
        filter((_) => this.filterForm.valid), tap((value) => {
            const filter = this.asFilter(value);
            this.filterCriteriaCount = filter.countNotEmptyCriteria() - 1 /* remove the levelId (always exists) */;
            this.markForCheck();
            // Update the filter, without reloading the content
            this.setFilter(filter, { emitEvent: false });
        }), 
        // Save filter in settings (after a debounce time)
        debounceTime(500), tap(json => this.settings.savePageSetting(this.settingsId, json, SamplingStrategiesPageSettingsEnum.FILTER_KEY)))
            .subscribe());
    }
    highlightRow(row) {
        this.highlightedRowId = row === null || row === void 0 ? void 0 : row.id;
        this.markForCheck();
    }
    clickRow(event, row) {
        this.highlightedRowId = row === null || row === void 0 ? void 0 : row.id;
        return super.clickRow(event, row);
    }
    deleteSelection(event) {
        const _super = Object.create(null, {
            deleteSelection: { get: () => super.deleteSelection },
            markAsPristine: { get: () => super.markAsPristine }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const rowsToDelete = this.selection.selected;
            const strategyLabelsWithData = (rowsToDelete || [])
                .map(row => row.currentData)
                .map(SamplingStrategy.fromObject)
                .filter(strategy => strategy.hasRealizedEffort)
                .map(s => s.label);
            // send error if one strategy has landing
            if (isNotEmptyArray(strategyLabelsWithData)) {
                this.errorDetails = { label: strategyLabelsWithData.join(', ') };
                this.setError(strategyLabelsWithData.length === 1
                    ? 'PROGRAM.STRATEGY.ERROR.STRATEGY_HAS_DATA'
                    : 'PROGRAM.STRATEGY.ERROR.STRATEGIES_HAS_DATA');
                const message = this.translate.instant(strategyLabelsWithData.length === 1 ? 'PROGRAM.STRATEGY.ERROR.STRATEGY_HAS_DATA' : 'PROGRAM.STRATEGY.ERROR.STRATEGIES_HAS_DATA', this.errorDetails);
                yield Alerts.showError(message, this.alertCtrl, this.translate);
                return 0;
            }
            // delete if strategy has not effort
            yield _super.deleteSelection.call(this, event);
            //TODO FIX : After delete first time, _dirty = false; Cannot delete second times cause try to save
            _super.markAsPristine.call(this);
            this.resetError();
        });
    }
    closeFilterPanel(event) {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
        this.filterPanelFloating = true;
    }
    applyFilterAndClosePanel(event, waitDebounceTime) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.filterExpansionPanel)
                this.filterExpansionPanel.close();
            this.filterPanelFloating = true;
            // Wait end of debounce
            if (waitDebounceTime)
                yield sleep(260);
            this.onRefresh.emit(event);
        });
    }
    resetFilter(json) {
        var _a;
        json = Object.assign(Object.assign({}, json), { levelId: (json === null || json === void 0 ? void 0 : json.levelId) || ((_a = this._program) === null || _a === void 0 ? void 0 : _a.id) });
        const filter = this.asFilter(json);
        AppFormUtils.copyEntity2Form(json, this.filterForm);
        this.setFilter(filter, { emitEvent: true });
    }
    resetFilterAndClose() {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
        this.resetFilter();
    }
    onNewData(event, row) {
    }
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    /* -- protected methods -- */
    setProgram(program) {
        if (program && isNotNil(program.id) && this._program !== program) {
            console.debug('[strategy-table] Setting program:', program);
            this._program = program;
            this.settingsId = SamplingStrategiesPageSettingsEnum.PAGE_ID + '#' + program.id;
            this.i18nColumnPrefix = 'PROGRAM.STRATEGY.TABLE.';
            // Add a i18n suffix (e.g. in Biological sampling program)
            const i18nSuffix = program.getProperty(ProgramProperties.I18N_SUFFIX);
            this.i18nColumnPrefix += i18nSuffix !== 'legacy' && i18nSuffix || '';
            // Restore filter from settings, or load all
            this.restoreFilterOrLoad(program.id);
        }
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    restoreFilterOrLoad(programId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsLoading();
            // Load map of parameter ids, by group label
            if (!this.parameterIdsByGroupLabel) {
                this.parameterIdsByGroupLabel = yield this.loadParameterIdsByGroupLabel();
            }
            console.debug('[root-table] Restoring filter from settings...');
            const json = this.settings.getPageSettings(this.settingsId, AppRootTableSettingsEnum.FILTER_KEY) || {};
            this.resetFilter(Object.assign(Object.assign({}, json), { levelId: programId }));
        });
    }
    asFilter(source) {
        var _a, _b;
        source = source || this.filterForm.value;
        const filter = StrategyFilter.fromObject(source);
        // Start date: should be the first day of the year
        // End date: should be the last day of the year
        // /!\ Need to use local time, because the DB can use a local time (e.g. SIH-ADAGIO use tz=Europe/Paris)
        //     TODO: use DB Timezone, using the config CORE_CONFIG_OPTIONS.DB_TIMEZONE;
        filter.startDate = (_a = filter.startDate) === null || _a === void 0 ? void 0 : _a.local(true).startOf('year');
        filter.endDate = (_b = filter.endDate) === null || _b === void 0 ? void 0 : _b.local(true).endOf('year').startOf('day');
        // Convert periods (from quarters)
        filter.periods = this.asFilterPeriods(source);
        // Convert parameter groups to list of parameter ids
        filter.parameterIds = this.asFilterParameterIds(source);
        return filter;
    }
    asFilterParameterIds(source) {
        const checkedParameterGroupLabels = Object.keys(source.parameterGroups || {})
            // Filter on checked item
            .filter(label => source.parameterGroups[label] === true);
        const parameterIds = checkedParameterGroupLabels.reduce((res, groupLabel) => res.concat(this.parameterIdsByGroupLabel[groupLabel]), []);
        if (isEmptyArray(parameterIds))
            return undefined;
        return removeDuplicatesFromArray(parameterIds);
    }
    asFilterPeriods(source) {
        var _a, _b;
        const selectedQuarters = source.effortByQuarter && this.quarters.filter(quarter => source.effortByQuarter[quarter] === true);
        if (isEmptyArray(selectedQuarters))
            return undefined; // Skip if no quarters selected
        // Start year (<N - 10> by default)
        // /!\ Need to use local time, because the DB can use a local time (e.g. SIH-ADAGIO use tz=Europe/Paris)
        //     TODO: use DB Timezone, using the config CORE_CONFIG_OPTIONS.DB_TIMEZONE;
        const startYear = ((_a = fromDateISOString(source.startDate)) === null || _a === void 0 ? void 0 : _a.clone().local(true).year()) || (moment().year() - 10);
        // End year (N + 1 by default)
        const endYear = ((_b = fromDateISOString(source.endDate)) === null || _b === void 0 ? void 0 : _b.clone().local(true).year()) || (moment().year() + 1);
        if (startYear > endYear)
            return undefined; // Invalid years
        const periods = [];
        for (let year = startYear; year <= endYear; year++) {
            selectedQuarters.forEach(quarter => {
                const startMonth = (quarter - 1) * 3;
                const startDate = DateUtils.moment().local(true).year(year).month(startMonth).startOf('month');
                const endDate = startDate.clone().add(2, 'month').endOf('month').startOf('day');
                periods.push({ startDate, endDate });
            });
        }
        return isNotEmptyArray(periods) ? periods : undefined;
    }
    clearControlValue(event, formControl) {
        if (event)
            event.stopPropagation(); // Avoid to enter input the field
        formControl.setValue(null);
        return false;
    }
    loadParameterIdsByGroupLabel() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = {};
            yield Promise.all(this.parameterGroupLabels.map(groupLabel => {
                const parameterLabels = ParameterLabelGroups[groupLabel];
                return this.parameterService.loadAllByLabels(parameterLabels, { toEntity: false, fetchPolicy: 'cache-first' })
                    .then(parameters => result[groupLabel] = parameters.map(p => p.id));
            }));
            return result;
        });
    }
    // INFO CLT : Imagine 355. Sampling strategy can be duplicated with selected year.
    // We keep initial strategy and remove year related data like efforts.
    // We update year-related values like applied period as done in sampling-strategy.form.ts getValue()
    openStrategyDuplicateYearSelectionModal(event, rows) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({
                component: StrategyModal,
            });
            // Open the modal
            yield modal.present();
            const { data } = yield modal.onDidDismiss();
            if (!data)
                return;
            const strategies = rows
                .map(row => row.currentData)
                .map(SamplingStrategy.fromObject);
            const year = fromDateISOString(data)
                // We need the local year, not the UTC year
                .local(true)
                .format('YYYY').toString();
            yield this.duplicateStrategies(strategies, +year);
            this.selection.clear();
        });
    }
    duplicateStrategies(sources, year) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.markAsLoading();
                // Do save
                // This should refresh the table (because of the watchAll updated throught the cache update)
                yield this.samplingStrategyService.duplicateAllToYear(sources, year);
            }
            catch (err) {
                this.setError(err && err.message || err, { emitEvent: false });
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    openLandingsByQuarter(event, strategy, quarter) {
        var _a, _b, _c;
        const effort = (_a = strategy === null || strategy === void 0 ? void 0 : strategy.effortByQuarter) === null || _a === void 0 ? void 0 : _a[quarter];
        if (!this.canOpenRealizedLandings || !(effort === null || effort === void 0 ? void 0 : effort.realizedEffort))
            return; // Skip if nothing to show (no realized effort)
        // Prevent row click action
        event.preventDefault();
        const filter = LandingFilter.fromObject({
            program: { id: this.program.id, label: this.program.label },
            startDate: (_b = effort.startDate) === null || _b === void 0 ? void 0 : _b.clone().startOf('day'),
            endDate: (_c = effort.endDate) === null || _c === void 0 ? void 0 : _c.clone().endOf('day'),
            strategy: { id: strategy.id, label: strategy.label }
        });
        const filterString = JSON.stringify(filter.asObject());
        console.info(`[sampling-strategies-table] Opening landings for quarter ${quarter} and strategy '${strategy.label}'`, effort);
        return this.navController.navigateForward(`/observations/landings`, {
            queryParams: {
                q: filterString
            }
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplingStrategiesTable.prototype, "canEdit", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplingStrategiesTable.prototype, "canDelete", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "canOpenRealizedLandings", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "showPaginator", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "filterPanelFloating", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", TemplateRef)
], SamplingStrategiesTable.prototype, "cellTemplate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Program),
    __metadata("design:paramtypes", [Program])
], SamplingStrategiesTable.prototype, "program", null);
__decorate([
    Output(),
    __metadata("design:type", Object)
], SamplingStrategiesTable.prototype, "onNewDataFromRow", void 0);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], SamplingStrategiesTable.prototype, "filterExpansionPanel", void 0);
SamplingStrategiesTable = __decorate([
    Component({
        selector: 'app-sampling-strategies-table',
        templateUrl: 'sampling-strategies.table.html',
        styleUrls: ['sampling-strategies.table.scss'],
        providers: [RxState],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        SamplingStrategyService,
        StrategyService,
        ReferentialRefService,
        TaxonNameRefService,
        PersonService,
        ParameterService,
        UntypedFormBuilder,
        RxState,
        ChangeDetectorRef])
], SamplingStrategiesTable);
export { SamplingStrategiesTable };
//# sourceMappingURL=sampling-strategies.table.js.map