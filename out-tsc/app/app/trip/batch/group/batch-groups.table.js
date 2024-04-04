var BatchGroupsTable_1;
import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { Validators } from '@angular/forms';
import { BATCH_RESERVED_END_COLUMNS, BATCH_RESERVED_START_COLUMNS, } from '../common/batches.table.class';
import { changeCaseToUnderscore, firstArrayValue, InMemoryEntitiesService, isEmptyArray, isNil, isNotEmptyArray, isNotNil, isNotNilOrNaN, LocalSettingsService, ReferentialUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, SETTINGS_DISPLAY_COLUMNS, TableSelectColumnsComponent, toBoolean, } from '@sumaris-net/ngx-components';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualityFlagIds, UnitLabel } from '@app/referential/services/model/model.enum';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Batch } from '../common/batch.model';
import { BatchGroupModal } from './batch-group.modal';
import { BatchGroup, BatchGroupUtils } from './batch-group.model';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { filter, map, takeUntil, tap } from 'rxjs/operators';
import { SubBatchesModal } from '../sub/sub-batches.modal';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { BatchGroupValidatorService } from './batch-group.validator';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AbstractBatchesTable } from '@app/trip/batch/common/batches.table.class';
import { hasFlag } from '@app/shared/flags.utils';
import { environment } from '@environments/environment';
import { RxStateProperty } from '@app/shared/state/state.decorator';
const DEFAULT_USER_COLUMNS = ['weight', 'individualCount'];
/**
 * Compose many computed functions to one function.<br/>
 * return true (=computed) when one function return true (= OR operand between functions).
 * Nil value are ignored
 *
 * @param values
 */
