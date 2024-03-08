import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector, Input } from '@angular/core';
import { isObservable, of, Subject } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { chainPromises, changeCaseToUnderscore, CsvUtils, EntitiesTableDataSource, EntityUtils, FileResponse, FilesUtils, firstNotNilPromise, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, JobUtils, JsonUtils, PropertyFormatPipe, ReferentialUtils, suggestFromArray, Toasts, } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { HttpEventType } from '@angular/common/http';
import { PopoverController, ToastController } from '@ionic/angular';
import { AppReferentialUtils } from '@app/core/services/model/referential.utils';
import { ReferentialService } from '@app/referential/services/referential.service';
import { ErrorCodes } from '@app/referential/services/errors';
let ReferentialFileService = class ReferentialFileService {
    constructor(injector, dataSource, columnDefinitions, dataService, dataType) {
        var _a;
        this.dataSource = dataSource;
        this.logPrefix = '[referential-csv-helper] ';
        this.importPolicy = 'insert-update';
        this.translate = injector.get(TranslateService);
        this.toastController = injector.get(ToastController);
        this.popoverController = injector.get(PopoverController);
        this.propertyFormatPipe = injector.get(PropertyFormatPipe);
        this.columnDefinitions = columnDefinitions;
        this.dataService = dataService;
        this.dataType = dataType;
        this.entityName = (_a = new dataType()) === null || _a === void 0 ? void 0 : _a.entityName;
    }
    exportToCsv(event, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const filename = this.getCsvExportFileName(opts === null || opts === void 0 ? void 0 : opts.context);
            const separator = this.getCsvExportSeparator();
            const encoding = this.getExportEncoding();
            const headers = this.columnDefinitions.map(def => def.key);
            const entities = yield this.loadEntities(opts);
            const rows = entities.map(data => this.columnDefinitions.map(definition => {
                if (definition.key === 'levelId' && isNotNil(data.levelId) && this.loadLevelById) {
                    const levelId = this.loadLevelById(data.levelId);
                    return this.propertyFormatPipe.transform({ levelId }, definition);
                }
                return this.propertyFormatPipe.transform(data, definition);
            }));
            CsvUtils.exportToFile(rows, { filename, headers, separator, encoding });
        });
    }
    importFromCsv(event, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let entities;
            try {
                const { data } = yield FilesUtils.showUploadPopover(this.popoverController, event, {
                    uniqueFile: true,
                    fileExtension: '.csv',
                    uploadFn: (file) => this.uploadCsvFile(file, filter)
                });
                entities = (data || []).flatMap(file => { var _a; return ((_a = file.response) === null || _a === void 0 ? void 0 : _a.body) || []; });
            }
            catch (err) {
                const message = err && err.message || err;
                this.showToast({
                    type: 'error',
                    message: 'REFERENTIAL.ERROR.IMPORT_ENTITIES_ERROR',
                    messageParams: { error: message },
                    showCloseButton: true,
                    duration: -1
                });
                return;
            }
            yield this.importEntities(entities, opts);
        });
    }
    getCsvExportFileName(context) {
        const key = this.i18nColumnPrefix + 'EXPORT_CSV_FILENAME';
        const filename = this.translate.instant(key, context || {});
        if (filename !== key)
            return filename;
        return `${changeCaseToUnderscore(this.entityName)}.csv`; // Default filename
    }
    getCsvExportSeparator() {
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
    uploadCsvFile(file, dataFilter) {
        console.info(this.logPrefix + `Importing CSV file ${file.name}...`);
        const separator = this.getCsvExportSeparator();
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
                separator: this.getCsvExportSeparator()
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
            .then(entities => this.resolveCsvEntityColumns(headers, entities))
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
    resolveCsvEntityColumns(headers, entities) {
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
                        if (isNotNilOrBlank(searchValue)) {
                            const res = yield suggestFn(searchValue, Object.assign(Object.assign({}, field.autocomplete.filter), { searchAttribute }));
                            const matches = res && (Array.isArray(res) ? res : res.data);
                            if (matches.length === 1) {
                                resolveObj = matches[0];
                                break;
                            }
                        }
                    }
                    // Replace existing object
                    if (resolveObj) {
                        entity[field.key] = resolveObj;
                    }
                    // Not resolved: warn
                    else if (field.key !== 'parent') {
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
            if (this.dataService instanceof ReferentialService)
                return entities;
            yield JobUtils.fetchAllPages((offset, size) => this.dataSource.dataService.watchAll(offset, size, 'id', 'asc', {
                entityName: this.entityName
            }).toPromise(), {
                onPageLoaded: ({ data }) => {
                    entities.filter(e => isNil(e.id))
                        .forEach(entity => {
                        // Avoid equals() to use function unique key, instead of id
                        entity.id = -1;
                        // Try to find the entity (ignoring id)
                        const existingEntity = data.find(other => entity.equals(other));
                        // Copy ID, or unset
                        entity.id = isNotNil(existingEntity) ? existingEntity.id : undefined;
                    });
                }
            });
            return entities;
        });
    }
    getJsonExportFileName(context) {
        const key = this.i18nColumnPrefix + 'EXPORT_JSON_FILENAME';
        const filename = this.translate.instant(key, context || {});
        if (filename !== key)
            return filename;
        return `${changeCaseToUnderscore(this.entityName)}.json`; // Default filename
    }
    exportToJson(event, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const filename = this.getJsonExportFileName(opts === null || opts === void 0 ? void 0 : opts.context);
            const entities = yield this.loadEntities(opts);
            JsonUtils.exportToFile(entities, { filename });
        });
    }
    importFromJson(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield FilesUtils.showUploadPopover(this.popoverController, event, {
                uniqueFile: true,
                fileExtension: '.json',
                uploadFn: (file) => this.parseJsonFile(file)
            });
            const sources = (data || []).flatMap(file => { var _a; return ((_a = file.response) === null || _a === void 0 ? void 0 : _a.body) || []; });
            if (isEmptyArray(sources))
                return; // No entities: skip
            return this.importEntities(sources);
        });
    }
    importEntities(sources, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const importPolicy = (opts === null || opts === void 0 ? void 0 : opts.importPolicy) || this.importPolicy || 'insert-update';
            // Remove entities with id, if policy = 'insert only'
            if (importPolicy === 'insert-only') {
                sources = sources.filter(source => isNil(source.id));
                if (isEmptyArray(sources))
                    return; // No new entities
            }
            // Sort by ID, to be able to import in the same order
            sources = EntityUtils.sort(sources, 'id', 'asc');
            console.info(`[referential-table] Importing ${sources.length} entities...`, sources);
            let insertCount = 0;
            let updateCount = 0;
            let skipCount = 0;
            const errors = [];
            // Save entities, one by one
            const entities = ((yield chainPromises(sources
                // Keep non exists entities
                .filter(source => source
                // Check as label
                && isNotNilOrBlank(source.label)
                // Check expected entity class
                && AppReferentialUtils.getEntityName(source) === this.entityName)
                .map(source => () => __awaiter(this, void 0, void 0, function* () {
                // Clean ids, update_date, etc.
                AppReferentialUtils.cleanIdAndDates(source, false);
                try {
                    // Collect all entities
                    const missingReferences = [];
                    const allSources = AppReferentialUtils.collectEntities(source);
                    // For each resource (by not self)
                    const internalSources = (allSources === null || allSources === void 0 ? void 0 : allSources.slice(1)) || [];
                    for (const internalSource of internalSources) {
                        const subEntityName = AppReferentialUtils.getEntityName(internalSource);
                        const label = internalSource['label'];
                        if (subEntityName && isNotNilOrBlank(label) && this.isKnownEntityName(subEntityName)) {
                            const existingTarget = yield this.loadByLabel(label, { entityName: subEntityName });
                            if (existingTarget) {
                                console.debug(`[referential-table] Found match ${subEntityName}#${existingTarget.id} for {label: '${label}'}`);
                                internalSource.id = existingTarget.id;
                            }
                            else {
                                missingReferences.push(`${subEntityName}#${label}`);
                            }
                        }
                        else {
                            // Clean ids, update_date, etc.
                            AppReferentialUtils.cleanIdAndDates(internalSource, false);
                        }
                    }
                    if (missingReferences.length)
                        throw this.translate.instant('REFERENTIAL.ERROR.MISSING_REFERENCES', { error: missingReferences.join(', ') });
                    const levelId = ReferentialUtils.isNotEmpty(source.levelId) ? source.levelId['id'] : source.levelId;
                    const target = new this.dataType();
                    let skip = false;
                    try {
                        const existingTarget = yield this.loadByLabel(source.label, {
                            entityName: this.entityName, levelId
                        });
                        target.fromObject(Object.assign(Object.assign(Object.assign({}, (existingTarget ? existingTarget.asObject() : {})), source), { id: existingTarget === null || existingTarget === void 0 ? void 0 : existingTarget.id, updateDate: existingTarget === null || existingTarget === void 0 ? void 0 : existingTarget.updateDate, creationDate: existingTarget === null || existingTarget === void 0 ? void 0 : existingTarget['creationDate'] }));
                    }
                    catch (err) {
                        // When insert only mode, ignore error when too many reference exists.
                        if ((err === null || err === void 0 ? void 0 : err.code) === ErrorCodes.TOO_MANY_REFERENCE_FOUND && importPolicy === 'insert-only') {
                            skip = true;
                        }
                        else
                            throw err;
                    }
                    const isNew = isNil(target.id);
                    skip = skip || (importPolicy === 'insert-only' && !isNew)
                        || (importPolicy === 'update-only' && isNew);
                    if (skip) {
                        skipCount++;
                        return null;
                    }
                    // Check is user can write
                    if (!this.dataService.canUserWrite(target))
                        return; // Cannot write: skip
                    // Save
                    const savedTarget = yield this.dataService.save(target);
                    // Update counter
                    insertCount += isNew ? 1 : 0;
                    updateCount += isNew ? 0 : 1;
                    return savedTarget;
                }
                catch (err) {
                    let message = err && err.message || err;
                    if (typeof message === 'string')
                        message = this.translate.instant(message);
                    const fullMessage = this.translate.instant('REFERENTIAL.ERROR.IMPORT_ENTITY_ERROR', { label: source.label, message });
                    errors.push(fullMessage);
                    console.error(fullMessage);
                    return null;
                }
            })))) || []).filter(isNotNil);
            if (isNotEmptyArray(errors)) {
                if (insertCount > 0 || updateCount > 0) {
                    console.warn(`[referential-table] Importing ${entities.length} entities [OK] with errors:`, errors);
                    this.showToast({
                        type: 'warning',
                        message: 'REFERENTIAL.INFO.IMPORT_ENTITIES_WARNING',
                        messageParams: { insertCount, updateCount, skipCount, errorCount: errors.length, error: `<ul><li>${errors.join('</li><li>')}</li></ul>` },
                        showCloseButton: true,
                        duration: -1
                    });
                }
                else {
                    console.error(`[referential-table] Failed to import entities:`, errors);
                    this.showToast({
                        type: 'error',
                        message: 'REFERENTIAL.ERROR.IMPORT_ENTITIES_ERROR',
                        messageParams: { error: `<ul><li>${errors.join('</li><li>')}</li></ul>` },
                        showCloseButton: true,
                        duration: -1
                    });
                }
            }
            else {
                console.info(`[referential-table] Importing ${entities.length} entities [OK]`);
                this.showToast({
                    type: 'info',
                    message: 'REFERENTIAL.INFO.IMPORT_ENTITIES_SUCCEED',
                    messageParams: { insertCount, updateCount, skipCount }
                });
            }
        });
    }
    parseJsonFile(file, opts) {
        console.info(`[referential-table] Reading JSON file ${file.name}...`);
        return JsonUtils.parseFile(file, { encoding: opts === null || opts === void 0 ? void 0 : opts.encoding })
            .pipe(switchMap(event => {
            if (event instanceof FileResponse) {
                const body = Array.isArray(event.body) ? event.body : [event.body];
                return of(new FileResponse({ body }));
            }
            // Unknown event: skip
            return of(event);
        }), filter(isNotNil));
    }
    loadEntities(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let entities;
            // Load by ids
            if (isNotEmptyArray(opts === null || opts === void 0 ? void 0 : opts.ids)) {
                const loadOpts = { fetchPolicy: 'no-cache', fullLoad: true };
                if (this.dataService instanceof ReferentialService) {
                    loadOpts.entityName = this.entityName;
                }
                entities = (yield chainPromises(opts.ids.map(id => () => __awaiter(this, void 0, void 0, function* () {
                    const entity = yield this.dataService.load(id, loadOpts);
                    return entity === null || entity === void 0 ? void 0 : entity.asObject({ keepTypename: true });
                })))).filter(isNotNil);
            }
            // Load from rows
            else {
                entities = this.dataSource.getRows()
                    .map(element => element.currentData);
            }
            return entities;
        });
    }
    showToast(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.toastController)
                throw new Error('Missing toastController in component\'s constructor');
            return Toasts.show(this.toastController, this.translate, opts);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], ReferentialFileService.prototype, "i18nColumnPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "dataType", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ReferentialFileService.prototype, "dataService", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ReferentialFileService.prototype, "entityName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ReferentialFileService.prototype, "columnDefinitions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "defaultNewRowValue", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "isKnownEntityName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "loadByLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "loadLevelById", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ReferentialFileService.prototype, "loadStatusById", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ReferentialFileService.prototype, "importPolicy", void 0);
ReferentialFileService = __decorate([
    Directive(),
    __metadata("design:paramtypes", [Injector,
        EntitiesTableDataSource, Array, Object, Function])
], ReferentialFileService);
export { ReferentialFileService };
//# sourceMappingURL=referential-file.service.js.map