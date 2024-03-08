import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { SubSampleValidatorService } from './sub-sample.validator';
import { EntityUtils, firstNotNilPromise, InMemoryEntitiesService, isNil, isNotEmptyArray, isNotNil, joinPropertiesPath, PlatformService, suggestFromArray, toNumber, } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { Sample } from './sample.model';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { environment } from '@environments/environment';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SampleFilter } from './sample.filter';
import { SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { merge, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, mergeMap, tap } from 'rxjs/operators';
export const SUB_SAMPLE_RESERVED_START_COLUMNS = ['parent'];
export const SUB_SAMPLE_RESERVED_END_COLUMNS = ['comments'];
let SubSamplesTable = class SubSamplesTable extends BaseMeasurementsTable {
    constructor(injector) {
        super(injector, Sample, SampleFilter, new InMemoryEntitiesService(Sample, SampleFilter, {
            onSort: (data, sortBy, sortDirection) => this.sortData(data, sortBy, sortDirection),
            onLoad: (data) => this.onLoadData(data),
            equals: Sample.equals,
            sortByReplacement: { id: 'rankOrder' }
        }), injector.get(PlatformService).mobile ? null : injector.get(ValidatorService), {
            prependNewElements: false,
            suppressErrors: environment.production,
            reservedStartColumns: SUB_SAMPLE_RESERVED_START_COLUMNS,
            reservedEndColumns: SUB_SAMPLE_RESERVED_END_COLUMNS,
            mapPmfms: (pmfms) => this.mapPmfms(pmfms)
        });
        this.injector = injector;
        this._availableSortedParents = [];
        this._availableParents = [];
        this.onParentChanges = new Subject();
        this.showError = true;
        this.showPmfmDetails = false;
        this.compactFields = true;
        this.showLabelColumn = false;
        this.useSticky = false;
        this.isNotHiddenPmfm = PmfmUtils.isNotHidden;
        this.i18nColumnPrefix = 'TRIP.SAMPLE.TABLE.';
        this.i18nPmfmPrefix = 'TRIP.SAMPLE.PMFM.';
        this.confirmBeforeDelete = this.mobile;
        this.inlineEdition = !this.mobile;
        this.errorTranslatorOptions = { controlPathTranslator: this, separator: '\n' };
        // Default value
        this.showCommentsColumn = !this.mobile;
        // DEBUG
        this.logPrefix = '[sub-samples-table] ';
        this.debug = !environment.production;
    }
    set availableParents(parents) {
        if (this._availableParents !== parents) {
            this._availableParents = parents;
            if (!this.loading)
                this.onParentChanges.next();
        }
    }
    get availableParents() {
        return this._availableParents;
    }
    set value(data) {
        this.setValue(data);
    }
    get value() {
        return this.getValue();
    }
    ngOnInit() {
        super.ngOnInit();
        this.setShowColumn('label', this.showLabelColumn);
        // Parent combo
        // the exact list of attributes to display will be set when receiving the pmfms and parents
        this.registerAutocompleteField('parent', {
            suggestFn: (value, opts) => this.suggestParent(value, opts),
            showAllOnFocus: true,
            mobile: this.mobile
        });
        // Compute parent, when parents or pmfms changed
        this.registerSubscription(merge(this.onParentChanges
            .pipe(mergeMap(() => this.pmfms$)), this.pmfms$.pipe(filter(isNotEmptyArray), distinctUntilChanged(), tap(pmfms => this.onPmfmsLoaded(pmfms))))
            .pipe(debounceTime(250), tap(pmfms => this.updateParents(pmfms)))
            .subscribe());
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    autoFillTable() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sub-sample-table] Auto fill table');
            // Wait table ready and loaded
            yield Promise.all([this.ready(), this.waitIdle()]);
            // Skip when disabled or still editing a row
            if (this.disabled || !this.confirmEditCreate()) {
                console.warn('[sub-samples-table] Skipping autofill, as table is disabled or still editing a row');
                return;
            }
            this.markAsLoading();
            try {
                // Read existing rows
                const existingSamples = this.dataSource.getRows().map(r => r.currentData);
                const displayParentPmfmId = (_a = this.displayParentPmfm) === null || _a === void 0 ? void 0 : _a.id;
                const availableParents = this._availableSortedParents || this._availableParents
                    .filter(p => (isNil(displayParentPmfmId) || isNotNil(p.measurementValues[displayParentPmfmId])));
                const parents = availableParents
                    .filter(p => !existingSamples.find(s => Sample.equals(s.parent, p)));
                // Create new row for each parent
                for (const parent of parents) {
                    const sample = new Sample();
                    sample.parent = parent;
                    yield this.addEntityToTable(sample);
                }
            }
            catch (err) {
                console.error(err && err.message || err);
                this.error = err && err.message || err;
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    /**
     * Allow to set value
     *
     * @param data
     */
    setValue(data) {
        this.memoryDataService.value = data;
    }
    addOrUpdateEntityToTable(subSample) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNil(subSample.id) && isNil(subSample.rankOrder) && isNil(subSample.label)) {
                yield this.addEntityToTable(subSample);
            }
            else {
                const row = yield this.findRowByEntity(subSample);
                yield this.updateEntityToTable(subSample, row);
            }
        });
    }
    openDetailModal(dataToOpen, row) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sub-samples-table] Opening detail modal...');
            const pmfms = yield firstNotNilPromise(this.pmfms$, { stop: this.destroySubject });
            const isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new Sample();
                yield this.onNewEntity(dataToOpen);
            }
            this.markAsLoading();
            const i18PrefixParts = this.i18nColumnPrefix && this.i18nColumnPrefix.split('.');
            const i18nPrefix = i18PrefixParts && (i18PrefixParts.slice(0, i18PrefixParts.length - 2).join('.') + '.');
            const modal = yield this.modalCtrl.create({
                component: SubSampleModal,
                componentProps: Object.assign(Object.assign({ 
                    // Default options:
                    programLabel: undefined, // Prefer to pass PMFMs directly, to avoid a reloading
                    pmfms, acquisitionLevel: this.acquisitionLevel, disabled: this.disabled, i18nPrefix, i18nSuffix: this.i18nColumnSuffix, usageMode: this.usageMode, availableParents: this._availableSortedParents, defaultLatitudeSign: this.defaultLatitudeSign, defaultLongitudeSign: this.defaultLongitudeSign, onDelete: (event, dataToDelete) => this.deleteEntity(event, dataToDelete) }, this.modalOptions), { 
                    // Data to open
                    isNew, data: dataToOpen }),
                keyboardClose: true,
                backdropDismiss: false
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[sub-samples-table] Modal result: ', data);
            this.markAsLoaded();
            return data instanceof Sample ? data : undefined;
        });
    }
    deleteEntity(event, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield this.findRowByEntity(data);
            // Row not exists: OK
            if (!row)
                return true;
            const confirmed = yield this.canDeleteRows([row]);
            if (confirmed === true) {
                return this.deleteRow(null, row, { interactive: false /*already confirmed*/ });
            }
            return confirmed;
        });
    }
    /* -- protected methods -- */
    mapPmfms(pmfms) {
        // DEBUG
        console.debug('[sub-samples-table] Mapping PMFMs...', pmfms);
        const tagIdPmfmIndex = pmfms.findIndex(p => p.id === PmfmIds.TAG_ID);
        if (tagIdPmfmIndex !== -1) {
            const tagIdPmfm = pmfms[tagIdPmfmIndex];
            this.displayParentPmfm = (tagIdPmfm === null || tagIdPmfm === void 0 ? void 0 : tagIdPmfm.required) ? tagIdPmfm : null;
        }
        // Force the parent PMFM to be hidden, and NOT required
        if (this.displayParentPmfm && !this.displayParentPmfm.hidden) {
            const cloneParentPmfm = this.displayParentPmfm.clone();
            cloneParentPmfm.hidden = true;
            cloneParentPmfm.required = false;
            pmfms[tagIdPmfmIndex] = cloneParentPmfm;
        }
        return pmfms;
    }
    onPmfmsLoaded(pmfms) {
        // Can be overridden by subclasses
    }
    updateParents(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            console.debug('[sub-samples-table] Update parents...', pmfms);
            const parents = this._availableParents || [];
            const hasTaxonName = parents.some(s => { var _a; return isNotNil((_a = s.taxonName) === null || _a === void 0 ? void 0 : _a.id); });
            const attributeName = hasTaxonName ? 'taxonName' : 'taxonGroup';
            const baseDisplayAttributes = this.settings.getFieldDisplayAttributes(attributeName)
                .map(key => `${attributeName}.${key}`);
            // If display parent using by a pmfm
            if (this.displayParentPmfm) {
                const parentDisplayPmfmId = this.displayParentPmfm.id;
                const parentDisplayPmfmPath = `measurementValues.${parentDisplayPmfmId}`;
                // Keep parents with this pmfms
                const filteredParents = parents.filter(s => isNotNil(s.measurementValues[parentDisplayPmfmId]));
                this._availableSortedParents = EntityUtils.sort(filteredParents, parentDisplayPmfmPath);
                this.autocompleteFields.parent.attributes = [parentDisplayPmfmPath].concat(baseDisplayAttributes);
                this.autocompleteFields.parent.columnSizes = [4].concat(baseDisplayAttributes.map(attr => 
                // If label then col size = 2
                attr.endsWith('label') ? 2 : undefined));
                this.autocompleteFields.parent.columnNames = [PmfmUtils.getPmfmName(this.displayParentPmfm)];
                this.autocompleteFields.parent.displayWith = (obj) => PmfmValueUtils.valueToString(obj === null || obj === void 0 ? void 0 : obj.measurementValues[parentDisplayPmfmId], { pmfm: this.displayParentPmfm }) || undefined;
            }
            else {
                const displayAttributes = ['rankOrder'].concat(baseDisplayAttributes);
                this._availableSortedParents = this.sortData(parents.slice(), 'taxonGroup');
                this.autocompleteFields.parent.attributes = displayAttributes;
                this.autocompleteFields.parent.columnSizes = undefined; // use defaults
                this.autocompleteFields.parent.columnNames = undefined; // use defaults
                this.autocompleteFields.parent.displayWith = (obj) => obj && joinPropertiesPath(obj, displayAttributes) || undefined;
            }
            // Configure the filter for suggestParent()
            this.autocompleteFields.parent.filter = this.autocompleteFields.parent.filter || {};
            this.autocompleteFields.parent.filter.searchAttributes = this.autocompleteFields.parent.attributes;
            // Link samples to parent, and delete orphan
            yield this.linkDataToParentAndDeleteOrphan();
            this.markForCheck();
        });
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const data = yield this.openDetailModal();
            if (data) {
                yield this.addEntityToTable(data);
            }
            return true;
        });
    }
    openRow(id, row) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            if (this.onOpenRow.observers.length) {
                this.onOpenRow.emit(row);
                return true;
            }
            const data = this.toEntity(row, true);
            // Prepare entity measurement values
            this.prepareEntityToSave(data);
            const updatedData = yield this.openDetailModal(data, row);
            if (updatedData) {
                yield this.updateEntityToTable(updatedData, row);
            }
            else {
                this.editedRow = null;
            }
            return true;
        });
    }
    getValue() {
        return this.memoryDataService.value;
    }
    prepareEntityToSave(sample) {
        // Override by subclasses
    }
    findRowByEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || isNil(data.rankOrder))
                throw new Error('Missing argument data or data.rankOrder');
            return this.dataSource.getRows()
                .find(r => r.currentData.rankOrder === data.rankOrder);
        });
    }
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sub-samples-table] Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // label
            if (!this.showLabelColumn) {
                // Generate label
                data.label = this.acquisitionLevel + '#' + data.rankOrder;
            }
        });
    }
    getI18nColumnName(columnName) {
        // Replace parent by TAG_ID pmfms
        columnName = columnName && columnName === 'parent' && this.displayParentPmfm ? this.displayParentPmfm.id.toString() : columnName;
        return super.getI18nColumnName(columnName);
    }
    linkDataToParent(data) {
        if (!this._availableParents || !data)
            return;
        // DEBUG
        //console.debug("[sub-samples-table] Calling linkDataToParent()");
        data.forEach(s => {
            var _a;
            const parentId = toNumber(s.parentId, (_a = s.parent) === null || _a === void 0 ? void 0 : _a.id);
            s.parent = this._availableParents.find(p => p.id === parentId
                || (s.parent && p.label === s.parent.label && p.rankOrder === s.parent.rankOrder))
                || s.parent;
            if (!s.parent)
                console.warn('[sub-samples-table] linkDataToParent() - Could not found parent for sub-sample:', s);
        });
    }
    /**
     * Remove samples in table, if there have no more parent
     */
    linkDataToParentAndDeleteOrphan() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            //console.debug("[sub-samples-table] Calling linkDataToParentAndDeleteOrphan()", rows);
            const parentDisplayPmfmId = (_a = this.displayParentPmfm) === null || _a === void 0 ? void 0 : _a.id;
            // Check if need to delete some rows
            let hasRemovedItem = false;
            const data = rows
                .map(row => {
                var _a, _b;
                const item = row.currentData;
                const parentId = toNumber(item.parentId, (_a = item.parent) === null || _a === void 0 ? void 0 : _a.id);
                let parent;
                if (isNotNil(parentId)) {
                    // Update the parent, by id
                    parent = this._availableParents.find(p => p.id === parentId);
                }
                // No parent, search from parent Pmfm
                else if (isNotNil(parentDisplayPmfmId)) {
                    const parentPmfmValue = (_b = item === null || item === void 0 ? void 0 : item.measurementValues) === null || _b === void 0 ? void 0 : _b[parentDisplayPmfmId];
                    if (isNil(parentPmfmValue)) {
                        parent = undefined; // remove link to parent
                    }
                    else {
                        // Update the parent, by tagId
                        parent = this._availableParents.find(p => { var _a; return (p && ((_a = p.measurementValues) === null || _a === void 0 ? void 0 : _a[parentDisplayPmfmId])) === parentPmfmValue; });
                    }
                }
                if (parent || row.editing) {
                    if (item.parent !== parent) {
                        item.parent = parent;
                        // If row use a validator, force update
                        if (row.validator) {
                            if (!row.editing)
                                row.validator.patchValue({ parent }, { emitEvent: false });
                        }
                        else {
                            row.currentData.parent = parent;
                        }
                    }
                    return item; // Keep only rows with a parent (or in editing mode)
                }
                // Could not find the parent anymore (parent has been deleted)
                hasRemovedItem = true;
                return undefined;
            })
                .map(isNotNil);
            if (hasRemovedItem) {
                // Make sure to convert into a Sample - fix issue #371
                this.value = data.map(c => Sample.fromObject(c));
            }
        });
    }
    sortData(data, sortBy, sortDirection) {
        sortBy = (sortBy !== 'parent') && sortBy || 'parent.rankOrder'; // Replace parent by its rankOrder
        return this.memoryDataService.sort(data, sortBy, sortDirection);
    }
    onLoadData(data) {
        this.linkDataToParent(data);
        return data;
    }
    suggestParent(value, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (EntityUtils.isNotEmpty(value, 'label'))
                return { data: [value] };
            value = (typeof value === 'string' && value !== '*') && value || undefined;
            // All
            if (isNil(value))
                return { data: this._availableSortedParents, total: this._availableSortedParents.length };
            return suggestFromArray(this._availableSortedParents, value, Object.assign({}, opts));
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "showPmfmDetails", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "compactFields", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSamplesTable.prototype, "weightDisplayedUnit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SubSamplesTable.prototype, "availableParents", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "showLabelColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "modalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSamplesTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSamplesTable.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubSamplesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSamplesTable.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSamplesTable.prototype, "defaultLongitudeSign", void 0);
SubSamplesTable = __decorate([
    Component({
        selector: 'app-sub-samples-table',
        templateUrl: 'sub-samples.table.html',
        styleUrls: ['sub-samples.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: SubSampleValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector])
], SubSamplesTable);
export { SubSamplesTable };
//# sourceMappingURL=sub-samples.table.js.map