export function composeBatchComputed(values) {
    // Remove nil value
    values = values === null || values === void 0 ? void 0 : values.filter(isNotNil);
    if (isEmptyArray(values))
        return false; // Empty
    // Only one value: use it
    if (values.length === 1)
        return values[0];
    // Convert boolean values to functions
    const fns = values
        .map(value => {
        if (typeof value !== 'function')
            return () => value;
        return value; // already a function
    });
    // Compose functions: return true (=computed) when one function return true (= OR operand between functions)
    return (batch, parent, samplingRatioFormat) => fns.some(fn => fn(batch, parent, samplingRatioFormat));
}
export const BatchGroupColumnFlags = Object.freeze({
    IS_WEIGHT: 0x0000001,
    IS_INDIVIDUAL_COUNT: 0x0000010,
    IS_SAMPLING: 0x0000100,
    IS_SAMPLING_RATIO: 0x0001000,
    IS_ALWAYS_COMPUTED: 0x0010000,
    IS_TOTAL: 0x0100000,
    IS_LANDING: 0x1000000
});
let BatchGroupsTable = BatchGroupsTable_1 = class BatchGroupsTable extends AbstractBatchesTable {
    constructor(injector, validatorService, context, pmfmNamePipe) {
        super(injector, BatchGroup, BatchFilter, new InMemoryEntitiesService(BatchGroup, BatchFilter, {
            onLoad: (data) => this.onLoad(data),
            onSave: (data) => this.onSave(data),
            equals: BatchGroup.equals,
            sortByReplacement: {
                id: 'rankOrder',
            },
        }), 
        // Force no validator (readonly mode, if mobile)
        injector.get(LocalSettingsService).mobile ? null : validatorService, {
            // Need to set additional validator here
            // WARN: we cannot use onStartEditingRow here, because it is called AFTER row.validator.patchValue()
            //       e.g. When we add some validator (see operation page), so new row should always be INVALID with those additional validators
            onPrepareRowForm: (form) => this.onPrepareRowForm(form),
        });
        this.context = context;
        this.pmfmNamePipe = pmfmNamePipe;
        this._showWeightColumns = true;
        this.showSamplingBatchColumns$ = this._state.select('showSamplingBatchColumns');
        this.showAutoFillButton$ = this._state.select('showAutoFillButton');
        this.showError = true;
        this.allowSubBatches = true;
        this.defaultHasSubBatches = false;
        this.taxonGroupsNoWeight = [];
        this.taxonGroupsNoLanding = [];
        this.onSubBatchesChanges = new EventEmitter();
        // Set default values
        this.confirmBeforeDelete = this.mobile;
        this.i18nColumnPrefix = 'TRIP.BATCH.TABLE.';
        this.i18nPmfmPrefix = 'TRIP.BATCH.PMFM.';
        this.keepEditedRowOnSave = !this.mobile;
        this.saveBeforeDelete = true;
        this.saveBeforeFilter = true;
        this.saveBeforeSort = true;
        this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this };
        this.showCommentsColumn = !this.mobile; // Was set to 'false' in batches-table
        // this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH; // Already set in batches-table
        // -- For DEV only
        //this.debug = !environment.production;
        this.logPrefix = '[batch-groups-table] ';
    }
    disable(opts) {
        super.disable(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.disable(opts);
    }
    enable(opts) {
        super.enable(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.enable(opts);
    }
    markAsPristine(opts) {
        super.markAsPristine(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.markAsPristine(opts);
    }
    markAsTouched(opts) {
        super.markAsTouched(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.markAsTouched(opts);
    }
    markAllAsTouched(opts) {
        super.markAllAsTouched(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.markAllAsTouched();
    }
    markAsUntouched(opts) {
        super.markAsUntouched(opts);
        if (this.weightMethodForm)
            this.weightMethodForm.markAsUntouched(opts);
    }
    get dirty() {
        return this.dirtySubject.value || (this.weightMethodForm && this.weightMethodForm.dirty);
    }
    set showWeightColumns(value) {
        if (this._showWeightColumns !== value) {
            this._showWeightColumns = value;
            // updateColumns only if pmfms are ready
            if (!this.loading && this._initialPmfms) {
                this.computeDynamicColumns(this.qvPmfm, { cache: false /* no cache, to force computed */ });
                this.updateColumns();
            }
        }
    }
    get showWeightColumns() {
        return this._showWeightColumns;
    }
    setShowSpeciesPmfmColumn(pmfmId, show, opts = { emitEvent: true }) {
        const pmfmIndex = (this._speciesPmfms || []).findIndex((p) => p.id === pmfmId);
        if (pmfmIndex !== -1) {
            this._speciesPmfms[pmfmIndex] = this._speciesPmfms[pmfmIndex].clone();
            this._speciesPmfms[pmfmIndex].hidden = !show;
        }
        this.setShowColumn(pmfmId.toString(), show);
    }
    ngOnInit() {
        this.inlineEdition = this.validatorService && !this.mobile;
        this.allowRowDetail = !this.inlineEdition;
        this.showIndividualCountColumns = toBoolean(this.showIndividualCountColumns, !this.mobile);
        this.showSamplingBatchColumns = toBoolean(this.showSamplingBatchColumns, true);
        // in DEBUG only: force validator = null
        //if (this.debug && this.mobile) this.setValidatorService(null);
        super.ngOnInit();
        // Configure sortBy replacement
        this.memoryDataService.addSortByReplacement('taxonGroup', `taxonGroup.${firstArrayValue(this.autocompleteFields.taxonGroup.attributes)}`);
        this.memoryDataService.addSortByReplacement('taxonName', `taxonName.${firstArrayValue(this.autocompleteFields.taxonName.attributes)}`);
        // Listen showSamplingBatchColumns
        this._state.hold(this.showSamplingBatchColumns$, (value) => __awaiter(this, void 0, void 0, function* () {
            if (this.validatorService) {
                this.configureValidator(this.validatorService.measurementsOptions);
            }
            this.setModalOption('showSamplingBatch', value);
            // updateColumns only if pmfms are ready
            if (this._initialPmfms) {
                if (this.loading)
                    yield this.waitIdle({ timeout: 500 });
                this.computeDynamicColumns(this.qvPmfm, { cache: false /* no cache, to force computed */ });
                this.updateColumns();
            }
        }));
    }
    ngOnDestroy() {
        super.ngOnDestroy();
    }
    configureValidator(opts) {
        // make sure to confirm editing row, before to change validator
        this.confirmEditCreate();
        this.validatorService.measurementsOptions = null; // disable
        this.validatorService.delegateOptions = {
            qvPmfm: this.qvPmfm,
            withMeasurements: !this.qvPmfm && isNotEmptyArray(this._speciesPmfms),
            pmfms: this._speciesPmfms,
            childrenPmfms: this._childrenPmfms,
            enableSamplingBatch: this.showSamplingBatchColumns,
        };
    }
    translateControlPath(controlPath) {
        var _a;
        if (controlPath.startsWith('measurementValues.')) {
            const parts = controlPath.split('.');
            const pmfmId = parseInt(parts[parts.length - 1]);
            const pmfm = (this._speciesPmfms || []).find((p) => p.id === pmfmId);
            if (pmfm)
                return PmfmUtils.getPmfmName(pmfm);
        }
        else if (controlPath.includes('.measurementValues.')) {
            const parts = controlPath.split('.');
            const pmfmId = parseInt(parts[parts.length - 1]);
            const pmfm = [...this._childrenPmfms, this.qvPmfm].find((p) => (p === null || p === void 0 ? void 0 : p.id) === pmfmId);
            if (pmfm)
                return PmfmUtils.getPmfmName(pmfm);
        }
        else if (controlPath.startsWith('children.')) {
            const parts = controlPath.split('.');
            let prefix = '';
            if (this.qvPmfm) {
                const qvIndex = parseInt(parts[1]);
                prefix = (_a = this.qvPmfm.qualitativeValues[qvIndex]) === null || _a === void 0 ? void 0 : _a.name;
                controlPath = parts.slice(2).join('.');
            }
            const col = BatchGroupsTable_1.BASE_DYNAMIC_COLUMNS.find((col) => col.path === controlPath);
            prefix = prefix.length ? `${prefix} > ` : prefix;
            if (col)
                return `${prefix} > ${this.translate.instant(col.label)}`;
            // Example: error on the sampling form group
            if (controlPath === 'children.0') {
                return prefix + this.translate.instant('TRIP.BATCH.EDIT.SAMPLING_BATCH');
            }
        }
        return super.translateControlPath(controlPath);
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    setSubBatchesModalOption(key, value) {
        this.subBatchesModalOptions = this.subBatchesModalOptions || {};
        this.subBatchesModalOptions[key] = value;
    }
    onLoad(data) {
        if (this.debug)
            console.debug('[batch-group-table] Preparing data to be loaded as table rows...');
        const weightMethodValues = this.qvPmfm
            ? this.qvPmfm.qualitativeValues.reduce((res, qv, qvIndex) => {
                res[qvIndex] = false;
                return res;
            }, {})
            : { 0: false };
        // Transform entities into object array
        data = data.map((batch) => {
            if (isNotEmptyArray(batch.children) && this.qvPmfm) {
                // For each group (one by qualitative value)
                this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
                    const childLabel = `${batch.label}.${qv.label}`;
                    // tslint:disable-next-line:triple-equals
                    const child = batch.children.find((c) => c.label === childLabel || c.measurementValues[this.qvPmfm.id] == qv.id);
                    if (child) {
                        // Replace measurement values inside a new map, based on fake pmfms
                        this.normalizeChildToRow(child, qvIndex);
                        // Remember method used for the weight (estimated or not)
                        if (!weightMethodValues[qvIndex]) {
                            if (child.weight && child.weight.estimated) {
                                weightMethodValues[qvIndex] = true;
                            }
                            else if (child.children && child.children.length === 1) {
                                const samplingChild = child.children[0];
                                weightMethodValues[qvIndex] = samplingChild.weight && samplingChild.weight.estimated;
                            }
                        }
                        // Should have sub batches, when sampling batch exists
                        const hasSubBatches = this.showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(child));
                        // Make sure to create a sampling batch, if has sub bacthes
                        if (hasSubBatches) {
                            BatchUtils.getOrCreateSamplingChild(child);
                        }
                    }
                });
            }
            else if (!this.qvPmfm && batch) {
                // Replace measurement values inside a new map, based on fake pmfms
                this.normalizeChildToRow(batch, -1);
                // Remember method used for the weight (estimated or not)
                if (!weightMethodValues[0]) {
                    if (batch.weight && batch.weight.estimated) {
                        weightMethodValues[0] = true;
                    }
                    else if (batch.children && batch.children.length === 1) {
                        const samplingChild = batch.children[0];
                        weightMethodValues[0] = samplingChild.weight && samplingChild.weight.estimated;
                    }
                }
                // Should have sub batches, when sampling batch exists
                const hasSubBatches = this.showSamplingBatchColumns || isNotNil(BatchUtils.getSamplingChild(batch));
                // Make sure to create a sampling batch, if has sub bacthes
                if (hasSubBatches) {
                    BatchUtils.getOrCreateSamplingChild(batch);
                }
            }
            MeasurementValuesUtils.normalizeEntityToForm(batch, this._speciesPmfms, null, { keepOtherExistingPmfms: true });
            return batch;
        });
        // Set weight is estimated ?
        if (this.weightMethodForm) {
            console.debug('[batch-group-table] Set weight form values (is estimated ?)');
            this.weightMethodForm.patchValue(weightMethodValues);
        }
        return data;
    }
    onSave(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[batch-group-table] Preparing data to be saved...');
            data = data.map((entity) => {
                this.prepareEntityToSave(entity);
                return entity;
            });
            return data;
        });
    }
    isComputed(col, row) {
        if (typeof col.computed !== 'function')
            return col.computed === true;
        // With qv pmfm
        if (col.qvIndex >= 0) {
            const parent = row.currentData;
            const batch = parent.children[col.qvIndex];
            return col.computed(batch, parent, this.samplingRatioFormat);
        }
        return col.computed(row.currentData, null, this.samplingRatioFormat);
    }
    /**
     * Use in ngFor, for trackBy
     *
     * @param index
     * @param column
     */
    trackColumnFn(index, column) {
        return column.rankOrder;
    }
    setFilter(filterData, opts) {
        const filteredSpeciesPmfmIds = filterData && Object.keys(filterData.measurementValues);
        if (isNotEmptyArray(filteredSpeciesPmfmIds)) {
            let changed = false;
            filteredSpeciesPmfmIds.forEach((pmfmId) => {
                const shouldExcludeColumn = PmfmValueUtils.isNotEmpty(filterData.measurementValues[pmfmId]);
                if (shouldExcludeColumn !== this.excludesColumns.includes(pmfmId)) {
                    this.setShowSpeciesPmfmColumn(+pmfmId, false, { emitEvent: false });
                    changed = true;
                }
            });
            if (changed)
                this.updateColumns();
        }
        super.setFilter(filterData, opts);
    }
    updateView(res, opts) {
        const _super = Object.create(null, {
            updateView: { get: () => super.updateView }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.updateView.call(this, res, opts);
            // Add hidden data to row count (e.g. when a filter has been applied)
            this.totalRowCount = this.totalRowCount + this.memoryDataService.hiddenCount;
        });
    }
    /* -- protected methods -- */
    normalizeEntityToRow(batch, row) {
        // When batch has the QV value
        if (this.qvPmfm) {
            if (isNotEmptyArray(batch.children)) {
                // For each group (one by qualitative value)
                this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
                    const childLabel = `${batch.label}.${qv.label}`;
                    // tslint:disable-next-line:triple-equals
                    const child = batch.children.find((c) => c.label === childLabel || c.measurementValues[this.qvPmfm.id] == qv.id);
                    if (child) {
                        this.normalizeChildToRow(child, qvIndex);
                    }
                    // DEBUG
                    // else console.warn('[batch-group-table] Missing child batch having QV=' + qv.label, batch);
                });
            }
        }
        // Inherited method
        super.normalizeEntityToRow(batch, row, { keepOtherExistingPmfms: true });
    }
    normalizeChildToRow(data, qvIndex) {
        // DEBUG
        //if (this.debug) console.debug('[batch-group-table] Normalize QV child batch', data);
        var _a, _b;
        if (isNil(qvIndex)) {
            const qvId = this.qvPmfm && data.measurementValues[this.qvPmfm.id];
            qvIndex = isNotNil(qvId) && this.qvPmfm.qualitativeValues.findIndex((qv) => qv.id === +qvId);
            if (qvIndex === -1)
                throw Error('Invalid batch: no QV value');
        }
        // Column: total weight
        data.weight = BatchUtils.getWeight(data, this.weightPmfms);
        // DEBUG
        if (this.debug && data.qualityFlagId === QualityFlagIds.BAD) {
            console.warn('[batch-group-table] Invalid batch (individual count or weight)', data);
        }
        // Sampling batch
        const samplingChild = BatchUtils.getSamplingChild(data);
        if (samplingChild) {
            // Column: sampling weight
            samplingChild.weight = BatchUtils.getWeight(samplingChild, this.weightPmfms);
            // Transform sampling ratio
            if (this.inlineEdition && isNotNil(samplingChild.samplingRatio)) {
                samplingChild.samplingRatioComputed = BatchUtils.isSamplingRatioComputed(samplingChild.samplingRatioText, this.samplingRatioFormat);
            }
        }
        const qvId = ((_b = (_a = this.qvPmfm) === null || _a === void 0 ? void 0 : _a.qualitativeValues[qvIndex]) === null || _b === void 0 ? void 0 : _b.id) || -1;
        const childrenPmfms = qvId !== -1 ? BatchGroupUtils.mapChildrenPmfms(this._childrenPmfms, { qvPmfm: this.qvPmfm, qvId }) : this._speciesPmfms;
        data.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, childrenPmfms, { keepSourceObject: true });
    }
    prepareEntityToSave(batch) {
        if (this.qvPmfm) {
            batch.children = (this.qvPmfm.qualitativeValues || []).map((qv, qvIndex) => this.prepareChildToSave(batch, qv, qvIndex));
            batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues, this._speciesPmfms);
        }
        else {
            batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues, this._speciesPmfms);
            this.prepareChildToSave(batch);
        }
    }
    prepareChildToSave(source, qv, qvIndex) {
        var _a, _b, _c, _d;
        qvIndex = isNotNil(qvIndex) ? qvIndex : -1;
        const isEstimatedWeight = ((_a = this.weightMethodForm) === null || _a === void 0 ? void 0 : _a.controls[qvIndex].value) || false;
        const childLabel = qv ? `${source.label}.${qv.label}` : source.label;
        // If qv, add sub level at sorting batch for each qv value
        // If no qv, keep measurements in sorting batch level
        const batch = !qv ? source : (source.children || []).find((b) => b.label === childLabel) || new Batch();
        // If qv compute rank order with qv index, else keep existing rank order
        batch.rankOrder = qvIndex >= 0 ? qvIndex + 1 : batch.rankOrder;
        batch.label = childLabel;
        if (qv) {
            batch.measurementValues[this.qvPmfm.id.toString()] = qv;
        }
        // Clean previous weights
        this.weightPmfms.forEach((p) => (batch.measurementValues[p.id.toString()] = undefined));
        // Set weight
        if (isNotNilOrNaN((_b = batch.weight) === null || _b === void 0 ? void 0 : _b.value)) {
            batch.weight.estimated = isEstimatedWeight;
            const weightPmfm = BatchUtils.getWeightPmfm(batch.weight, this.weightPmfms, this.weightPmfmsByMethod);
            batch.measurementValues[weightPmfm.id.toString()] = (_c = batch.weight.value) === null || _c === void 0 ? void 0 : _c.toString();
        }
        // Convert measurementValues to model
        batch.measurementValues = MeasurementValuesUtils.normalizeValuesToModel(batch.measurementValues, this._childrenPmfms, 
        // Keep weight values
        { keepSourceObject: true });
        // If sampling
        if (isNotEmptyArray(batch.children)) {
            const samplingBatchLabel = childLabel + Batch.SAMPLING_BATCH_SUFFIX;
            const samplingBatch = (batch.children || []).find((b) => b.label === samplingBatchLabel) || new Batch();
            samplingBatch.rankOrder = 1;
            samplingBatch.label = samplingBatchLabel;
            // Clean previous weights
            this.weightPmfms.forEach((p) => (samplingBatch.measurementValues[p.id.toString()] = undefined));
            // Set weight
            if (isNotNilOrNaN((_d = samplingBatch.weight) === null || _d === void 0 ? void 0 : _d.value)) {
                samplingBatch.weight.estimated = isEstimatedWeight;
                const samplingWeightPmfm = BatchUtils.getWeightPmfm(samplingBatch.weight, this.weightPmfms, this.weightPmfmsByMethod);
                samplingBatch.measurementValues[samplingWeightPmfm.id.toString()] = samplingBatch.weight.value;
            }
            // Convert sampling ratio
            if (this.inlineEdition && isNotNil(samplingBatch.samplingRatio)) {
                const detectedFormat = BatchUtils.getSamplingRatioFormat(samplingBatch.samplingRatioText, this.samplingRatioFormat);
                if (detectedFormat !== this.samplingRatioFormat) {
                    // TODO adapt text if format change ?
                    console.warn('[batch-group-table] TODO: adapt samplingRatioText to new format=' + this.samplingRatioFormat);
                }
            }
            batch.children = [samplingBatch];
        }
        // Remove children
        else {
            batch.children = [];
        }
        return batch;
    }
    onSubBatchesClick(event, row, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            event === null || event === void 0 ? void 0 : event.preventDefault();
            event === null || event === void 0 ? void 0 : event.stopPropagation(); // Avoid to send event to clicRow()
            // Loading spinner
            this.markAsLoading();
            try {
                const selectedParent = this.toEntity(row);
                const subBatches = yield this.openSubBatchesModal(selectedParent, opts);
                if (isNil(subBatches))
                    return; // User cancelled
                // Update the batch group, from subbatches (e.g. observed individual count)
                this.updateBatchGroupRow(row, subBatches);
            }
            finally {
                // Hide loading
                if (!opts || opts.emitLoaded !== false) {
                    this.markAsLoaded();
                }
                this.markForCheck();
            }
        });
    }
    /* -- protected functions -- */
    // Override parent function
    mapPmfms(pmfms) {
        if (!pmfms)
            return pmfms; // Skip (no pmfms)
        super.mapPmfms(pmfms); // Should find the qvPmfm
        // Find the first qualitative PMFM
        this.qvPmfm = BatchGroupUtils.getQvPmfm(pmfms);
        // Compute species pmfms (at species batch level)
        if (this.qvPmfm) {
            const qvPmfmIndex = this._initialPmfms.findIndex((pmfm) => pmfm.id === this.qvPmfm.id);
            this._speciesPmfms = this._initialPmfms.filter((pmfm, index) => index < qvPmfmIndex);
            this._childrenPmfms = [this.qvPmfm, ...this._initialPmfms.filter((pmfm, index) => index > qvPmfmIndex && !PmfmUtils.isWeight(pmfm))];
        }
        else {
            this._speciesPmfms = this._initialPmfms.filter((pmfm) => !PmfmUtils.isWeight(pmfm));
            this._childrenPmfms = [];
        }
        // Init dynamic columns
        this.computeDynamicColumns(this.qvPmfm, { cache: false });
        //Additional pmfms managed by validator on children batch
        return this._speciesPmfms;
    }
    computeDynamicColumns(qvPmfm, opts = { cache: true }) {
        // Use cache
        if (this.dynamicColumns) {
            if (opts.cache !== false) {
                console.debug(this.logPrefix + 'Reusing cached dynamic columns', this.dynamicColumns);
                return this.dynamicColumns;
            }
            else {
                console.debug(this.logPrefix + 'Updating dynamic columns');
            }
        }
        // DEBUG
        if (this.debug) {
            // Log QV pmfm
            if (this.qvPmfm)
                console.debug('[batch-group-table] Using a qualitative PMFM, to group columns: ' + qvPmfm.label);
            // Make sure default weight pmfm exists
            if (isNil(this.defaultWeightPmfm)) {
                //throw new Error(`[batch-group-table] Unable to construct the table. No weight PMFM found in strategy - acquisition level ${this.acquisitionLevel})`);
                console.warn(`[batch-group-table] Unable to construct the table. No weight PMFM found in strategy - acquisition level ${this.acquisitionLevel})`);
            }
            // Check rankOrder is correct
            else if (PmfmUtils.isDenormalizedPmfm(this.defaultWeightPmfm) &&
                qvPmfm &&
                PmfmUtils.isDenormalizedPmfm(qvPmfm) &&
                qvPmfm.rankOrder > this.defaultWeightPmfm.rankOrder) {
                throw new Error(`[batch-group-table] Unable to construct the table. First qualitative value PMFM must be define BEFORE any weight PMFM (by rankOrder in PMFM strategy - acquisition level ${this.acquisitionLevel})`);
            }
        }
        // If estimated weight is allow, init a form for weight methods
        if (!this.weightMethodForm && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER]) {
            // Create the form, for each QV value
            if (qvPmfm) {
                this.weightMethodForm = this.formBuilder.group(qvPmfm.qualitativeValues.reduce((res, qv, index) => {
                    res[index] = [false, Validators.required];
                    return res;
                }, {}));
            }
            else {
                // TODO create weightMethodForm when no QV Pmfm
                console.warn('[batch-groups-table] TODO: create weightMethodForm, when no QV Pmfm');
            }
        }
        this.estimatedWeightPmfm = (this.weightPmfmsByMethod && this.weightPmfmsByMethod[MethodIds.ESTIMATED_BY_OBSERVER]) || this.defaultWeightPmfm;
        this.showAutoFillButton = toBoolean(this.showAutoFillButton, isNotEmptyArray(this.availableTaxonGroups));
        // No QV pmfm (no grouped columns)
        if (!qvPmfm) {
            this.groupColumns = [];
            // Add species Pmfms
            const speciesColumns = this.computePmfmColumns(this._speciesPmfms || [], 0, {
                qvIndex: -1,
            });
            const childrenColumns = this.computeDynamicColumnsByQv();
            this.dynamicColumns = speciesColumns.concat(childrenColumns);
            // show toolbar if desktop, or on mobile when auto-fill button is visible
            this.showToolbar = !this.mobile || this.showAutoFillButton;
        }
        else {
            const groupColumns = [];
            // Add species Pmfms
            const speciesColumns = this.computePmfmColumns(this._speciesPmfms || [], 0, {
                qvIndex: -1,
            });
            const childrenColumns = qvPmfm.qualitativeValues.flatMap((qv, qvIndex) => {
                const qvColumns = this.computeDynamicColumnsByQv(qv, qvIndex);
                // Create the group column
                const visibleColumnCount = qvColumns.filter((c) => !c.hidden).length;
                const groupKey = `group-${qv.label}`;
                groupColumns.push({
                    key: groupKey,
                    name: qv.name,
                    qvIndex,
                    colSpan: visibleColumnCount,
                });
                return qvColumns;
            });
            // DEBUG
            if (this.debug)
                console.debug('[batch-groups-table] Dynamic columns: ' + speciesColumns.map((c) => c.key).join(','));
            this.groupColumns = groupColumns;
            this.dynamicColumns = speciesColumns.concat(childrenColumns);
            this.showToolbar = true; // Always show
        }
    }
    computeDynamicColumnsByQv(qvGroup, qvIndex) {
        qvIndex = isNotNil(qvIndex) ? qvIndex : -1;
        const qvId = (qvGroup === null || qvGroup === void 0 ? void 0 : qvGroup.id) || -1;
        let rankOrderOffset = this._speciesPmfms.filter((p) => !p.hidden).length;
        if (qvIndex > 0) {
            rankOrderOffset += qvIndex * (BatchGroupsTable_1.BASE_DYNAMIC_COLUMNS.length + ((!this.mobile && this._childrenPmfms.length) || 0));
        }
        const hideWeightColumns = !this._showWeightColumns;
        const hideIndividualCountColumns = !this.showIndividualCountColumns;
        const hideSamplingColumns = !this.showSamplingBatchColumns;
        const hideSamplingRatioColumns = hideSamplingColumns;
        // Add pmfm columns
        const childrenPmfms = BatchGroupUtils.mapChildrenPmfms(this._childrenPmfms, { qvPmfm: this.qvPmfm, qvId });
        const pmfmColumns = childrenPmfms.map((pmfm, index) => {
            const key = qvGroup ? `${qvGroup.label}_${pmfm.id}` : `${pmfm.id}`;
            const rankOrder = rankOrderOffset + index;
            const hidden = this.mobile || pmfm.hidden;
            const path = qvIndex === -1 ? `measurementValues.${pmfm.id}` : `children.${qvIndex}.measurementValues.${pmfm.id}`;
            return {
                type: 'pmfm',
                label: this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix }),
                key,
                qvIndex,
                rankOrder,
                hidden,
                classList: 'total',
                computed: pmfm.isComputed || false,
                isIndividualCount: false,
                isSampling: false,
                pmfm,
                unitLabel: pmfm.unitLabel,
                path,
            };
        });
        const qvColumns = BatchGroupsTable_1.BASE_DYNAMIC_COLUMNS.map((def, index) => {
            const key = qvGroup ? `${qvGroup.label}_${def.key}` : def.key;
            const path = qvIndex >= 0 ? `children.${qvIndex}.${def.path}` : def.path;
            const rankOrder = rankOrderOffset + pmfmColumns.length + index;
            const isSamplingRatio = hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING_RATIO);
            const hidden = (hideWeightColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_WEIGHT)) ||
                (hideIndividualCountColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT)) ||
                (hideSamplingColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING)) ||
                (hideSamplingRatioColumns && hasFlag(def.flags, BatchGroupColumnFlags.IS_SAMPLING_RATIO));
            const label = isSamplingRatio && this.samplingRatioFormat === '1/w' ? 'TRIP.BATCH.TABLE.SAMPLING_COEFFICIENT' : def.label;
            const unitLabel = isSamplingRatio && this.samplingRatioFormat === '1/w' ? null : def.unitLabel;
            let computed = def.computed;
            let flags = def.flags;
            // Detect computed column, when taxonGroupsNoWeight is used
            if (isNotEmptyArray(this.taxonGroupsNoWeight)) {
                if (def.key === 'totalIndividualCount') {
                    computed = composeBatchComputed([computed, (batch, parent) => !this.isTaxonGroupNoWeight((parent === null || parent === void 0 ? void 0 : parent.taxonGroup) || (batch === null || batch === void 0 ? void 0 : batch.taxonGroup))]);
                }
                else if (hasFlag(def.flags, BatchGroupColumnFlags.IS_WEIGHT)) {
                    computed = composeBatchComputed([computed, (batch, parent) => this.isTaxonGroupNoWeight((parent === null || parent === void 0 ? void 0 : parent.taxonGroup) || (batch === null || batch === void 0 ? void 0 : batch.taxonGroup))]);
                }
            }
            // Is Landing ?
            if (qvIndex < 0 || qvIndex === 0) {
                // eslint-disable-next-line no-bitwise
                flags = flags | BatchGroupColumnFlags.IS_LANDING;
                // Detect computed column, when taxonGroupsNoLanding is used
                if (isNotEmptyArray(this.taxonGroupsNoLanding)) {
                    computed = composeBatchComputed([computed, (batch, parent) => this.isTaxonGroupNoLanding((parent === null || parent === void 0 ? void 0 : parent.taxonGroup) || (batch === null || batch === void 0 ? void 0 : batch.taxonGroup))]);
                }
            }
            return Object.assign(Object.assign(Object.assign({}, ((def.isWeight && this.defaultWeightPmfm) || {})), def), { key,
                flags,
                label,
                unitLabel,
                qvIndex,
                rankOrder,
                hidden,
                path,
                computed });
        });
        return pmfmColumns.concat(qvColumns);
    }
    computePmfmColumns(pmfms, offset, opts) {
        offset = offset || 0;
        // Add Pmfm columns
        return (pmfms || []).map((pmfm, index) => (Object.assign({ type: 'pmfm', label: this.pmfmNamePipe.transform(pmfm, { i18nPrefix: this.i18nPmfmPrefix, i18nContext: this.i18nColumnSuffix }), key: pmfm.id.toString(), rankOrder: offset + index, qvIndex: -1, hidden: pmfm.hidden, computed: pmfm.isComputed || false, isIndividualCount: false, isSampling: false, pmfm, unitLabel: pmfm.unitLabel, path: `measurementValues.${pmfm.id}` }, opts)));
    }
    getUserColumns(userColumns) {
        userColumns = userColumns || this.settings.getPageSettings(this.settingsId, SETTINGS_DISPLAY_COLUMNS);
        // Exclude OLD user columns (fix issue on v0.16.2)
        userColumns = userColumns && userColumns.filter((c) => c === 'weight' || c === 'individualCount');
        return isNotEmptyArray(userColumns) && userColumns.length === 2
            ? userColumns
            : // If not user column override (or if bad format), then use defaults
                DEFAULT_USER_COLUMNS.slice(0);
    }
    updateColumns() {
        if (!this.dynamicColumns)
            return; // skip
        this.displayedColumns = this.getDisplayColumns();
        this.groupColumnStartColSpan = RESERVED_START_COLUMNS.length + (this.showTaxonGroupColumn ? 1 : 0) + (this.showTaxonNameColumn ? 1 : 0);
        if (this.qvPmfm) {
            this.groupColumnStartColSpan += isEmptyArray(this._speciesPmfms)
                ? 0
                : this._speciesPmfms.filter((p) => !p.hidden && !this.excludesColumns.includes('' + p.id)).length;
        }
        else {
            this.groupColumnStartColSpan += this.dynamicColumns.filter((c) => !c.hidden && !this.excludesColumns.includes(c.key)).length;
        }
        if (!this.loading)
            this.markForCheck();
    }
    deleteSelection(event) {
        return super.deleteSelection(event);
    }
    getDisplayColumns() {
        if (!this.dynamicColumns)
            return this.columns;
        const userColumns = this.getUserColumns();
        const weightIndex = userColumns.findIndex((c) => c === 'weight');
        let individualCountIndex = userColumns.findIndex((c) => c === 'individualCount');
        individualCountIndex = individualCountIndex !== -1 && weightIndex === -1 ? 0 : individualCountIndex;
        const inverseOrder = individualCountIndex < weightIndex;
        const dynamicColumnKeys = (this.dynamicColumns || [])
            .map((c) => ({
            key: c.key,
            hidden: c.hidden,
            rankOrder: c.rankOrder + (inverseOrder ? (c.isWeight && 1) || (c.isIndividualCount && -1) : 0),
        }))
            .sort((c1, c2) => c1.rankOrder - c2.rankOrder)
            .filter((c) => !c.hidden)
            .map((c) => c.key);
        this.groupColumnNames = ['top-start'].concat(this.groupColumns.map((c) => c.key)).concat(['top-end']);
        return RESERVED_START_COLUMNS.concat(BATCH_RESERVED_START_COLUMNS)
            .concat(dynamicColumnKeys)
            .concat(BATCH_RESERVED_END_COLUMNS)
            .concat(RESERVED_END_COLUMNS)
            .filter((name) => !this.excludesColumns.includes(name));
    }
    /**
     * Open the sub batches modal, from a parent batch group.
     * Return the updated parent, or undefined if o changes (e.g. user cancelled)
     *
     * @param data
     * @protected
     */
    openSubBatchesModalFromParentModal(data) {
        return __awaiter(this, void 0, void 0, function* () {
            let changes = false;
            // Search if row already exists
            let row = yield this.findRowByEntity(data);
            // Row already exists: edit the row
            if (row) {
                if (row !== this.editedRow) {
                    const confirmed = this.confirmEditCreate();
                    if (!confirmed)
                        throw new Error('Cannot confirmed the preview edited row !');
                }
                // Update row's data
                row.currentData = data;
                // Select the row (highlight)
                this.editedRow = row;
            }
            // Add new row to table
            else {
                console.debug('[batch-group-table] Adding batch group, before opening sub batches modal...');
                row = yield this.addEntityToTable(data, { confirmCreate: false });
                if (!row)
                    throw new Error('Cannot add new row!');
                changes = true;
            }
            const subBatches = yield this.openSubBatchesModal(data, {
                showParent: false, // action triggered from the parent batch modal, so the parent field can be hidden
            });
            // User cancelled from the subbatches modal
            if (!subBatches) {
                // If row was added, return changes made when adding the row
                if (changes)
                    return data;
                // No changes
                return;
            }
            // Update the parent
            data = this.updateBatchGroupFromSubBatches(data, subBatches);
            return data;
        });
    }
    openSubBatchesModal(parentGroup, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // DEBUG
            if (this.debug)
                console.debug('[batches-table] Open individual measures modal...');
            // FIXME: opts.showParent=true not working
            const showParentGroup = !opts || opts.showParent !== false; // True by default
            const stopSubject = new Subject();
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: SubBatchesModal,
                componentProps: Object.assign({ programLabel: this.programLabel, acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL, usageMode: this.usageMode, showParentGroup,
                    parentGroup, data: this.availableSubBatches, qvPmfm: this.qvPmfm, disabled: this.disabled, 
                    // Scientific species is required, only not already set in batch groups
                    showTaxonNameColumn: !this.showTaxonNameColumn, 
                    // If on field mode: use individualCount=1 on each sub-batches
                    showIndividualCount: !this.settings.isOnFieldMode(this.usageMode), 
                    // Define available parent, as an observable (if new parent can added)
                    availableParents: this.dataSource.rowsSubject.pipe(takeUntil(stopSubject), map((rows) => rows.map((r) => r.currentData)), tap((data) => console.warn('[batch-groups-table] Modal -> New available parents:', data))), onNewParentClick: () => __awaiter(this, void 0, void 0, function* () {
                        const { data, role } = yield this.openDetailModal();
                        if (data) {
                            yield this.addEntityToTable(data, { editing: false });
                        }
                        return data;
                    }), i18nSuffix: this.i18nColumnSuffix, mobile: this.mobile, 
                    // Override using input options
                    maxVisibleButtons: (_a = this.modalOptions) === null || _a === void 0 ? void 0 : _a.maxVisibleButtons, maxItemCountForButtons: (_b = this.modalOptions) === null || _b === void 0 ? void 0 : _b.maxItemCountForButtons }, this.subBatchesModalOptions),
                backdropDismiss: false,
                keyboardClose: true,
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large',
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            stopSubject.next(); // disconnect datasource observables
            // User cancelled
            if (isNil(data) || role === 'cancel') {
                if (this.debug)
                    console.debug('[batches-table] Sub-batches modal: user cancelled');
            }
            else {
                // DEBUG
                //if (this.debug) console.debug('[batches-table] Sub-batches modal result: ', data);
                this.onSubBatchesChanges.emit(data);
            }
            return data;
        });
    }
    openDetailModal(dataToOpen, row) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[batch-group-table] Opening detail modal...');
            let originalData;
            let isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new BatchGroup();
                yield this.onNewEntity(dataToOpen);
            }
            else {
                // Clone data, to keep the original data (allow to cancel - see below)
                originalData = this.asEntity(dataToOpen).clone();
            }
            this.markAsLoading();
            const modal = yield this.modalCtrl.create({
                component: BatchGroupModal,
                componentProps: Object.assign(Object.assign({ acquisitionLevel: this.acquisitionLevel, pmfms: this._initialPmfms, qvPmfm: this.qvPmfm, disabled: this.disabled, showTaxonGroup: this.showTaxonGroupColumn, showTaxonName: this.showTaxonNameColumn, availableTaxonGroups: this.availableTaxonGroups, taxonGroupsNoWeight: this.taxonGroupsNoWeight, showSamplingBatch: this.showSamplingBatchColumns, allowSubBatches: this.allowSubBatches, defaultHasSubBatches: this.defaultHasSubBatches, samplingRatioFormat: this.samplingRatioFormat, openSubBatchesModal: (data) => this.openSubBatchesModalFromParentModal(data), onDelete: (event, batchGroup) => this.deleteEntity(event, batchGroup), onSaveAndNew: (dataToSave) => __awaiter(this, void 0, void 0, function* () {
                        // Always try to retrieve the row (fix #403)
                        row = yield this.findRowByEntity(dataToSave);
                        // Insert or update
                        let savedRow;
                        if (isNew && !row) {
                            savedRow = yield this.addEntityToTable(dataToSave, { editing: false });
                        }
                        else if (row) {
                            savedRow = yield this.updateEntityToTable(dataToSave, row, { confirmEdit: true });
                        }
                        if (!savedRow)
                            return undefined; // Failed
                        // Prepare new entity
                        dataToOpen = new BatchGroup();
                        yield this.onNewEntity(dataToOpen);
                        isNew = true; // Next row should be new
                        row = null; // Forget the row to update
                        originalData = null; // forget the orignal data
                        return dataToOpen;
                    }), i18nSuffix: this.i18nColumnSuffix, mobile: this.mobile, usageMode: this.usageMode }, this.modalOptions), { 
                    // Data to open
                    isNew, data: dataToOpen }),
                cssClass: 'modal-large',
                backdropDismiss: false,
                keyboardClose: true,
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            // /!\ we use 'onWillDismiss' (and NOT 'onDidDismiss') to make sure row is deleted if cancelled, BEFORE modal is really closed
            const { data, role } = yield modal.onWillDismiss();
            if (data && this.debug)
                console.debug('[batch-group-table] Batch group modal result: ', data, role);
            this.markAsLoaded();
            // User cancelled: try to rollback changes
            if (!data || role === 'cancel') {
                // new data: delete if exists
                // /!\ it can be added when open the subbatches moda : that why we need to delete a new row !
                if (isNew) {
                    yield this.deleteEntity(null, dataToOpen);
                }
                // Revert changes
                else if (originalData) {
                    row = yield this.findRowByEntity(dataToOpen);
                    row.currentData = originalData;
                }
            }
            return { data: data instanceof BatchGroup ? data : undefined, role };
        });
    }
    openSelectColumnsModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            let userColumns = this.getUserColumns();
            const hiddenColumns = DEFAULT_USER_COLUMNS.slice(0).filter((name) => userColumns.indexOf(name) === -1);
            let columns = (userColumns || []).concat(hiddenColumns).map((name) => {
                const label = this.i18nColumnPrefix + changeCaseToUnderscore(name).toUpperCase();
                return {
                    name,
                    label,
                    visible: userColumns.indexOf(name) !== -1,
                };
            });
            const modal = yield this.modalCtrl.create({
                component: TableSelectColumnsComponent,
                componentProps: {
                    columns,
                    canHideColumns: false,
                },
            });
            // Open the modal
            yield modal.present();
            // On dismiss
            const res = yield modal.onDidDismiss();
            if (!res || !res.data)
                return; // CANCELLED
            columns = res.data;
            // Update columns
            userColumns = columns.filter((c) => c.visible).map((c) => c.name) || [];
            // Update user settings
            yield this.settings.savePageSetting(this.settingsId, userColumns, SETTINGS_DISPLAY_COLUMNS);
            this.updateColumns();
        });
    }
    findRowByEntity(data) {
        const _super = Object.create(null, {
            findRowByEntity: { get: () => super.findRowByEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield _super.findRowByEntity.call(this, data);
            // TODO: remove this code, after testing well the App
            if (!environment.production) {
                const result2 = data && this.dataSource.getRows().find((r) => BatchGroup.equals(r.currentData, data));
                if (result !== result2) {
                    console.warn('[batch-group-table] TODO: findRowByEntity(). Not same result, using static BatchGroup.equals() !', result, result2);
                }
            }
            return result;
        });
    }
    /**
     * Update the batch group row (e.g. observed individual count), from subbatches
     *
     * @param row
     * @param subBatches
     * @param opts
     */
    updateBatchGroupRow(row, subBatches, opts = { emitEvent: true }) {
        const parent = row && row.currentData;
        if (!parent)
            return; // skip
        const updatedParent = this.updateBatchGroupFromSubBatches(parent, subBatches || []);
        if (row.validator) {
            row.validator.patchValue(updatedParent, opts);
        }
        else {
            row.currentData = updatedParent.clone(); // Force a refresh (because of propertyGet pipe)
        }
        return updatedParent;
    }
    /**
     * Update the batch group row (e.g. observed individual count), from subbatches
     *
     * @param parent
     * @param subBatches
     */
    updateBatchGroupFromSubBatches(parent, subBatches) {
        if (!parent)
            return parent; // skip
        const children = (subBatches || []).filter((b) => this.equals(parent, b.parentGroup));
        if (this.debug)
            console.debug('[batch-group-table] Updating batch group, from batches...', parent, children);
        const updateSortingBatch = (batch, children) => {
            const samplingBatch = BatchUtils.getOrCreateSamplingChild(batch);
            // Update individual count
            samplingBatch.individualCount = BatchUtils.sumObservedIndividualCount(children);
            parent.observedIndividualCount = samplingBatch.individualCount || 0;
            // Update weight, if Length-Weight conversion enabled
            if (this.enableWeightLengthConversion) {
                samplingBatch.childrenWeight = BatchUtils.sumCalculatedWeight(children, this.weightPmfms, this.weightPmfmsByMethod);
                console.debug('[batch-group-table] Computed children weight: ', samplingBatch.childrenWeight);
            }
            else {
                samplingBatch.childrenWeight = null;
            }
            // return some values, to compute sum on the batch group
            return {
                individualCount: samplingBatch.individualCount,
                childrenWeight: samplingBatch.childrenWeight,
            };
        };
        if (this.qvPmfm) {
            const qvPmfmId = this.qvPmfm.id.toString();
            let observedIndividualCount = 0;
            this.qvPmfm.qualitativeValues.forEach((qv, qvIndex) => {
                const batchGroup = (parent.children || []).find((b) => PmfmValueUtils.equals(b.measurementValues[qvPmfmId], qv));
                const qvChildren = children.filter((c) => PmfmValueUtils.equals(c.measurementValues[qvPmfmId], qv));
                if (!batchGroup) {
                    throw new Error('Invalid batch group: missing children with QV pmfm = ' + qv.label);
                }
                else {
                    const { individualCount } = updateSortingBatch(batchGroup, qvChildren);
                    // Update individual count
                    observedIndividualCount += individualCount || 0;
                }
            });
            parent.observedIndividualCount = observedIndividualCount;
        }
        else {
            const { individualCount, childrenWeight } = updateSortingBatch(parent, children);
            parent.observedIndividualCount = individualCount || 0;
        }
        return parent;
    }
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[batch-group-table] Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // generate label (override default)
            data.label = this.labelPrefix ? `${this.labelPrefix}${data.rankOrder}` : `${this.acquisitionLevel || ''}#${data.rankOrder}`;
            // Default taxon name
            if (isNotNil(this.defaultTaxonName)) {
                data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
            }
            // Default taxon group
            if (isNotNil(this.defaultTaxonGroup)) {
                data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
            }
            // Default measurements
            const filter = this.filter;
            const filteredSpeciesPmfmIds = MeasurementValuesUtils.getPmfmIds(filter === null || filter === void 0 ? void 0 : filter.measurementValues);
            if (isNotEmptyArray(filteredSpeciesPmfmIds)) {
                data.measurementValues = data.measurementValues || {};
                filteredSpeciesPmfmIds.forEach((pmfmId) => {
                    const pmfm = (this._speciesPmfms || []).find((p) => p.id === +pmfmId);
                    const filterValue = pmfm && filter.measurementValues[pmfmId];
                    if (isNil(data.measurementValues[pmfmId]) && isNotNil(filterValue)) {
                        data.measurementValues[pmfmId] = PmfmValueUtils.fromModelValue(filterValue, pmfm);
                    }
                });
            }
            if (this.qvPmfm) {
                data.children = (this.qvPmfm.qualitativeValues || []).reduce((res, qv, qvIndex) => {
                    const childLabel = `${data.label}.${qv.label}`;
                    const child = (data.children || []).find((b) => b.label === childLabel) || new Batch();
                    child.rankOrder = qvIndex + 1;
                    child.measurementValues = child.measurementValues || {};
                    child.measurementValues[this.qvPmfm.id.toString()] = qv.id.toString();
                    child.label = childLabel;
                    // If sampling
                    if (this.showSamplingBatchColumns) {
                        const samplingLabel = childLabel + Batch.SAMPLING_BATCH_SUFFIX;
                        const samplingChild = (child.children || []).find((b) => b.label === samplingLabel) || new Batch();
                        samplingChild.rankOrder = 1;
                        samplingChild.label = samplingLabel;
                        samplingChild.measurementValues = samplingChild.measurementValues || {};
                        child.children = [samplingChild];
                    }
                    // Remove children
                    else {
                        child.children = [];
                    }
                    return res.concat(child);
                }, []);
            }
            // If sampling
            else if (this.showSamplingBatchColumns) {
                const samplingLabel = data.label + Batch.SAMPLING_BATCH_SUFFIX;
                const samplingChild = (data.children || []).find((b) => b.label === samplingLabel) || new Batch();
                samplingChild.rankOrder = 1;
                samplingChild.label = samplingLabel;
                samplingChild.measurementValues = samplingChild.measurementValues || {};
                data.children = [samplingChild];
            }
        });
    }
    onPrepareRowForm(form) {
        var _a, _b, _c;
        if (!form)
            return; // Skip
        console.debug('[batch-group-table] Init row validator');
        // Remove previous subscription
        (_a = this._rowValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        const data = form.value;
        // Clean quality flag
        const qualityFlagId = data.qualityFlagId;
        if (qualityFlagId !== QualityFlagIds.NOT_QUALIFIED) {
            form.patchValue({ controlDate: null, qualificationDate: null, qualificationComments: null, qualityFlagId: QualityFlagIds.NOT_QUALIFIED }, { emitEvent: false });
            form.markAsDirty();
            this.markAsDirty({ emitEvent: false });
        }
        const hasSubBatches = (data.observedIndividualCount || 0) > 0;
        const taxonGroupNoLanding = this.isTaxonGroupNoLanding(data.taxonGroup);
        const taxonGroupNoWeight = this.isTaxonGroupNoWeight(data.taxonGroup);
        const weightRequired = !taxonGroupNoWeight;
        const individualCountRequired = taxonGroupNoWeight;
        const requiredSampleWeight = weightRequired && hasSubBatches;
        // Updating row form, with new options
        this.validatorService.updateFormGroup(form, {
            withWeight: weightRequired,
            weightRequired,
            individualCountRequired,
        });
        if (isNotEmptyArray(this.taxonGroupsNoWeight)) {
            // If taxon group with NO weights: reset weight and sampling ratio
            if (taxonGroupNoWeight) {
                this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_WEIGHT);
                this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_SAMPLING_RATIO);
            }
            // Default case (weight allowed)
            // - Reset totalIndividualCount
            else {
                // eslint-disable-next-line no-bitwise
                this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_TOTAL);
            }
        }
        // Disable/enable landing form
        if (isNotEmptyArray(this.taxonGroupsNoLanding)) {
            if (((_b = this.qvPmfm) === null || _b === void 0 ? void 0 : _b.id) === PmfmIds.DISCARD_OR_LANDING) {
                const landingForm = form.get('children.0');
                if (taxonGroupNoLanding) {
                    this.resetColumnValueByFlag(form, BatchGroupColumnFlags.IS_LANDING, { emitEvent: false });
                    landingForm.disable();
                }
                else if (landingForm.disabled) {
                    landingForm.enable();
                    landingForm.markAsUntouched();
                }
            }
        }
        const subscription = new Subscription();
        // Detect taxon group changes
        // e.g. if a taxon group becomes 'RJB' (no weight, and no landing), we should refresh the form
        if (isNotEmptyArray(this.taxonGroupsNoWeight) || isNotEmptyArray(this.taxonGroupsNoLanding)) {
            subscription.add(form
                .get('taxonGroup')
                .valueChanges.pipe(debounceTime(250), filter(ReferentialUtils.isNotEmpty), // Skip if not item selected
            map((taxonGroup) => [this.isTaxonGroupNoWeight(taxonGroup), this.isTaxonGroupNoLanding(taxonGroup)]), filter(([noWeight, noLanding]) => noWeight !== taxonGroupNoWeight || noLanding !== taxonGroupNoLanding) // distinguish changes from initial call
            )
                .subscribe((_) => {
                // DEBUG
                //console.debug(this.logPrefix + 'Detecting taxon group changes: will update form...');
                // Refresh form, because taxon group has changed
                this.onPrepareRowForm(form); // Loop
            }));
        }
        // Enable computation of weights and sampling ratio
        if (!taxonGroupNoWeight) {
            subscription.add(this.validatorService.delegate.enableSamplingRatioAndWeight(form, {
                qvPmfm: this.qvPmfm,
                samplingRatioFormat: this.samplingRatioFormat,
                requiredSampleWeight,
                weightMaxDecimals: (_c = this.defaultWeightPmfm) === null || _c === void 0 ? void 0 : _c.maximumNumberDecimals,
                markForCheck: () => this.markForCheck(),
            }));
        }
        // Register row subscription
        this._rowValidatorSubscription = subscription;
        this.registerSubscription(this._rowValidatorSubscription);
        subscription.add(() => {
            this.unregisterSubscription(subscription);
            this._rowValidatorSubscription = undefined;
        });
    }
    isTaxonGroupNoWeight(taxonGroup) {
        if (!taxonGroup || !(taxonGroup === null || taxonGroup === void 0 ? void 0 : taxonGroup.label) || isEmptyArray(this.taxonGroupsNoWeight))
            return false;
        return this.taxonGroupsNoWeight.includes(taxonGroup.label);
    }
    isTaxonGroupNoLanding(taxonGroup) {
        if (!taxonGroup || !(taxonGroup === null || taxonGroup === void 0 ? void 0 : taxonGroup.label) || isEmptyArray(this.taxonGroupsNoLanding))
            return false;
        return this.taxonGroupsNoLanding.includes(taxonGroup.label);
    }
    resetColumnValueByFlag(form, flag, opts) {
        let dirty = false;
        this.dynamicColumns
            .filter((column) => hasFlag(column.flags, flag))
            .forEach((column) => {
            const control = form.get(column.path);
            if (isNotNil(control.value)) {
                control.setValue(null);
                dirty = true;
            }
        });
        if (dirty && (opts === null || opts === void 0 ? void 0 : opts.emitEvent) !== false) {
            form.markAsDirty();
            this.markAsDirty({ emitEvent: false });
        }
        return dirty;
    }
    confirmEditCreate(event, row) {
        var _a;
        const confirmed = super.confirmEditCreate(event, row);
        // Stop row subscription
        if (confirmed && (!row || !row.editing)) {
            (_a = this._rowValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        }
        return confirmed;
    }
    getDebugData(type) {
        switch (type) {
            case 'rowValidator':
                const form = this.validatorService.getRowValidator();
                form.disable();
                return form;
        }
    }
};
BatchGroupsTable.BASE_DYNAMIC_COLUMNS = [
    // Column on total (weight, nb indiv)
    {
        type: 'double',
        key: 'totalWeight',
        path: 'weight.value',
        label: 'TRIP.BATCH.TABLE.TOTAL_WEIGHT',
        unitLabel: UnitLabel.KG,
        minValue: 0,
        maxValue: 10000,
        maximumNumberDecimals: 3,
        isWeight: true,
        // eslint-disable-next-line no-bitwise
        flags: BatchGroupColumnFlags.IS_WEIGHT | BatchGroupColumnFlags.IS_TOTAL,
        classList: 'total mat-column-weight',
        computed: (batch) => { var _a; return (batch && ((_a = batch.weight) === null || _a === void 0 ? void 0 : _a.computed)) || false; },
    },
    {
        type: 'double',
        key: 'totalIndividualCount',
        path: 'individualCount',
        label: 'TRIP.BATCH.TABLE.TOTAL_INDIVIDUAL_COUNT',
        minValue: 0,
        maxValue: 10000,
        maximumNumberDecimals: 2,
        isIndividualCount: true,
        // eslint-disable-next-line no-bitwise
        flags: BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_TOTAL,
        classList: 'total',
    },
    // Column on sampling (ratio, nb indiv, weight)
    {
        type: 'samplingRatio',
        key: 'samplingRatio',
        path: 'children.0.samplingRatio',
        label: 'TRIP.BATCH.TABLE.SAMPLING_RATIO',
        unitLabel: '%',
        // eslint-disable-next-line no-bitwise
        flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_SAMPLING_RATIO,
        isSampling: true,
        computed: (batch, parent, samplingRatioFormat) => { var _a, _b; return BatchUtils.isSamplingRatioComputed((_b = (_a = batch === null || batch === void 0 ? void 0 : batch.children) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.samplingRatioText, samplingRatioFormat) || false; },
    },
    {
        type: 'double',
        key: 'samplingWeight',
        path: 'children.0.weight.value',
        label: 'TRIP.BATCH.TABLE.SAMPLING_WEIGHT',
        unitLabel: UnitLabel.KG,
        minValue: 0,
        maxValue: 1000,
        maximumNumberDecimals: 3,
        isWeight: true,
        isSampling: true,
        // eslint-disable-next-line no-bitwise
        flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_WEIGHT,
        computed: (batch) => { var _a, _b, _c; return ((_c = (_b = (_a = batch === null || batch === void 0 ? void 0 : batch.children) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.weight) === null || _c === void 0 ? void 0 : _c.computed) || false; },
    },
    {
        type: 'double',
        key: 'samplingIndividualCount',
        path: 'children.0.individualCount',
        label: 'TRIP.BATCH.TABLE.SAMPLING_INDIVIDUAL_COUNT',
        isIndividualCount: true,
        isSampling: true,
        // eslint-disable-next-line no-bitwise
        flags: BatchGroupColumnFlags.IS_SAMPLING | BatchGroupColumnFlags.IS_INDIVIDUAL_COUNT | BatchGroupColumnFlags.IS_ALWAYS_COMPUTED,
        computed: true,
    },
];
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "modalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "subBatchesModalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "availableSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupsTable.prototype, "enableWeightLengthConversion", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupsTable.prototype, "labelPrefix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], BatchGroupsTable.prototype, "showWeightColumns", null);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "allowSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "defaultHasSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupsTable.prototype, "taxonGroupsNoWeight", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupsTable.prototype, "taxonGroupsNoLanding", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BatchGroupsTable.prototype, "showAutoFillButton", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BatchGroupsTable.prototype, "showSamplingBatchColumns", void 0);
__decorate([
    Input(),
    RxStateProperty(),
    __metadata("design:type", Boolean)
], BatchGroupsTable.prototype, "showIndividualCountColumns", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], BatchGroupsTable.prototype, "onSubBatchesChanges", void 0);
BatchGroupsTable = BatchGroupsTable_1 = __decorate([
    Component({
        selector: 'app-batch-groups-table',
        templateUrl: 'batch-groups.table.html',
        styleUrls: ['batch-groups.table.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        BatchGroupValidatorService,
        TripContextService,
        PmfmNamePipe])
], BatchGroupsTable);
export { BatchGroupsTable };
//# sourceMappingURL=batch-groups.table.js.map