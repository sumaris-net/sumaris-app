var ReferentialTable_1;
import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Component, Inject, InjectionToken, Injector, Input, Optional, ViewChild } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import { ValidatorService } from '@e-is/ngx-material-table';
import { ReferentialValidatorService } from '../services/validator/referential.validator';
import { ReferentialService } from '../services/referential.service';
import { PopoverController } from '@ionic/angular';
import { AccountService, changeCaseToUnderscore, EntityUtils, firstNotNilPromise, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, Referential, referentialToString, removeDuplicatesFromArray, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, sleep, slideUpDownAnimation, StatusById, StatusIds, StatusList, toBoolean, } from '@sumaris-net/ngx-components';
import { UntypedFormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
import { ReferentialFilter } from '../services/filter/referential.filter';
import { MatExpansionPanel } from '@angular/material/expansion';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { ReferentialI18nKeys } from '@app/referential/referential.utils';
import { ParameterService } from '@app/referential/services/parameter.service';
import { Parameter } from '@app/referential/services/model/parameter.model';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { Pmfm } from '@app/referential/services/model/pmfm.model';
import { TaxonNameService } from '@app/referential/services/taxon-name.service';
import { TaxonName } from '@app/referential/services/model/taxon-name.model';
import { Method } from '@app/referential/pmfm/method/method.model';
import { BaseReferentialTable } from '@app/referential/table/base-referential.table';
import { MethodValidatorService } from '@app/referential/pmfm/method/method.validator';
import { AppBaseTable } from '@app/shared/table/base.table';
import { ReferentialFileService } from '@app/referential/table/referential-file.service';
import { FullReferential } from '@app/referential/services/model/referential.model';
import { ErrorCodes } from '@app/referential/services/errors';
export const BASE_REFERENTIAL_COLUMNS = ['label', 'name', 'parent', 'level', 'status', 'creationDate', 'updateDate', 'comments'];
export const IGNORED_ENTITY_COLUMNS = ['__typename', 'entityName', 'id', 'statusId', 'levelId', 'properties', 'parentId'];
export const REFERENTIAL_TABLE_SETTINGS_ENUM = {
    FILTER_KEY: 'filter',
    COMPACT_ROWS_KEY: 'compactRows'
};
export const DATA_TYPE = new InjectionToken('dataType');
export const FILTER_TYPE = new InjectionToken('filterType');
export const DATA_SERVICE = new InjectionToken('dataService');
let ReferentialTable = ReferentialTable_1 = class ReferentialTable extends AppBaseTable {
    constructor(injector, accountService, referentialService, referentialRefService, formBuilder, popoverController, translate, dataType, filterType, entityService) {
        super(injector, dataType, filterType, 
        // columns
        RESERVED_START_COLUMNS
            .concat(BASE_REFERENTIAL_COLUMNS)
            .concat(RESERVED_END_COLUMNS), entityService || injector.get(ReferentialService), injector.get(ValidatorService), {
            prependNewElements: false,
            suppressErrors: environment.production,
            saveOnlyDirtyRows: true
        });
        this.accountService = accountService;
        this.referentialService = referentialService;
        this.referentialRefService = referentialRefService;
        this.formBuilder = formBuilder;
        this.popoverController = popoverController;
        this.translate = translate;
        this.$selectedEntity = new BehaviorSubject(undefined);
        this.$entities = new BehaviorSubject(undefined);
        this.$levels = new BehaviorSubject(undefined);
        this.detailsPath = {
            Program: '/referential/programs/:id',
            Software: '/referential/software/:id?label=:label',
            Pmfm: '/referential/pmfm/:id?label=:label',
            Parameter: '/referential/parameter/:id?label=:label',
            Method: '/referential/method/:id?label=:label',
            TaxonName: '/referential/taxonName/:id?label=:label',
            TaxonGroup: '/referential/taxonGroup/:id?label=:label',
            Metier: '/referential/metier/:id?label=:label',
            // Extraction (special case)
            ExtractionProduct: '/extraction/product/:id?label=:label'
        };
        this.dataTypes = {
            Parameter,
            Pmfm,
            TaxonName,
            Unit: FullReferential,
            Method,
            TaxonGroup: FullReferential
        };
        this.dataServices = {
            Parameter: ParameterService,
            Pmfm: PmfmService,
            TaxonName: TaxonNameService,
            Unit: ReferentialService,
            TaxonGroup: ReferentialService
        };
        this.dataValidators = {
            Method: MethodValidatorService
        };
        this.entityNamesWithParent = ['TaxonGroup', 'TaxonName'];
        // Pu sub entity class (not editable without a root entity)
        this.excludedEntityNames = [
            'QualitativeValue', 'RoundWeightConversion', 'WeightLengthConversion', 'ProgramPrivilege'
        ];
        this.statusList = StatusList;
        this.statusById = StatusById;
        this.importPolicies = ['insert-update', 'insert-only', 'update-only'];
        this.canOpenDetail = false;
        this.canDownload = false;
        this.canUpload = false;
        this.canSelectEntity = true;
        this.title = 'REFERENTIAL.LIST.TITLE';
        this.sticky = false;
        this.stickyEnd = false;
        this.compact = false;
        this.i18nColumnPrefix = 'REFERENTIAL.';
        this.allowRowDetail = false;
        this.confirmBeforeDelete = true;
        // Allow inline edition only if admin
        this.inlineEdition = accountService.isAdmin();
        this.canEdit = accountService.isAdmin();
        this.autoLoad = false; // waiting dataSource to be set
        const filterConfig = this.getFilterFormConfig();
        this.filterForm = this.formBuilder.group(filterConfig || {});
        // Default hidden columns
        this.excludesColumns.push('parent');
        if (this.mobile)
            this.excludesColumns.push('updateDate');
        // FOR DEV ONLY
        this.debug = true;
    }
    set showLevelColumn(value) {
        this.setShowColumn('level', value);
    }
    get showLevelColumn() {
        return this.getShowColumn('level');
    }
    set showParentColumn(value) {
        this.setShowColumn('parent', value);
    }
    get showParentColumn() {
        return this.getShowColumn('parent');
    }
    set entityName(value) {
        if (this._entityName !== value) {
            this._entityName = value;
            if (!this.loadingSubject.value) {
                this.applyEntityName(value, { skipLocationChange: true });
            }
        }
    }
    get entityName() {
        return this._entityName;
    }
    set importPolicy(value) {
        if (this.fileService && this.canUpload)
            this.fileService.importPolicy = value;
    }
    get importPolicy() {
        var _a;
        return ((_a = this.fileService) === null || _a === void 0 ? void 0 : _a.importPolicy) || 'insert-update';
    }
    ngOnInit() {
        super.ngOnInit();
        // Defaults
        this.persistFilterInSettings = toBoolean(this.persistFilterInSettings, this.canSelectEntity);
        // Configure autocomplete fields
        this.registerAutocompleteField('level', {
            items: this.$levels,
            mobile: this.mobile
        });
        this.registerAutocompleteField('levelId', {
            items: this.$levels,
            mobile: this.mobile
        });
        this.registerAutocompleteField('parent', {
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { entityName: this.entityName })),
            attributes: ['label', 'name'],
            displayWith: referentialToString
        });
        // Load entities
        this.registerSubscription(this.referentialService.watchTypes()
            .pipe(map(types => types
            .filter(type => !this.excludedEntityNames.includes(type.id))
            .map(type => ({
            id: type.id,
            label: this.getI18nEntityName(type.id),
            level: type.level,
            levelLabel: this.getI18nEntityName(type.level)
        }))), map(types => EntityUtils.sort(types, 'label')))
            .subscribe(types => this.$entities.next(types)));
        this.registerSubscription(this.onRefresh.subscribe(() => {
            this.filterForm.markAsUntouched();
            this.filterForm.markAsPristine();
        }));
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter(() => this.filterForm.valid), tap(value => {
            const filter = this.asFilter(value);
            this.filterCriteriaCount = filter.countNotEmptyCriteria();
            this.markForCheck();
            // Applying the filter
            this.setFilter(filter, { emitEvent: false });
        }), 
        // Save filter in settings (after a debounce time)
        debounceTime(500), tap(json => this.persistFilterInSettings && this.settings.savePageSetting(this.settingsId, json, REFERENTIAL_TABLE_SETTINGS_ENUM.FILTER_KEY)))
            .subscribe());
        // Restore compact mode
        this.restoreCompactMode();
        if (this.persistFilterInSettings) {
            this.restoreFilterOrLoad();
        }
        else if (this._entityName) {
            this.applyEntityName(this._entityName);
        }
    }
    restoreFilterOrLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsLoading();
            const json = this.settings.getPageSettings(this.settingsId, REFERENTIAL_TABLE_SETTINGS_ENUM.FILTER_KEY);
            console.debug('[referentials] Restoring filter from settings...', json);
            if (json === null || json === void 0 ? void 0 : json.entityName) {
                const filter = this.asFilter(json);
                this.filterForm.patchValue(json, { emitEvent: false });
                this.filterCriteriaCount = filter.countNotEmptyCriteria();
                this.markForCheck();
                return this.applyEntityName(filter.entityName);
            }
            // Check route parameters
            const { entity, q, level, status } = this.route.snapshot.queryParams;
            if (entity) {
                let levelRef;
                if (level) {
                    const levels = yield firstNotNilPromise(this.$levels);
                    levelRef = levels.find(l => l.id === level);
                }
                this.filterForm.patchValue({
                    entityName: entity,
                    searchText: q || null,
                    level: levelRef,
                    statusId: isNotNil(status) ? +status : null
                }, { emitEvent: false });
                return this.applyEntityName(entity, { skipLocationChange: true });
            }
            // Load default entity
            yield this.applyEntityName(this._entityName || entity || ReferentialTable_1.DEFAULT_ENTITY_NAME);
        });
    }
    applyEntityName(entityName, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = Object.assign({ emitEvent: true, skipLocationChange: false }, opts);
            this._entityName = entityName;
            this.canOpenDetail = false;
            this.canDownload = false;
            this.canUpload = false;
            this.resetError();
            // Wait end of entities loading
            if (this.canSelectEntity) {
                const entities = yield firstNotNilPromise(this.$entities);
                const entity = entities.find(e => e.id === entityName);
                if (!entity) {
                    throw new Error(`[referential] Entity {${entityName}} not found !`);
                }
                this.$selectedEntity.next(entity);
            }
            try {
                // Load levels
                yield this.loadLevels(entityName);
                const showLevelColumn = isNotEmptyArray(this.$levels.value);
                const showParentColumn = this.entityNamesWithParent.includes(entityName);
                const dataType = this.getDataType(entityName);
                const validator = this.getValidator(entityName);
                const dataService = this.getEntityService(entityName);
                const columnDefinitions = this.loadColumnDefinitions(dataType, validator, ['statusId', ...(showLevelColumn && ['levelId'] || [])], [
                    ...IGNORED_ENTITY_COLUMNS,
                    'creationDate', 'updateDate',
                    ...(!showParentColumn && ['parent'] || [])
                ]);
                if (this.fileService) {
                    this.fileService.columnDefinitions = columnDefinitions;
                    this.fileService.dataType = dataType;
                    this.fileService.dataService = dataService;
                    this.fileService.entityName = entityName;
                }
                else {
                    this.fileService = new ReferentialFileService(this.injector, this.dataSource, columnDefinitions, dataService, dataType);
                    this.fileService.i18nColumnPrefix = this.i18nColumnPrefix;
                    this.fileService.defaultNewRowValue = () => this.defaultNewRowValue();
                    this.fileService.isKnownEntityName = (name) => this.isKnownEntityName(name);
                    this.fileService.loadByLabel = (label, filter) => this.loadByLabel(label, filter);
                    this.fileService.entityName = entityName;
                    this.fileService.loadLevelById = (levelId) => (this.$levels.value || []).find(l => l.id === levelId);
                    this.fileService.loadStatusById = (statusId) => this.statusById[statusId];
                }
                // Load dynamic columns
                // TODO enable this
                //this.columnDefinitions = this.loadColumnDefinitions(dataType, validator);
                this.columnDefinitions = [];
                this.displayedColumns = this.getDisplayColumns();
                // Show/Hide some columns (only if entityname can change, otherwise user should show/hide using @Input())
                if (this.canSelectEntity) {
                    // Level columns
                    this.showLevelColumn = isNotEmptyArray(this.$levels.value);
                    // Hide parent columns
                    this.showParentColumn = this.entityNamesWithParent.includes(entityName);
                }
                this.canOpenDetail = !!this.detailsPath[entityName];
                this.inlineEdition = !this.canOpenDetail;
                this.canDownload = !!this.getEntityService(entityName);
                this.canUpload = this.accountService.isAdmin() && this.canDownload && !!this.getDataType(entityName);
                this.i18nParentName = this.computeI18nParentName(entityName);
                // Applying the filter (will reload if emitEvent = true)
                const filter = this.asFilter(Object.assign(Object.assign({}, this.filterForm.value), { level: null, entityName }));
                this.filterForm.patchValue({ entityName, level: null }, { emitEvent: false });
                this.setFilter(filter, { emitEvent: opts.emitEvent });
                // Update route location
                if (opts.skipLocationChange !== true && this.canSelectEntity) {
                    this.router.navigate(['.'], {
                        relativeTo: this.route,
                        skipLocationChange: false,
                        queryParams: {
                            entity: entityName
                        }
                    });
                }
            }
            catch (err) {
                console.error(err);
                this.setError(err);
            }
        });
    }
    defaultNewRowValue() {
        return { entityName: this.entityName, statusId: StatusIds.ENABLE };
    }
    onEntityNameChange(entityName) {
        return __awaiter(this, void 0, void 0, function* () {
            // No change: skip
            if (this._entityName === entityName)
                return;
            this.applyEntityName(entityName);
        });
    }
    addRow(event) {
        const _super = Object.create(null, {
            addRow: { get: () => super.addRow }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Create new row
            const result = yield _super.addRow.call(this, event);
            if (!result)
                return result;
            const row = this.dataSource.getRow(-1);
            row.validator.controls['entityName'].setValue(this._entityName);
            return true;
        });
    }
    loadLevels(entityName) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.referentialRefService.loadLevels(entityName, {
                fetchPolicy: 'network-only'
            });
            const levels = (res || []).sort(EntityUtils.sortComparator('label', 'asc'));
            this.$levels.next(levels);
            if (isNotEmptyArray(levels)) {
                const parentEntityName = levels[0].entityName;
                const i18nLevelName = 'REFERENTIAL.ENTITY.' + changeCaseToUnderscore(parentEntityName).toUpperCase();
                const levelName = this.translate.instant(i18nLevelName);
                this.i18nLevelName = (levelName !== i18nLevelName) ? levelName : ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
            }
            else {
                this.i18nLevelName = ReferentialI18nKeys.DEFAULT_I18N_LEVEL_NAME;
            }
            return res;
        });
    }
    computeI18nParentName(entityName) {
        const i18nKey = 'REFERENTIAL.' + changeCaseToUnderscore(entityName).toUpperCase() + '.PARENT';
        const translation = this.translate.instant(i18nKey);
        return (translation !== i18nKey) ? translation : ReferentialI18nKeys.DEFAULT_I18N_PARENT_NAME;
    }
    getI18nEntityName(entityName) {
        if (isNil(entityName))
            return undefined;
        const tableName = entityName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
        const key = `REFERENTIAL.ENTITY.${tableName}`;
        let message = this.translate.instant(key);
        if (message !== key)
            return message;
        // No I18n translation: continue
        // Use tableName, but replace underscore with space
        message = tableName.replace(/[_-]+/g, ' ').toUpperCase() || '';
        // First letter as upper case
        if (message.length > 1) {
            return message.substring(0, 1) + message.substring(1).toLowerCase();
        }
        return message;
    }
    openRow(id, row) {
        const _super = Object.create(null, {
            openRow: { get: () => super.openRow }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const path = this.detailsPath[this._entityName];
            if (isNotNilOrBlank(path)) {
                yield this.router.navigateByUrl(path
                    // Replace the id in the path
                    .replace(':id', isNotNil(row.currentData.id) ? row.currentData.id.toString() : '')
                    // Replace the label in the path
                    .replace(':label', row.currentData.label || ''));
                return true;
            }
            return _super.openRow.call(this, id, row);
        });
    }
    clearControlValue(event, formControl) {
        if (event)
            event.stopPropagation(); // Avoid to enter input the field
        formControl.setValue(null);
        return false;
    }
    toggleFilterPanelFloating() {
        this.filterPanelFloating = !this.filterPanelFloating;
        this.markForCheck();
    }
    applyFilterAndClosePanel(event) {
        this.onRefresh.emit(event);
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
    }
    closeFilterPanel() {
        if (this.filterExpansionPanel)
            this.filterExpansionPanel.close();
    }
    resetFilter(event) {
        this.filterForm.reset({ entityName: this._entityName }, { emitEvent: true });
        const filter = this.asFilter({});
        this.setFilter(filter, { emitEvent: true });
        this.filterCriteriaCount = 0;
        if (this.filterExpansionPanel && this.filterPanelFloating)
            this.filterExpansionPanel.close();
    }
    patchFilter(partialFilter) {
        this.filterForm.patchValue(partialFilter, { emitEvent: true });
        const filter = this.asFilter(this.filterForm.value);
        this.setFilter(filter, { emitEvent: true });
        this.filterExpansionPanel.close();
    }
    restoreCompactMode(opts) {
        if (!this.compact) {
            const compact = this.settings.getPageSettings(this.settingsId, REFERENTIAL_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY) || false;
            if (this.compact !== compact) {
                this.compact = compact;
                if (!opts || opts.emitEvent !== false) {
                    this.markForCheck();
                }
            }
        }
    }
    toggleCompactMode() {
        this.compact = !this.compact;
        this.markForCheck();
        this.settings.savePageSetting(this.settingsId, this.compact, REFERENTIAL_TABLE_SETTINGS_ENUM.COMPACT_ROWS_KEY);
    }
    exportToJson(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._entityName)
                return; // Skip
            const ids = this.selection.hasValue() && this.selection.selected.map(row => row.currentData.id);
            yield this.fileService.exportToJson(event, { ids, context: (_a = this.filter) === null || _a === void 0 ? void 0 : _a.asObject() });
        });
    }
    exportToCsv(event) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._entityName)
                return; // Skip
            const ids = this.selection.hasValue() && this.selection.selected.map(row => row.currentData.id);
            yield this.fileService.exportToCsv(event, { ids, context: (_a = this.filter) === null || _a === void 0 ? void 0 : _a.asObject() });
        });
    }
    importFromCsv(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canEdit)
                return; // skip
            try {
                yield this.fileService.importFromCsv(event);
                yield sleep(1000);
                this.onRefresh.emit();
            }
            catch (err) {
                console.error(err);
                this.setError(err);
            }
        });
    }
    importFromJson(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.canEdit)
                return; // skip
            try {
                yield this.fileService.importFromJson(event);
                yield sleep(1000);
                this.onRefresh.emit();
            }
            catch (err) {
                console.error(err);
                this.setError(err);
            }
        });
    }
    /* -- protected functions -- */
    loadByLabel(label, filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                throw new Error('Missing required argument \'label\'');
            const entityName = filter === null || filter === void 0 ? void 0 : filter.entityName;
            if (!entityName)
                throw new Error('Missing required argument \'source.entityName\', or \'filter.entityName\'');
            const service = this.getEntityService(entityName);
            if (!service)
                throw new Error('No service defined for the entity name: ' + entityName);
            const dataType = this.getDataType(entityName);
            if (!dataType)
                throw new Error('No dataType defined for the entity name: ' + entityName);
            try {
                const { data, total } = yield this.referentialService.loadAll(0, 1, 'label', 'asc', Object.assign(Object.assign({}, filter), { entityName,
                    label }));
                if (total === 0)
                    return undefined;
                if (total > 1)
                    throw { code: ErrorCodes.TOO_MANY_REFERENCE_FOUND, message: `To many match of ${entityName} with label ${label}` };
                const json = data[0];
                const target = new dataType();
                target.fromObject(json);
                return target;
            }
            catch (err) {
                const message = err && err.message || err;
                console.error(message);
                throw err;
            }
        });
    }
    registerAutocompleteFields() {
        // Can be overwritten by subclasses
    }
    loadColumnDefinitions(dataType, validatorService, includedProperties, excludedProperties) {
        const properties = BaseReferentialTable.getEntityDisplayProperties(dataType, validatorService, excludedProperties || IGNORED_ENTITY_COLUMNS);
        // Force include properties (e.g. level)
        if (includedProperties)
            includedProperties === null || includedProperties === void 0 ? void 0 : includedProperties.filter(p => !properties.includes(p)).forEach(p => properties.push(p));
        return properties.map(key => this.getColumnDefinition(key));
    }
    getColumnDefinition(key) {
        if (this.autocompleteFields[key]) {
            return {
                key,
                type: 'entity',
                label: (this.i18nColumnPrefix) + changeCaseToUnderscore(key).toUpperCase(),
                autocomplete: this.autocompleteFields[key]
            };
        }
        return {
            key,
            type: this.getColumnType(key),
            label: (this.i18nColumnPrefix) + changeCaseToUnderscore(key).toUpperCase()
        };
    }
    getColumnType(key) {
        if (key === 'id' || key.endsWith('Id'))
            return 'integer';
        key = key.toLowerCase();
        if (key.endsWith('date'))
            return 'date';
        if (key.endsWith('month') || key.endsWith('year'))
            return 'integer';
        if (key.startsWith('is'))
            return 'boolean';
        if (key.endsWith('label') || key.endsWith('name') || key.endsWith('code')
            || key.endsWith('description') || key.endsWith('comments'))
            return 'string';
        return 'string';
    }
    getDisplayColumns() {
        const columns = removeDuplicatesFromArray(super.getDisplayColumns())
            .filter(key => !RESERVED_END_COLUMNS.includes(key));
        const additionalColumns = (this.columnDefinitions || []).map(col => col.key)
            .filter(key => !columns.includes(key));
        return columns
            .concat(additionalColumns)
            .concat(RESERVED_END_COLUMNS);
    }
    getFilterFormConfig() {
        console.debug('[referential-table] Creating filter form group...');
        // Base form config
        const config = {
            entityName: [null],
            searchText: [null],
            level: [null],
            parentId: [null],
            statusId: [null]
        };
        // Add other properties
        return Object.keys(new this.filterType())
            .filter(key => !IGNORED_ENTITY_COLUMNS.includes(key) && !config[key])
            .reduce((config, key) => {
            console.debug('[referential-table] Adding filter control: ' + key);
            config[key] = [null];
            return config;
        }, config);
    }
    getEntityService(entityName) {
        entityName = entityName || this._entityName;
        if (!entityName)
            throw new Error('Missing required argument \'entityName\'');
        const serviceToken = this.dataServices[entityName];
        const service = serviceToken && this.injector.get(serviceToken);
        if (service && (typeof service.load !== 'function' || typeof service.save !== 'function'))
            throw new Error('Not a entities service. Missing load() or save()');
        if (service)
            return service;
        // Check if can be managed by generic service
        if (!this.isKnownEntityName(entityName))
            return undefined;
        return this.referentialService;
    }
    getDataType(entityName) {
        entityName = entityName || this._entityName;
        const dataType = this.dataTypes[entityName];
        if (dataType)
            return dataType;
        // Check if can be managed by generic class
        if (!this.isKnownEntityName(entityName))
            return undefined;
        return Referential;
    }
    getValidator(entityName) {
        entityName = entityName || this._entityName;
        const validatorToken = this.dataValidators[entityName];
        const validator = validatorToken && this.injector.get(validatorToken);
        if (validator)
            return validator;
        // Check if can be managed by generic class
        if (!this.isKnownEntityName(entityName))
            return undefined;
        return this.validatorService;
    }
    isKnownEntityName(entityName) {
        if (!entityName)
            return false;
        return !!(this.$entities.value || []).find(item => item.id === entityName);
    }
    openNewRowDetail() {
        const _super = Object.create(null, {
            openNewRowDetail: { get: () => super.openNewRowDetail }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const path = this.detailsPath[this._entityName];
            if (path) {
                yield this.router.navigateByUrl(path
                    .replace(':id', 'new')
                    .replace(':label', ''));
                return true;
            }
            return _super.openNewRowDetail.call(this);
        });
    }
    asFilter(source) {
        return super.asFilter(Object.assign({ entityName: (source === null || source === void 0 ? void 0 : source.entityName) || this._entityName }, source));
    }
};
ReferentialTable.DEFAULT_ENTITY_NAME = 'Pmfm';
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ReferentialTable.prototype, "showLevelColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], ReferentialTable.prototype, "showParentColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "canOpenDetail", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "canDownload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "canUpload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "canSelectEntity", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ReferentialTable.prototype, "persistFilterInSettings", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ReferentialTable.prototype, "entityName", null);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], ReferentialTable.prototype, "importPolicy", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "sticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "stickyEnd", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialTable.prototype, "compact", void 0);
__decorate([
    ViewChild(MatExpansionPanel, { static: true }),
    __metadata("design:type", MatExpansionPanel)
], ReferentialTable.prototype, "filterExpansionPanel", void 0);
ReferentialTable = ReferentialTable_1 = __decorate([
    Component({
        selector: 'app-referential-page',
        templateUrl: 'referential.table.html',
        styleUrls: ['referential.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: ReferentialValidatorService },
            { provide: DATA_TYPE, useValue: Referential },
            { provide: FILTER_TYPE, useValue: ReferentialFilter },
            { provide: DATA_SERVICE, useExisting: ReferentialService },
        ],
        animations: [slideUpDownAnimation]
    }),
    __param(7, Optional()),
    __param(7, Inject(DATA_TYPE)),
    __param(8, Optional()),
    __param(8, Inject(FILTER_TYPE)),
    __param(9, Optional()),
    __param(9, Inject(DATA_SERVICE)),
    __metadata("design:paramtypes", [Injector,
        AccountService,
        ReferentialService,
        ReferentialRefService,
        UntypedFormBuilder,
        PopoverController,
        TranslateService, Function, Function, Object])
], ReferentialTable);
export { ReferentialTable };
//# sourceMappingURL=referential.table.js.map