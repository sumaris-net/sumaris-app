import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectorRef, Directive, Injector, Input } from '@angular/core';
import { firstArrayValue, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, ReferentialUtils, removeDuplicatesFromArray, splitByProperty, } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { Operation } from '../../trip/trip.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { Sale } from '@app/trip/sale/sale.model';
export const BATCH_RESERVED_START_COLUMNS = ['taxonGroup', 'taxonName'];
export const BATCH_RESERVED_END_COLUMNS = ['comments'];
let AbstractBatchesTable = class AbstractBatchesTable extends BaseMeasurementsTable {
    constructor(injector, dataType, filterType, dataService, validatorService, options) {
        super(injector, dataType, filterType, dataService, validatorService, Object.assign(Object.assign({ reservedStartColumns: BATCH_RESERVED_START_COLUMNS, reservedEndColumns: BATCH_RESERVED_END_COLUMNS, i18nColumnPrefix: 'TRIP.BATCH.TABLE.', i18nPmfmPrefix: 'TRIP.BATCH.PMFM.' }, options), { mapPmfms: (pmfms) => this.mapPmfms(pmfms) }));
        this.useSticky = false;
        this.samplingRatioFormat = ProgramProperties.TRIP_BATCH_SAMPLING_RATIO_FORMAT.defaultValue;
        this.cd = injector.get(ChangeDetectorRef);
        this.referentialRefService = injector.get(ReferentialRefService);
        this.inlineEdition = this.validatorService && !this.mobile;
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'asc';
        // Set default value
        this.showCommentsColumn = false;
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
        // -- DEV only
        //this.debug = !environment.production;
        this.logPrefix = '[batches-table]';
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    set showTaxonGroupColumn(value) {
        this.setShowColumn('taxonGroup', value);
    }
    get showTaxonGroupColumn() {
        return this.getShowColumn('taxonGroup');
    }
    set showTaxonNameColumn(value) {
        this.setShowColumn('taxonName', value);
    }
    get showTaxonNameColumn() {
        return this.getShowColumn('taxonName');
    }
    ngOnInit() {
        super.ngOnInit();
        // Taxon group combo
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            mobile: this.mobile
        });
        // Taxon name combo
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, options) => this.suggestTaxonNames(value, options),
            mobile: this.mobile
        });
    }
    setParent(data) {
        if (!data) {
            this.setFilter({});
        }
        else if (data instanceof Operation) {
            this.setFilter({ operationId: data.id });
        }
        else if (data instanceof Sale) {
            this.setFilter({ saleId: data.id });
        }
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const { data, role } = yield this.openDetailModal();
            if (data && role !== 'delete') {
                // Can be an update (is user use the 'save and new' modal's button)
                yield this.addOrUpdateEntityToTable(data);
                return true;
            }
            else {
                this.editedRow = null;
                return false;
            }
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
            const dataToOpen = this.toEntity(row, true);
            // Prepare entity measurement values
            this.prepareEntityToSave(dataToOpen);
            const { data, role } = yield this.openDetailModal(dataToOpen, row);
            if (data && role !== 'delete') {
                // Can be an update (is user use the 'save and new' modal's button)
                yield this.addOrUpdateEntityToTable(data);
                return true;
            }
            else {
                this.editedRow = null;
                return false;
            }
        });
    }
    /**
     * Auto fill table (e.g. with taxon groups found in strategies) - #176
     */
    autoFillTable(opts = { skipIfDisabled: true, skipIfNotEmpty: false }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Wait table loaded
                yield this.waitIdle({ stop: this.destroySubject });
                // Skip if disabled
                if (opts.skipIfDisabled && this.disabled) {
                    console.warn(this.logPrefix + 'Skipping autofill as table is disabled');
                    return;
                }
                // Skip if not empty
                if (opts.skipIfNotEmpty && this.totalRowCount > 0) {
                    console.warn('[batches-table] Skipping autofill because table is not empty');
                    return;
                }
                // Skip if no available taxon group configured (should be set by parent page - e.g. OperationPage)
                if (isEmptyArray(this.availableTaxonGroups)) {
                    console.warn('[batches-table] Skipping autofill, because no availableTaxonGroups has been set');
                    return;
                }
                // Skip when editing a row
                if (!this.confirmEditCreate()) {
                    console.warn('[batches-table] Skipping autofill, as table still editing a row');
                    return;
                }
                this.markAsLoading();
                console.debug('[batches-table] Auto fill table, using options:', opts);
                // Read existing taxonGroups
                const data = this.dataSource.getData();
                const existingTaxonGroups = removeDuplicatesFromArray(data.map(batch => batch.taxonGroup).filter(isNotNil), 'id');
                const taxonGroupsToAdd = this.availableTaxonGroups
                    // Exclude if already exists
                    .filter(taxonGroup => !existingTaxonGroups.some(tg => ReferentialUtils.equals(tg, taxonGroup)));
                if (isNotEmptyArray(taxonGroupsToAdd)) {
                    let rankOrder = data.reduce((res, b) => Math.max(res, b.rankOrder || 0), 0) + 1;
                    const entities = [];
                    for (const taxonGroup of taxonGroupsToAdd) {
                        const entity = new this.dataType();
                        entity.taxonGroup = TaxonGroupRef.fromObject(taxonGroup);
                        entity.rankOrder = rankOrder++;
                        entities.push(entity);
                    }
                    yield this.addEntitiesToTable(entities, { emitEvent: false });
                    // Mark as dirty
                    this.markAsDirty({ emitEvent: false /* done in markAsLoaded() */ });
                }
                this.markForCheck();
            }
            catch (err) {
                console.error(err && err.message || err, err);
                this.setError(err && err.message || err);
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    suggestTaxonGroups(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            //if (isNilOrBlank(value)) return [];
            return this.programRefService.suggestTaxonGroups(value, {
                program: this.programLabel,
                searchAttribute: options && options.searchAttribute
            });
        });
    }
    suggestTaxonNames(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const taxonGroup = this.editedRow && this.editedRow.validator.get('taxonGroup').value;
            // IF taxonGroup column exists: taxon group must be filled first
            if (this.showTaxonGroupColumn && isNilOrBlank(value) && isNil(taxonGroup))
                return { data: [] };
            return this.programRefService.suggestTaxonNames(value, {
                programLabel: this.programLabel,
                searchAttribute: options && options.searchAttribute,
                taxonGroupId: taxonGroup && taxonGroup.id || undefined
            });
        });
    }
    prepareEntityToSave(data) {
        // Override by subclasses
    }
    /**
     * Allow to remove/Add some pmfms. Can be override by subclasses
     *
     * @param pmfms
     */
    mapPmfms(pmfms) {
        if (!pmfms)
            return pmfms; // Skip (no pmfms)
        this._initialPmfms = pmfms; // Copy original pmfms list
        this.weightPmfms = pmfms.filter(p => PmfmUtils.isWeight(p));
        this.defaultWeightPmfm = firstArrayValue(this.weightPmfms); // First as default
        this.weightPmfmsByMethod = splitByProperty(this.weightPmfms, 'methodId');
        // Exclude weight PMFMs
        return pmfms.filter(p => !this.weightPmfms.includes(p));
    }
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-table] Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // generate label
            data.label = `${this.acquisitionLevel}#${data.rankOrder}`;
            // Default values
            if (isNotNil(this.defaultTaxonName)) {
                data.taxonName = this.defaultTaxonName;
            }
            if (isNotNil(this.defaultTaxonGroup)) {
                data.taxonGroup = this.defaultTaxonGroup;
            }
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], AbstractBatchesTable.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", String)
], AbstractBatchesTable.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AbstractBatchesTable.prototype, "showTaxonGroupColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], AbstractBatchesTable.prototype, "showTaxonNameColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], AbstractBatchesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", TaxonGroupRef)
], AbstractBatchesTable.prototype, "defaultTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", TaxonNameRef)
], AbstractBatchesTable.prototype, "defaultTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], AbstractBatchesTable.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], AbstractBatchesTable.prototype, "samplingRatioFormat", void 0);
AbstractBatchesTable = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Function, Object, Object, Object])
], AbstractBatchesTable);
export { AbstractBatchesTable };
//# sourceMappingURL=batches.table.class.js.map