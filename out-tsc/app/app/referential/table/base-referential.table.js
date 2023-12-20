var BaseReferentialTable_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector, Input, ViewChild } from '@angular/core';
import { AppFormUtils, changeCaseToUnderscore, CsvUtils, FileResponse, FilesUtils, firstNotNilPromise, isEmptyArray, isNil, isNotNil, isNotNilOrBlank, PropertyFormatPipe, sleep, StartableService, StatusById, StatusList, suggestFromArray, } from '@sumaris-net/ngx-components';
import { AppBaseTable, BASE_TABLE_SETTINGS_ENUM } from '@app/shared/table/base.table';
import { UntypedFormBuilder } from '@angular/forms';
import { debounceTime, filter, switchMap, tap } from 'rxjs/operators';
import { IonInfiniteScroll, PopoverController } from '@ionic/angular';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { BehaviorSubject, isObservable, of, Subject } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
export const IGNORED_ENTITY_COLUMNS = ['__typename', 'id', 'updateDate'];
let BaseReferentialTable = BaseReferentialTable_1 = class BaseReferentialTable extends AppBaseTable {
    constructor(injector, dataType, filterType, entityService, validatorService, options) {
        super(injector, dataType, filterType, ((options === null || options === void 0 ? void 0 : options.propertyNames) || BaseReferentialTable_1.getEntityDisplayProperties(dataType)), entityService, validatorService, options);
        this.showIdColumn = false;
        this.canDownload = false;
        this.canUpload = false;
        this.$status = new BehaviorSubject(null);
        this.referentialRefService = injector.get(ReferentialRefService);
        this.propertyFormatPipe = injector.get(PropertyFormatPipe);
        this.popoverController = injector.get(PopoverController);
        this.title = this.i18nColumnPrefix && (this.i18nColumnPrefix + 'TITLE') || '';
        this.logPrefix = '[base-referential-table] ';
        this.canUpload = (options === null || options === void 0 ? void 0 : options.canUpload) || false;
        this.withStatusId = this.columns.includes('statusId');
        const filterFormConfig = this.getFilterFormConfig();
        this.filterForm = filterFormConfig && injector.get(UntypedFormBuilder).group(filterFormConfig);
    }
    /**
     * Compute columns from entity
     *
     * @param dataType
     * @param validatorService
     * @param excludedProperties
     */
    static getEntityDisplayProperties(dataType, validatorService, excludedProperties) {
        excludedProperties = excludedProperties || IGNORED_ENTITY_COLUMNS;
        return Object.keys(validatorService && validatorService.getRowValidator().controls || new dataType())
            .filter(key => !excludedProperties.includes(key));
    }
    static getFirstEntityColumn(dataType, excludedProperties) {
        excludedProperties = excludedProperties || IGNORED_ENTITY_COLUMNS;
        return Object.keys(new dataType()).find(key => !excludedProperties.includes(key));
    }
    ngOnInit() {
        var _a;
        super.ngOnInit();
        // Status
        if (this.withStatusId) {
            this.registerSubscription(this.translate.get(StatusList.map(status => status.label))
                .subscribe(translations => {
                const items = StatusList.map(status => (Object.assign(Object.assign({}, status), { label: translations[status.label] })));
                this.$status.next(items);
            }));
            this.registerAutocompleteField('statusId', {
                showAllOnFocus: false,
                items: this.$status,
                attributes: ['label'],
                displayWith: (statusId) => {
                    if (typeof statusId === 'object') {
                        return statusId['label'];
                    }
                    return this.translate.instant(StatusById[statusId].label);
                },
                mobile: this.mobile
            });
        }
        // Register autocomplete fields, BEFORE loading column definitions
        this.registerAutocompleteFields();
        this.columnDefinitions = this.loadColumnDefinitions(this.options);
        this.defaultSortBy = ((_a = this.columnDefinitions[0]) === null || _a === void 0 ? void 0 : _a.key) || 'id';
        this.registerSubscription(this.onRefresh.subscribe(() => {
            this.filterForm.markAsUntouched();
            this.filterForm.markAsPristine();
        }));
        // Update filter when changes
        this.registerSubscription(this.filterForm.valueChanges
            .pipe(debounceTime(250), filter((_) => {
            const valid = this.filterForm.valid;
            if (!valid && this.debug)
                AppFormUtils.logFormErrors(this.filterForm);
            return valid;
        }), 
        // Update the filter, without reloading the content
        tap(json => this.setFilter(json, { emitEvent: false })), 
        // Save filter in settings (after a debounce time)
        debounceTime(500), tap(json => this.settings.savePageSetting(this.settingsId, json, BASE_TABLE_SETTINGS_ENUM.filterKey)))
            .subscribe());
        this.ready().then(() => this.restoreFilterOrLoad());
    }
    ready() {
        const _super = Object.create(null, {
            ready: { get: () => super.ready }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield (this._dataService instanceof StartableService
                ? this._dataService.ready()
                : this.settings.ready());
            return _super.ready.call(this);
        });
    }
    exportToCsv(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const filename = this.getExportFileName();
            const separator = this.getExportSeparator();
            const encoding = this.getExportEncoding();
            const headers = this.columnDefinitions.map(def => def.key);
            const rows = this.dataSource.getRows()
                .map(element => element.currentData)
                .map(data => this.columnDefinitions.map(definition => this.propertyFormatPipe.transform(data, definition)));
            CsvUtils.exportToFile(rows, { filename, headers, separator, encoding });
        });
    }
    importFromCsv(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield FilesUtils.showUploadPopover(this.popoverController, event, {
                uniqueFile: true,
                fileExtension: '.csv',
                uploadFn: (file) => this.uploadFile(file)
            });
            const entities = (data || []).flatMap(file => { var _a; return ((_a = file.response) === null || _a === void 0 ? void 0 : _a.body) || []; });
            if (isEmptyArray(entities))
                return; // No entities: skip
            console.info(this.logPrefix + `Importing ${entities.length} entities...`, entities);
            // Keep non exists entities
            const newEntities = entities.filter(entity => isNil(entity.id));
            // Add entities, one by one
            yield this.dataSource.dataService.saveAll(newEntities);
            yield sleep(1000);
            this.onRefresh.emit();
        });
    }
    /* -- protected functions -- */
    loadColumnDefinitions(options) {
        return ((options === null || options === void 0 ? void 0 : options.propertyNames) || BaseReferentialTable_1.getEntityDisplayProperties(this.dataType))
            .map(key => this.getColumnDefinition(key, options));
    }
    registerAutocompleteFields() {
        // Can be overwritten by subclasses
    }
    getColumnDefinition(key, options) {
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
    getFilterFormConfig() {
        console.debug(this.logPrefix + ' Creating filter form group...');
        return BaseReferentialTable_1.getEntityDisplayProperties(this.filterType, this.validatorService)
            .reduce((config, key) => {
            console.debug(this.logPrefix + ' Adding filter control: ' + key);
            config[key] = [null];
            return config;
        }, {});
    }
    getExportFileName() {
        var _a;
        const key = this.i18nColumnPrefix + 'EXPORT_CSV_FILENAME';
        const filename = this.translate.instant(key, (_a = this.filter) === null || _a === void 0 ? void 0 : _a.asObject());
        if (filename !== key)
            return filename;
        return 'export.csv'; // Default filename
    }
    getExportSeparator() {
        const key = 'FILE.CSV.SEPARATOR';
        const separator = this.translate.instant(key);
        if (separator !== key)
            return separator;
        return ','; // Default separator
    }
    getExportEncoding() {
        const key = 'FILE.CSV.ENCODING';
        const encoding = this.translate.instant(key);
        if (encoding !== key)
            return encoding;
        return 'UTF-8'; // Default encoding
    }
    uploadFile(file) {
        console.info(this.logPrefix + `Importing CSV file ${file.name}...`);
        const separator = this.getExportSeparator();
        const encoding = this.getExportEncoding();
        return CsvUtils.parseFile(file, { encoding, separator })
            .pipe(switchMap(event => {
            if (event.type === HttpEventType.UploadProgress) {
                const loaded = Math.round(event.loaded * 0.8);
                return of(Object.assign(Object.assign({}, event), { loaded }));
            }
            else if (event instanceof FileResponse) {
                return this.uploadCsvRows(event.body);
            }
            // Unknown event: skip
            else {
                return of();
            }
        }), filter(isNotNil));
    }
    uploadCsvRows(rows) {
        if (!rows || rows.length <= 1)
            throw { message: 'FILE.CSV.ERROR.EMPTY_FILE' };
        const $progress = new Subject();
        const headerNames = rows.splice(0, 1)[0];
        const total = rows.length;
        console.debug(this.logPrefix + `Importing ${total} rows...`);
        // Check headers
        if (headerNames.length <= 1) {
            const message = this.translate.instant('FILE.CSV.ERROR.NO_HEADER_OR_INVALID_SEPARATOR', {
                separator: this.getExportSeparator()
            });
            throw { message };
        }
        // Check column names
        console.debug(this.logPrefix + `Checking headers: ${headerNames.join(',')}`);
        const expectedHeaders = this.columnDefinitions.map(def => def.key);
        const unknownHeaders = headerNames.filter(h => !expectedHeaders.includes(h));
        if (unknownHeaders.length) {
            const message = this.translate.instant('FILE.CSV.ERROR.UNKNOWN_HEADERS', {
                headers: unknownHeaders.join(', ')
            });
            throw { message };
        }
        $progress.next({ type: HttpEventType.UploadProgress, loaded: -1 });
        const headers = headerNames.map(key => this.columnDefinitions.find(def => def.key === key));
        this.parseCsvRowsToEntities(headers, rows)
            .then(entities => this.resolveEntitiesFields(headers, entities))
            .then(entities => this.fillEntitiesId(entities))
            .then((entities) => {
            $progress.next(new FileResponse({ body: entities }));
            $progress.complete();
        })
            .catch(err => $progress.error(err));
        return $progress.asObservable();
    }
    parseCsvRowsToEntities(headers, rows) {
        return __awaiter(this, void 0, void 0, function* () {
            const defaultValue = this.defaultNewRowValue();
            return rows
                .filter(cells => (cells === null || cells === void 0 ? void 0 : cells.length) === headers.length)
                .map(cells => {
                // Convert to object
                const source = headers.reduce((res, fieldDef, i) => {
                    var _a;
                    const value = cells[i];
                    // Parse sub-object
                    const attributes = (_a = fieldDef.autocomplete) === null || _a === void 0 ? void 0 : _a.attributes;
                    if (attributes === null || attributes === void 0 ? void 0 : attributes.length) {
                        res[fieldDef.key] = value === null || value === void 0 ? void 0 : value.split(' - ', attributes.length).reduce((o, v, j) => {
                            o[attributes[j]] = v;
                            return o;
                        }, {});
                    }
                    // Parse simple field
                    else {
                        if (fieldDef.type === 'integer') {
                            res[fieldDef.key] = parseInt(value);
                        }
                        else if (fieldDef.type === 'double') {
                            res[fieldDef.key] = parseFloat(value);
                        }
                        else {
                            res[fieldDef.key] = isNotNilOrBlank(value) ? value : undefined;
                        }
                    }
                    // Remove null value, to force keeping defaultValue
                    if (isNil(res[fieldDef.key])) {
                        delete res[fieldDef.key];
                    }
                    return res;
                }, {});
                return Object.assign(Object.assign({}, defaultValue), source);
            });
        });
    }
    resolveEntitiesFields(headers, entities) {
        return __awaiter(this, void 0, void 0, function* () {
            const autocompleteFields = headers.filter(def => def.autocomplete && (!!def.autocomplete.suggestFn || def.autocomplete.items));
            if (isEmptyArray(autocompleteFields))
                return entities;
            // Prepare suggest functions, from  autocomplete field
            const suggestFns = autocompleteFields
                .map(def => def.autocomplete)
                .map(autocomplete => autocomplete.suggestFn
                || (isObservable(autocomplete.items)
                    && ((value, opts) => __awaiter(this, void 0, void 0, function* () {
                        const items = yield firstNotNilPromise(autocomplete.items);
                        return suggestFromArray(items, value, opts);
                    })))
                || ((value, opts) => suggestFromArray(autocomplete.items, value, opts)));
            const result = [];
            // For each entities
            for (const entity of entities) {
                let incomplete = false;
                // For each field to resolve
                for (let i = 0; i < autocompleteFields.length; i++) {
                    const field = autocompleteFields[i];
                    const suggestFn = suggestFns[i];
                    const attributes = field.autocomplete.attributes || [];
                    const obj = entity[field.key];
                    let resolveObj;
                    for (const searchAttribute of attributes) {
                        const searchValue = obj[searchAttribute];
                        const res = yield suggestFn(searchValue, Object.assign(Object.assign({}, field.autocomplete.filter), { searchAttribute }));
                        const matches = res && (Array.isArray(res) ? res : res.data);
                        if (matches.length === 1) {
                            resolveObj = matches[0];
                            break;
                        }
                    }
                    // Replace existing object
                    if (resolveObj) {
                        entity[field.key] = resolveObj;
                    }
                    // Not resolved: warn
                    else {
                        incomplete = true;
                        console.warn(this.logPrefix + `Cannot resolve field ${field.key}`, obj);
                    }
                    if (incomplete)
                        break; // Stop if incomplete
                }
                // If complete entity: add to result
                if (!incomplete)
                    result.push(entity);
            }
            // Convert to entity
            return result.map(source => {
                const target = new this.dataType();
                target.fromObject(source);
                return target;
            });
        });
    }
    fillEntitiesId(entities) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: manage pagination - using JobUtils.fetchAllPages() ?
            const existingEntities = (yield this.dataSource.getData());
            // DEBUG - DEV only
            /*entities.forEach((entity, i) => {
              entity.id = -1 as any; // Avoid using ID in equals()
              const other = existingEntities[i];
              if (!entity.equals(other)) {
                console.debug('[diff] There is diff between: ', entity, other);
                DebugUtils.logEntityDiff(entity, other);
              }
            });*/
            entities.forEach(entity => {
                entity.id = -1; // Avoid equals() to use function unique key, instead of id
                const existingEntity = existingEntities.find(other => entity.equals(other));
                // Copy ID, or unset
                entity.id = isNotNil(existingEntity) ? existingEntity.id : undefined;
            });
            return entities;
        });
    }
    defaultNewRowValue() {
        const statusId = this.withStatusId && (this.$status.value || [])[0] || undefined;
        return {
            statusId
        };
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], BaseReferentialTable.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseReferentialTable.prototype, "showIdColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseReferentialTable.prototype, "canDownload", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BaseReferentialTable.prototype, "canUpload", void 0);
__decorate([
    ViewChild(IonInfiniteScroll),
    __metadata("design:type", IonInfiniteScroll)
], BaseReferentialTable.prototype, "infiniteScroll", void 0);
BaseReferentialTable = BaseReferentialTable_1 = __decorate([
    Directive(),
    __metadata("design:paramtypes", [Injector, Function, Function, Object, Object, Object])
], BaseReferentialTable);
export { BaseReferentialTable };
//# sourceMappingURL=base-referential.table.js.map