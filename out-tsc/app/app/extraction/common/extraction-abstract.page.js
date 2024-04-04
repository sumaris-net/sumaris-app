import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, EventEmitter, Injector, Input, ViewChild } from '@angular/core';
import { AccountService, AppTabEditor, capitalizeFirstLetter, changeCaseToUnderscore, DateUtils, firstNotNilPromise, fromDateISOString, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, PlatformService, propertyComparator, toBoolean, toDateISOString, TranslateContextService, } from '@sumaris-net/ngx-components';
import { ExtractionCategories, ExtractionFilter, ExtractionFilterCriterion, ExtractionTypeUtils, } from '../type/extraction-type.model';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ExtractionCriteriaForm } from '../criteria/extraction-criteria.form';
import { TranslateService } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExtractionService } from './extraction.service';
import { AlertController, ModalController, NavController, ToastController } from '@ionic/angular';
import { ExtractionUtils } from './extraction.utils';
import { ExtractionHelpModal } from '../help/help.modal';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { RxState } from '@rx-angular/state';
import { Location } from '@angular/common';
export const DEFAULT_CRITERION_OPERATOR = '=';
export const EXTRACTION_SETTINGS_ENUM = {
    filterKey: 'filter',
    compactRowsKey: 'compactRows'
};
let ExtractionAbstractPage = class ExtractionAbstractPage extends AppTabEditor {
    constructor(injector, _state) {
        super(injector.get(ActivatedRoute), injector.get(Router), injector.get(NavController), injector.get(AlertController), injector.get(TranslateService));
        this.injector = injector;
        this._state = _state;
        this.type$ = this._state.select('type');
        this.types$ = this._state.select('types');
        this.onRefresh = new EventEmitter();
        this.canEdit = false;
        this.location = injector.get(Location);
        this.toastController = injector.get(ToastController);
        this.translateContext = injector.get(TranslateContextService);
        this.accountService = injector.get(AccountService);
        this.service = injector.get(ExtractionService);
        this.settings = injector.get(LocalSettingsService);
        this.formBuilder = injector.get(UntypedFormBuilder);
        this.platform = injector.get(PlatformService);
        this.modalCtrl = injector.get(ModalController);
        this.mobile = this.settings.mobile;
        // Create the filter form
        this.form = this.formBuilder.group({
            sheetName: [null, Validators.required],
            meta: [null]
        });
        this.settingsId = this.generateTableId();
    }
    get started() {
        return this._state.get('started');
    }
    get types() {
        return this._state.get('types');
    }
    set types(value) {
        this._state.set('types', _ => value);
    }
    get type() {
        return this._state.get('type');
    }
    set type(value) {
        this._state.set('type', (_) => value);
    }
    get sheetName() {
        return this.form.controls.sheetName.value;
    }
    set sheetName(value) {
        this.form.get('sheetName').setValue(value);
    }
    markAsDirty(opts) {
        this.criteriaForm.markAsDirty(opts);
    }
    get isNewData() {
        return false;
    }
    get excludeInvalidData() {
        var _a;
        return toBoolean((_a = this.form.get('meta').value) === null || _a === void 0 ? void 0 : _a.excludeInvalidData, false);
    }
    ngOnInit() {
        super.ngOnInit();
        this.addChildForm(this.criteriaForm);
        // Load types (if not set by types
        if (!this.types) {
            this._state.connect('types', this.watchAllTypes()
                .pipe(map(({ data, total }) => 
            // Compute i18n name
            data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
                // Then sort by name
                .sort(propertyComparator('name')))));
        }
        this._state.hold(this.types$, (_) => this.markAsReady());
    }
    loadFromRouteOrSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            let found = false;
            try {
                // Read the route queryParams
                {
                    const { category, label, sheet, q, meta } = this.route.snapshot.queryParams;
                    if (this.debug)
                        console.debug('[extraction-abstract-page] Reading route queryParams...', this.route.snapshot.queryParams);
                    found = yield this.loadQueryParams({ category, label, sheet, q, meta }, { emitEvent: false });
                    if (found)
                        return true; // found! stop here
                }
                // Read the settings
                {
                    const json = this.settings.getPageSettings(this.settingsId, EXTRACTION_SETTINGS_ENUM.filterKey);
                    if (json) {
                        const updateDate = fromDateISOString(json.updateDate);
                        const settingsAgeInHours = (updateDate === null || updateDate === void 0 ? void 0 : updateDate.diff(DateUtils.moment(), 'hour')) || 0;
                        if (settingsAgeInHours <= 12 /* Apply filter, if age <= 12h */) {
                            if (this.debug)
                                console.debug('[extraction-abstract-page] Restoring from settings...', json);
                            const { category, label, sheet, q, meta } = json;
                            found = yield this.loadQueryParams({ category, label, sheet, q, meta }, { emitEvent: false });
                            if (found)
                                return true; // found! stop here
                        }
                    }
                }
                return false; // not loaded
            }
            finally {
                if (found) {
                    // Mark as started, with a delay, to avoid reload twice, because of listen on page/sort
                    setTimeout(() => this.markAsStarted(), 450);
                }
            }
        });
    }
    /**
     * Load type from a query params `{category, label, sheet, q}`
     */
    loadQueryParams(queryParams, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            // Convert query params into a valid type
            const { category, label, sheet, q, meta } = queryParams;
            const paramType = this.fromObject({ category, label });
            const types = yield firstNotNilPromise(this.types$, { stop: this.destroySubject });
            //DEBUG
            //console.debug('[extraction-abstract-page] Extraction types found:', types);
            // Read type
            let selectedType;
            // If not type found in params, redirect to first one
            if (isNil(paramType.category) || isNil(paramType.label)) {
                console.debug('[extraction-abstract-page] No extraction type found, in route.');
                this.markAsLoaded();
                return false; // Stop here
            }
            // Select the exact type object in the filter form
            else {
                selectedType = types.find(t => this.isEquals(t, paramType)) || paramType;
            }
            const selectedSheetName = sheet || (selectedType && selectedType.sheetNames && selectedType.sheetNames.length && selectedType.sheetNames[0]);
            if (selectedSheetName && selectedType && !selectedType.sheetNames) {
                selectedType.sheetNames = [selectedSheetName];
            }
            // Set the type
            const changed = yield this.setType(selectedType, {
                sheetName: selectedSheetName,
                emitEvent: false,
                skipLocationChange: true // Here, we not need an update of the location
            });
            // No type found
            if (!changed && !this.type)
                return false;
            // Update filter form
            if (isNotNilOrBlank(q)) {
                const criteria = this.parseCriteriaFromString(q, sheet);
                yield this.criteriaForm.setValue(criteria, { emitEvent: false });
            }
            // Update meta
            if (meta) {
                const metaValue = this.parseMetaFromString(meta);
                this.form.get('meta').patchValue(metaValue, { emitEvent: false });
            }
            // Execute the first load
            if (changed) {
                yield this.loadData();
            }
            return true;
        });
    }
    setType(type, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            opts.emitEvent = isNotNil(opts.emitEvent) ? opts.emitEvent : true;
            opts.skipLocationChange = isNotNil(opts.skipLocationChange) ? opts.skipLocationChange : false;
            // If empty: skip
            if (!type)
                return false;
            // If same: skip
            const changed = !this.type || !this.isEquals(type, this.type);
            if (changed) {
                // Replace by the full entity
                type = yield this.findTypeByFilter(ExtractionTypeFilter.fromType(type));
                if (!type) {
                    console.warn('[extraction-form] Type not found:', type);
                    return false;
                }
                console.debug(`[extraction-form] Set type to {${type.label}}`, type);
                this.form.patchValue({});
                this.type = type;
                this.criteriaForm.type = type;
                // Check if user can edit (admin or supervisor in the rec department)
                this.canEdit = this.canUserWrite(type);
                // Select the given sheet (if exists), or select the first one
                const sheetName = opts.sheetName && (type.sheetNames || []).find(s => s === opts.sheetName)
                    || (type.sheetNames && type.sheetNames[0]);
                this.setSheetName(sheetName || null, {
                    emitEvent: false,
                    skipLocationChange: true
                });
            }
            // Update the window location
            if ((opts === null || opts === void 0 ? void 0 : opts.skipLocationChange) !== true) {
                setTimeout(() => this.updateQueryParams(), 500);
            }
            // Refresh data
            if (!opts || opts.emitEvent !== false) {
                this.onRefresh.emit();
            }
            return changed;
        });
    }
    setSheetName(sheetName, opts) {
        if (sheetName === this.sheetName)
            return; //skip
        this.form.patchValue({ sheetName }, opts);
        this.criteriaForm.sheetName = sheetName;
        if ((opts === null || opts === void 0 ? void 0 : opts.skipLocationChange) !== true) {
            setTimeout(() => this.updateQueryParams(), 500);
        }
        if (!opts || opts.emitEvent !== false) {
            this.onRefresh.emit();
        }
    }
    /**
     * Update the URL
     */
    updateQueryParams(type, opts = { skipLocationChange: false, skipSettingsChange: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            type = type || this.type;
            if (this.type !== type)
                return; // Skip
            const queryParams = ExtractionUtils.asQueryParams(type, this.getFilterValue());
            console.debug('[extraction-form] Updating query params', queryParams);
            // Update route query params
            yield this.router.navigate(['.'], {
                relativeTo: this.route,
                skipLocationChange: opts.skipLocationChange,
                queryParams
            });
            // Save router and filter in settings, to be able to restore it
            if (!opts || opts.skipSettingsChange !== false) {
                const json = Object.assign(Object.assign({}, queryParams), { updateDate: toDateISOString(DateUtils.moment()) });
                yield this.settings.savePageSetting(this.settingsId, json, EXTRACTION_SETTINGS_ENUM.filterKey);
            }
        });
    }
    downloadAsFile(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading || isNil(this.type))
                return;
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            console.debug(`[extraction-form] Downloading ${this.type.category} ${this.type.label}...`);
            this.markAsLoading();
            this.resetError();
            // Get filter
            const filter = this.getFilterValue();
            delete filter.sheetName; // Force to download all sheets
            this.disable();
            try {
                // Download file
                const uri = yield this.service.downloadFile(this.type, filter);
                if (isNotNil((uri))) {
                    yield this.platform.download({ uri });
                }
            }
            catch (err) {
                console.error(err);
                this.error = err && err.message || err;
            }
            finally {
                this.markAsLoaded();
                this.enable();
            }
        });
    }
    load(id, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const types = this.types;
            if (isNil(types))
                yield this.ready();
            let type = (types || []).find(t => t.id === id);
            // Not found in type (try without cache)
            if (!type) {
                type = yield this.loadType(id, { fetchPolicy: 'no-cache' });
            }
            // Set type (need by the criteria form)
            let changed = type && (yield this.setType(type, { emitEvent: false }));
            if (opts === null || opts === void 0 ? void 0 : opts.filter) {
                yield this.setFilterValue(ExtractionFilter.fromObject(opts === null || opts === void 0 ? void 0 : opts.filter), { emitEvent: false });
                changed = true;
            }
            // Load data
            if (changed && (!opts || opts.emitEvent !== false)) {
                yield this.loadData();
            }
            // Mark as started (with a delay, because 'started' can be read in setType()
            if (!this.started) {
                setTimeout(() => this.markAsStarted(), 500);
            }
            return undefined;
        });
    }
    save(event) {
        return __awaiter(this, void 0, void 0, function* () {
            console.warn('Not allow to save extraction filter yet!');
            return undefined;
        });
    }
    reload() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            return this.load((_a = this.type) === null || _a === void 0 ? void 0 : _a.id);
        });
    }
    openHelpModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.type)
                return;
            if (event) {
                event.preventDefault();
            }
            const modal = yield this.modalCtrl.create({
                component: ExtractionHelpModal,
                componentProps: {
                    type: this.type
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            yield modal.onDidDismiss();
        });
    }
    setFilterValue(filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = this.service.asFilter(filter);
            // Patch the main form
            this.form.patchValue(filter === null || filter === void 0 ? void 0 : filter.asObject(), { emitEvent: false });
            // Patch criteria form
            yield this.criteriaForm.setValue([
                // Input criteria
                ...(filter.criteria || []).map(ExtractionFilterCriterion.fromObject),
                // Add an empty criteria
                ExtractionFilterCriterion.fromObject({ operator: '=' })
            ], opts);
            // Emit changes
            if (!opts || (opts === null || opts === void 0 ? void 0 : opts.emitEvent) !== false) {
                this.onRefresh.emit();
            }
        });
    }
    getFilterValue() {
        const res = {
            sheetName: this.sheetName,
            criteria: this.criteriaForm.getValue(),
            meta: this.form.get('meta').value
        };
        return this.service.asFilter(res);
    }
    /* -- protected methods -- */
    getFirstInvalidTabIndex() {
        return 0;
    }
    parseCriteriaFromString(queryString, sheet) {
        return ExtractionUtils.parseCriteriaFromString(queryString, sheet);
    }
    parseMetaFromString(metaString) {
        return ExtractionUtils.parseMetaString(metaString);
    }
    generateTableId() {
        var _a;
        const id = this.location.path(true)
            .replace(/[?].*$/g, '')
            .replace(/\/[\d]+/g, '_id')
            + '_'
            // Get a component unique name - See https://stackoverflow.com/questions/60114682/how-to-access-components-unique-encapsulation-id-in-angular-9
            + (((_a = this.constructor['ɵcmp']) === null || _a === void 0 ? void 0 : _a.id) || this.constructor.name);
        //if (this.debug) console.debug("[table] id = " + id);
        return id;
    }
    resetError(opts = { emitEvent: true }) {
        this.error = null;
        if (opts.emitEvent !== false) {
            this.markForCheck();
        }
    }
    findTypeByFilter(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!filter)
                throw new Error('Missing \'filter\'');
            filter = filter instanceof ExtractionTypeFilter ? filter : ExtractionTypeFilter.fromObject(filter);
            const types = yield firstNotNilPromise(this.types$);
            return (types || []).find(filter.asFilterFn());
        });
    }
    getFilterAsQueryParams() {
        const filter = this.getFilterValue();
        const params = { sheet: undefined, q: undefined };
        if (filter.sheetName) {
            params.sheet = filter.sheetName;
        }
        if (isNotEmptyArray(filter.criteria)) {
            params.q = filter.criteria.reduce((res, criterion) => {
                if (criterion.endValue) {
                    return res.concat(`${criterion.name}${criterion.operator}${criterion.value}:${criterion.endValue}`);
                }
                else {
                    return res.concat(`${criterion.name}${criterion.operator}${criterion.value}`);
                }
            }, []).join(';');
        }
        return params;
    }
    canUserWrite(type) {
        var _a;
        return type.category === ExtractionCategories.PRODUCT && (this.accountService.isAdmin()
            || (this.accountService.isUser() && ((_a = type.recorderPerson) === null || _a === void 0 ? void 0 : _a.id) === this.accountService.person.id)
            || (this.accountService.isSupervisor() && this.accountService.canUserWriteDataForDepartment(type.recorderDepartment)));
    }
    getI18nSheetName(sheetName, type, self) {
        self = self || this;
        type = type || self.type;
        sheetName = sheetName || this.sheetName;
        if (isNil(sheetName) || isNil(type))
            return undefined;
        // Try from specific translation
        let key;
        let message;
        if (type.category === 'LIVE') {
            key = `EXTRACTION.FORMAT.${type.label.toUpperCase()}.SHEET.${sheetName}`;
            message = self.translate.instant(key);
            if (message !== key)
                return message;
        }
        else {
            key = `EXTRACTION.${type.category.toUpperCase()}.${type.label.toUpperCase()}.SHEET.${sheetName}`;
            message = self.translate.instant(key);
            if (message !== key)
                return message;
        }
        // Try from generic translation
        key = `EXTRACTION.SHEET.${sheetName}`;
        message = self.translate.instant(key);
        if (message !== key) {
            // Append sheet name
            return (sheetName.length === 2) ? `${message} (${sheetName})` : message;
        }
        // No translation found: replace underscore with space
        return sheetName.replace(/[_-]+/g, ' ').toUpperCase();
    }
    translateColumns(columns, context) {
        if (isEmptyArray(columns))
            return; // Skip, to avoid error when calling this.translate.instant([])
        const i19nPrefix = `EXTRACTION.FORMAT.${changeCaseToUnderscore(this.type.format)}.`.toUpperCase();
        const names = columns.map(column => (column.name || column.columnName).toUpperCase());
        const i18nKeys = names.map(name => i19nPrefix + name)
            .concat(names.map(name => `EXTRACTION.COLUMNS.${name}`));
        const i18nMap = this.translateContext.instant(i18nKeys, context);
        columns.forEach((column, i) => {
            let key = i18nKeys[i];
            column.name = i18nMap[key];
            // No I18n translation
            if (column.name === key) {
                // Fallback to the common translation
                key = i18nKeys[names.length + i];
                column.name = i18nMap[key];
                // Or split column name
                if (column.name === key) {
                    // Replace underscore with space
                    column.name = column.columnName.replace(/[_-]+/g, ' ').toLowerCase();
                    // First letter as upper case
                    if (column.name.length > 1)
                        column.name = capitalizeFirstLetter(column.name);
                }
            }
        });
    }
    getI18nColumnName(columnName) {
        if (!columnName)
            return '';
        let key = `EXTRACTION.TABLE.${this.type.format.toUpperCase()}.${columnName.toUpperCase()}`;
        let message = this.translate.instant(key);
        // No I18n translation
        if (message === key) {
            // Try to get common translation
            key = `EXTRACTION.TABLE.COLUMNS.${columnName.toUpperCase()}`;
            message = this.translate.instant(key);
            // Or split column name
            if (message === key) {
                // Replace underscore with space
                message = columnName.replace(/[_-]+/g, ' ').toUpperCase();
                if (message.length > 1) {
                    // First letter as upper case
                    message = message.substring(0, 1) + message.substring(1).toLowerCase();
                }
            }
        }
        return message;
    }
    hasFilterCriteria(sheetName) {
        return this.criteriaForm.hasFilterCriteria(sheetName);
    }
    markAsStarted(opts = { emitEvent: true }) {
        this._state.set('started', (_) => true);
        if (!opts || opts.emitEvent !== false)
            this.markForCheck();
    }
    toggleExcludeInvalidData(event, opts) {
        const excludeInvalidData = this.excludeInvalidData;
        this.form.get('meta').setValue({
            excludeInvalidData: !excludeInvalidData
        }, opts);
        if (!opts || opts.emitEvent !== false) {
            this.markForCheck();
            this.onRefresh.emit();
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExtractionAbstractPage.prototype, "canEdit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], ExtractionAbstractPage.prototype, "types", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], ExtractionAbstractPage.prototype, "type", null);
__decorate([
    ViewChild('criteriaForm', { static: true }),
    __metadata("design:type", ExtractionCriteriaForm)
], ExtractionAbstractPage.prototype, "criteriaForm", void 0);
ExtractionAbstractPage = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector,
        RxState])
], ExtractionAbstractPage);
export { ExtractionAbstractPage };
//# sourceMappingURL=extraction-abstract.page.js.map