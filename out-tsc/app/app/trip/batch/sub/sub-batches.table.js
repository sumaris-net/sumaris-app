import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, InjectionToken, Injector, Input, ViewChild, } from '@angular/core';
import { isObservable } from 'rxjs';
import { Validators } from '@angular/forms';
import { AppFormUtils, EntityFilter, EntityUtils, InMemoryEntitiesService, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, ReferentialUtils, startsWithUpperCase, toBoolean, } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { Batch } from '../common/batch.model';
import { SubBatchValidatorService } from './sub-batch.validator';
import { SubBatchForm } from './sub-batch.form';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { SubBatchModal } from './sub-batch.modal';
import { AcquisitionLevelCodes, MethodIds, PmfmIds, QualitativeLabels } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { SubBatch } from './sub-batch.model';
import { PmfmValidators } from '@app/referential/services/validator/pmfm.validators';
import { environment } from '@environments/environment';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
export const SUB_BATCH_RESERVED_START_COLUMNS = ['parentGroup', 'taxonName'];
export const SUB_BATCH_RESERVED_END_COLUMNS = ['individualCount', 'comments'];
export const SUB_BATCHES_TABLE_OPTIONS = new InjectionToken('SubBatchesTableOptions');
export class SubBatchFilter extends EntityFilter {
    asFilterFn() {
        return (data) => (isNil(this.operationId) || data.operationId === this.operationId)
            && (isNil(this.parentId) || data.parentId === this.parentId);
    }
}
let SubBatchesTable = class SubBatchesTable extends BaseMeasurementsTable {
    constructor(injector, validatorService, options) {
        super(injector, SubBatch, SubBatchFilter, new InMemoryEntitiesService(SubBatch, SubBatchFilter, {
            onLoad: (data) => this.onLoadData(data),
            onSave: (data) => this.onSaveData(data),
            equals: Batch.equals,
            sortByReplacement: {
                id: 'rankOrder',
                parentGroup: 'parentGroup.rankOrder',
            },
        }), validatorService, Object.assign(Object.assign({}, options), { i18nColumnPrefix: 'TRIP.BATCH.TABLE.', i18nPmfmPrefix: 'TRIP.BATCH.PMFM.', mapPmfms: (pmfms) => this.mapPmfms(pmfms), onPrepareRowForm: (form) => this.onPrepareRowForm(form) }));
        this._availableParents = [];
        this._showTaxonNameInParentAutocomplete = true;
        this._availableSortedParents = [];
        this.enableWeightConversion = false;
        this.showForm = false;
        this.useSticky = false;
        this.weightDisplayDecimals = 2;
        this.compactFields = true;
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.referentialRefService = injector.get(ReferentialRefService);
        this.tabindex = 1;
        this.inlineEdition = !this.mobile;
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH_INDIVIDUAL;
        this.showCommentsColumn = !this.mobile;
        // DEBUG
        this.debug = !environment.production;
        this.logPrefix = '[sub-batches-table] ';
    }
    set qvPmfm(value) {
        if (this._qvPmfm !== value) {
            this._qvPmfm = value;
            // If already loaded, re apply pmfms, to be able to execute mapPmfms
            if (this.loaded)
                this.refreshPmfms();
        }
    }
    get qvPmfm() {
        return this._qvPmfm;
    }
    set availableParents(parents) {
        var _a;
        if (!parents)
            return; // Skip
        if (isObservable(parents)) {
            (_a = this._parentSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
            const subscription = parents.subscribe((values) => this.setAvailableParents(values));
            this._parentSubscription = subscription;
            this.registerSubscription(subscription);
            subscription.add(() => {
                this.unregisterSubscription(subscription);
                this._parentSubscription = null;
            });
        }
        else if (Array.isArray(parents) && parents !== this._availableParents) {
            this.setAvailableParents(parents);
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
    set showParentColumn(value) {
        this.setShowColumn('parent', value);
    }
    get showParentColumn() {
        return this.getShowColumn('parent');
    }
    set showTaxonNameColumn(value) {
        this.setShowColumn('taxonName', value);
        this.updateParentAutocomplete();
    }
    get showTaxonNameColumn() {
        return this.getShowColumn('taxonName');
    }
    set showTaxonNameInParentAutocomplete(value) {
        this._showTaxonNameInParentAutocomplete = value;
        this.updateParentAutocomplete();
    }
    set showIndividualCount(value) {
        this.setShowColumn('individualCount', value);
    }
    get showIndividualCount() {
        return this.getShowColumn('individualCount') && this.displayedColumns.findIndex((c) => c === 'individualCount') !== -1;
    }
    set showWeightColumn(value) {
        this.setShowColumn('weight', value);
    }
    get showWeightColumn() {
        return this.getShowColumn('weight');
    }
    set showCommentsColumn(value) {
        this.setShowColumn('comments', value);
    }
    get showCommentsColumn() {
        return this.getShowColumn('comments');
    }
    ngOnInit() {
        super.ngOnInit();
        // Parent combo
        this.registerAutocompleteField('parentGroup', {
            suggestFn: (value, options) => this.suggestParent(value, options),
            showAllOnFocus: true,
            mobile: this.mobile,
        });
        this.updateParentAutocomplete();
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, options) => this.suggestTaxonNames(value, options),
            showAllOnFocus: true,
            mobile: this.mobile,
        });
        if (this.inlineEdition) {
            // can be override by subclasses
            // Create listener on column 'DISCARD_OR_LANDING' value changes
            this.registerSubscription(this.registerCellValueChanges('discard', 'measurementValues.' + PmfmIds.DISCARD_OR_LANDING.toString(), true).subscribe((value) => {
                if (!this.editedRow)
                    return; // Should never occur
                const row = this.editedRow;
                const controls = row.validator.controls['measurementValues'].controls;
                if (ReferentialUtils.isNotEmpty(value) && value.label === QualitativeLabels.DISCARD_OR_LANDING.DISCARD) {
                    if (controls[PmfmIds.DISCARD_REASON]) {
                        if (row.validator.enabled) {
                            controls[PmfmIds.DISCARD_REASON].enable();
                        }
                        controls[PmfmIds.DISCARD_REASON].setValidators(Validators.required);
                        controls[PmfmIds.DISCARD_REASON].updateValueAndValidity();
                    }
                }
                else {
                    if (controls[PmfmIds.DISCARD_REASON]) {
                        controls[PmfmIds.DISCARD_REASON].disable();
                        controls[PmfmIds.DISCARD_REASON].setValue(null);
                        controls[PmfmIds.DISCARD_REASON].setValidators(null);
                    }
                }
            }));
            this.registerSubscription(this.registerCellValueChanges('parentGroup', 'parentGroup', true).subscribe((parentGroup) => {
                if (!this.editedRow)
                    return; // Skip
                const parenTaxonGroupId = parentGroup && parentGroup.taxonGroup && parentGroup.taxonGroup.id;
                if (isNil(parenTaxonGroupId))
                    return; // Skip
                const row = this.editedRow;
                const formEnabled = row.validator.enabled;
                const controls = row.validator.controls['measurementValues'].controls;
                (this.pmfms || []).forEach((pmfm) => {
                    const enable = !pmfm.isComputed &&
                        (!PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(parenTaxonGroupId));
                    const control = controls[pmfm.id];
                    // Update control state
                    if (control) {
                        if (enable) {
                            if (formEnabled) {
                                control.enable();
                            }
                            control.setValidators(PmfmValidators.create(pmfm));
                        }
                        else {
                            control.disable();
                            control.setValidators(null);
                            control.setValue(null);
                        }
                    }
                });
            }));
        }
    }
    markAsLoading(opts) {
        super.markAsLoading(opts);
        // WARN: use to avoid data reload, when pmfms changed
        if ((opts === null || opts === void 0 ? void 0 : opts.onlySelf) !== false) {
            this.dataSource.markAsLoading();
        }
    }
    doSubmitForm(event, row) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Skip if loading,
            // or if previous edited row not confirmed
            //await this.waitIdle();
            if (this.loading) {
                console.warn('Table is busy: cannot submit form');
                return false;
            }
            if (row !== this.editedRow && !this.confirmEditCreate())
                return false;
            yield AppFormUtils.waitWhilePending(this.form);
            if (this.form.invalid) {
                yield this.onInvalidForm();
                return false;
            }
            const subBatch = this.form.form.value;
            subBatch.individualCount = isNotNil(subBatch.individualCount) ? subBatch.individualCount : 1;
            // Store computed weight into measurement, if any
            if (this.weightPmfm && isNotNil((_a = subBatch.weight) === null || _a === void 0 ? void 0 : _a.value)) {
                // Convert
                subBatch.measurementValues[this.weightPmfm.id] = (_b = subBatch.weight) === null || _b === void 0 ? void 0 : _b.value;
                delete subBatch.weight;
            }
            yield this.resetForm(subBatch, { focusFirstEmpty: true });
            // Add batch to table
            if (!row) {
                yield this.addEntityToTable(subBatch);
            }
            // Update existing row
            else {
                yield this.updateEntityToTable(subBatch, row);
            }
            return true;
        });
    }
    add(batches, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (toBoolean(opts && opts.linkDataToParentGroup, true)) {
                this.linkDataToParentGroup(batches);
            }
            for (const b of batches) {
                yield this.addEntityToTable(b);
            }
        });
    }
    markAsPristine(opts) {
        super.markAsPristine();
        if (this.form)
            this.form.markAsPristine(opts);
    }
    markAsUntouched() {
        super.markAsUntouched();
        if (this.form)
            this.form.markAsUntouched();
    }
    enable(opts) {
        super.enable(opts);
        if (this.showForm && this.form && this.form.disabled) {
            this.form.enable(opts);
        }
    }
    disable(opts) {
        super.disable(opts);
        if (this.showForm && this.form && this.form.enabled) {
            this.form.disable(opts);
        }
    }
    /**
     * Allow to set value
     *
     * @param data
     * @param opts
     */
    setValue(data, opts) {
        this.memoryDataService.value = data;
        //this.markAsLoaded();
    }
    /* -- protected methods -- */
    getValue() {
        return this.memoryDataService.value;
    }
    prepareEntityToSave(data) {
        // Override by subclasses
    }
    updateParentAutocomplete() {
        if (!this.autocompleteFields.parentGroup)
            return; // skip
        const taxonGroupAttributes = this.settings.getFieldDisplayAttributes('taxonGroup');
        const taxonNameAttributes = this.settings.getFieldDisplayAttributes('taxonName');
        const parentToStringOptions = {
            pmfm: this.displayParentPmfm,
            taxonGroupAttributes,
            taxonNameAttributes,
        };
        if (this._showTaxonNameInParentAutocomplete) {
            if (this.showTaxonNameColumn) {
                this.autocompleteFields.parentGroup.attributes = ['rankOrder'].concat(taxonGroupAttributes.map((attr) => 'taxonGroup.' + attr));
            }
            else {
                this.autocompleteFields.parentGroup.attributes = ['taxonGroup.' + taxonGroupAttributes[0]].concat(taxonNameAttributes.map((attr) => 'taxonName.' + attr));
            }
        }
        else {
            // show only taxon group
            this.autocompleteFields.parentGroup.attributes = taxonGroupAttributes.map((attr) => 'taxonGroup.' + attr);
        }
        this.autocompleteFields.parentGroup.displayWith = (value) => BatchUtils.parentToString(value, parentToStringOptions);
    }
    resetForm(previousBatch, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.form)
                throw new Error('Form not exists');
            yield this.ready();
            // Finish form configuration
            this.form.availableParents = this._availableSortedParents;
            this.form.markAsReady();
            this.form.error = null;
            // Create a new batch
            const newBatch = new SubBatch();
            // Reset individual count, if manual mode
            if (this.form.enableIndividualCount) {
                newBatch.individualCount = null;
            }
            else if (isNil(newBatch.individualCount)) {
                newBatch.individualCount = 1;
            }
            // Copy QV value from previous
            if (previousBatch) {
                // Copy parent
                newBatch.parentGroup = previousBatch.parentGroup;
                // Copy QV PMFM value, if any
                if (this.qvPmfm && this.form.freezeQvPmfm) {
                    newBatch.measurementValues[this.qvPmfm.id] = previousBatch.measurementValues[this.qvPmfm.id];
                }
                // Copy taxon name (if freezed)
                if (previousBatch.taxonName && this.form.freezeTaxonName) {
                    newBatch.taxonName = previousBatch.taxonName;
                }
                else {
                    // Set taxonName, is only one in list
                    const taxonNames = this.form.taxonNames;
                    if (taxonNames && taxonNames.length === 1) {
                        newBatch.taxonName = taxonNames[0];
                    }
                }
            }
            // Reset the form with the new batch
            MeasurementValuesUtils.normalizeEntityToForm(newBatch, this.pmfms, this.form.form);
            this.form.setValue(newBatch, { emitEvent: true, normalizeEntityToForm: false /*already done*/ });
            // If need, enable the form
            if (this.form.disabled) {
                this.form.enable(opts);
            }
            if (opts && opts.focusFirstEmpty === true) {
                setTimeout(() => {
                    this.form.focusFirstEmptyInput();
                    this.form.markAsPristine({ onlySelf: true });
                    this.form.markAsUntouched({ onlySelf: true });
                });
            }
            else {
                this.form.markAsPristine({ onlySelf: true });
                this.form.markAsUntouched({ onlySelf: true });
            }
            if (!opts || opts.emitEvent !== false) {
                this.markForCheck();
            }
        });
    }
    suggestParent(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (EntityUtils.isNotEmpty(value, 'label')) {
                return [value];
            }
            value = (typeof value === 'string' && value !== '*' && value) || undefined;
            if (isNil(value))
                return this._availableSortedParents; // All
            if (this.debug)
                console.debug(`[sub-batch-table] Searching parent {${value || '*'}}...`);
            const ucValueParts = value.trim().toUpperCase().split(' ', 1);
            // Search on labels (taxonGroup or taxonName)
            return this._availableSortedParents.filter((p) => (p.taxonGroup && startsWithUpperCase(p.taxonGroup.label, ucValueParts[0])) ||
                (p.taxonName && startsWithUpperCase(p.taxonName.label, ucValueParts.length === 2 ? ucValueParts[1] : ucValueParts[0])));
        });
    }
    suggestTaxonNames(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const parent = this.editedRow && this.editedRow.validator.get('parentGroup').value;
            if (isNilOrBlank(value) && isNil(parent))
                return { data: [] };
            return this.programRefService.suggestTaxonNames(value, {
                programLabel: this.programLabel,
                searchAttribute: options && options.searchAttribute,
                taxonGroupId: (parent && parent.taxonGroup && parent.taxonGroup.id) || undefined,
            });
        });
    }
    mapPmfms(pmfms) {
        var _a;
        if (!pmfms || !pmfms.length)
            return pmfms; // Skip (no pmfms)
        this._initialPmfms = pmfms; // Copy original pmfms list
        if (this._qvPmfm) {
            // Make sure QV Pmfm is required (need to link with parent batch)
            const index = pmfms.findIndex((pmfm) => pmfm.id === this._qvPmfm.id);
            if (index !== -1) {
                // Replace original pmfm by a clone, with hidden=true
                const qvPmfm = this._qvPmfm.clone();
                qvPmfm.hidden = false;
                qvPmfm.required = true;
                pmfms[index] = qvPmfm;
            }
        }
        // Filter on parent taxon groups
        const taxonGroupIds = (this._availableParents || []).map((parent) => { var _a; return (_a = parent.taxonGroup) === null || _a === void 0 ? void 0 : _a.id; }).filter(isNotNil);
        if (isNotEmptyArray(taxonGroupIds)) {
            pmfms = pmfms.map((pmfm) => {
                if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
                    // Hidden PMFM that are not for existing taxon groups
                    if (isNotEmptyArray(pmfm.taxonGroupIds) && !pmfm.taxonGroupIds.some((id) => taxonGroupIds.includes(id))) {
                        pmfm = pmfm.clone(); // Keep original
                        pmfm.hidden = true;
                        pmfm.required = false;
                    }
                }
                return pmfm;
            });
        }
        // Check weight-length conversion is enabled
        {
            const index = pmfms.findIndex((p) => p.id === PmfmIds.BATCH_CALCULATED_WEIGHT_LENGTH || p.methodId === MethodIds.CALCULATED_WEIGHT_LENGTH);
            if (index !== -1) {
                this.weightPmfm = (_a = pmfms[index]) === null || _a === void 0 ? void 0 : _a.clone();
                //this.weightPmfm.hidden = !this.mobile;
                this.weightPmfm.maximumNumberDecimals = this.weightPmfm.maximumNumberDecimals || 6;
                this.weightPmfm.required = false;
                this.enableWeightConversion = true;
                // FIXME
                /*if (this.weightDisplayedUnit) {
                  this.weightPmfm = PmfmUtils.setWeightUnitConversion(this.weightPmfm, this.weightDisplayedUnit);
                }*/
                pmfms[index] = this.weightPmfm;
            }
            else {
                this.enableWeightConversion = false;
            }
        }
        return pmfms;
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
            const updatedData = yield this.openDetailModal(data);
            if (updatedData) {
                yield this.updateEntityToTable(updatedData, row);
            }
            else {
                this.editedRow = null;
            }
            return true;
        });
    }
    openDetailModal(batch) {
        return __awaiter(this, void 0, void 0, function* () {
            const isNew = !batch && true;
            if (isNew) {
                batch = new SubBatch();
                yield this.onNewEntity(batch);
            }
            const modal = yield this.modalCtrl.create({
                component: SubBatchModal,
                componentProps: {
                    programLabel: this.programLabel,
                    acquisitionLevel: this.acquisitionLevel,
                    availableParents: this.availableParents,
                    data: batch,
                    isNew,
                    disabled: this.disabled,
                    qvPmfm: this.qvPmfm,
                    showParent: this.showParentColumn,
                    showTaxonGroup: false,
                    showTaxonName: this.showTaxonNameColumn,
                    showIndividualCount: this.showIndividualCount,
                },
                keyboardClose: true,
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[batches-table] Batch modal result: ', data);
            return data instanceof SubBatch ? data : undefined;
        });
    }
    addEntityToTable(newBatch) {
        const _super = Object.create(null, {
            addEntityToTable: { get: () => super.addEntityToTable }
        });
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[batches-table] Adding batch to table:', newBatch);
            // Make sure individual count if init
            newBatch.individualCount = isNotNil(newBatch.individualCount) ? newBatch.individualCount : 1;
            const pmfms = this.pmfms || [];
            MeasurementValuesUtils.normalizeEntityToForm(newBatch, pmfms);
            // If individual count column is shown (can be greater than 1)
            if (this.showIndividualCount) {
                // Try to find an identical sub-batch
                const row = this.dataSource.getRows().find((r) => BatchUtils.canMergeSubBatch(newBatch, r.currentData, pmfms));
                // Already exists: increment individual count
                if (row) {
                    if (row.validator) {
                        const control = row.validator.get('individualCount');
                        control.setValue((control.value || 0) + newBatch.individualCount);
                    }
                    else {
                        row.currentData.individualCount = (row.currentData.individualCount || 0) + newBatch.individualCount;
                        this.markForCheck();
                    }
                    this.markAsDirty();
                    // restore as edited row
                    this.editedRow = row;
                    return row;
                }
            }
            // The batch does not exists: add it tp the table
            return yield _super.addEntityToTable.call(this, newBatch);
        });
    }
    setAvailableParents(parents, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this._availableParents = parents;
            // Sort parents by Tag-ID, or rankOrder
            if (this.displayParentPmfm) {
                this._availableSortedParents = EntityUtils.sort(parents.slice(), 'measurementValues.' + this.displayParentPmfm.id.toString());
            }
            else {
                this._availableSortedParents = EntityUtils.sort(parents.slice(), 'rankOrder');
            }
            yield this.ready();
            if (this.form)
                this.form.availableParents = this._availableSortedParents;
            // Link batches to parent, and delete orphan
            if (!opts || opts.linkDataToParent !== false) {
                yield this.linkDataToParentAndDeleteOrphan();
            }
            if (!opts || opts.emitEvent !== false) {
                yield this.refreshPmfms();
                this.markForCheck();
            }
        });
    }
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sub-batch-table] Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // Generate label
            data.label = this.acquisitionLevel + '#' + data.rankOrder;
            if (isNil(data.id)) {
                // TODO : add sequence
            }
            // Set individual count to 1, if column not shown
            if (!this.showIndividualCount) {
                data.individualCount = isNotNil(data.individualCount) ? data.individualCount : 1;
            }
        });
    }
    onInvalidForm() {
        return __awaiter(this, void 0, void 0, function* () {
            this.form.markAllAsTouched({ emitEvent: true });
            if (this.debug)
                AppFormUtils.logFormErrors(this.form.form, '[sub-batch-table] ');
        });
    }
    getI18nColumnName(columnName) {
        // Replace parent by TAG_ID pmfms
        columnName = columnName && columnName === 'parent' && this.displayParentPmfm ? this.displayParentPmfm.id.toString() : columnName;
        return super.getI18nColumnName(columnName);
    }
    linkDataToParentGroup(data) {
        if (!this._availableParents || !data)
            return;
        data.forEach((s) => {
            s.parentGroup = (s.parentGroup && this._availableParents.find((p) => Batch.equals(p, s.parentGroup))) || null;
            if (!s.parentGroup)
                console.warn('[sub-batches-table] linkDataToParent() - Could not found parent group, for sub-batch:', s);
        });
    }
    /**
     * Remove batches in table, if there have no more parent
     */
    linkDataToParentAndDeleteOrphan() {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = this.dataSource.getRows();
            // Check if need to delete some rows
            let hasRemovedItem = false;
            const data = rows
                .map((row) => {
                const item = row.currentData;
                let parentGroup;
                if (item.parentGroup) {
                    // Update the parent, by id
                    parentGroup = this._availableParents.find((p) => Batch.equals(p, item.parentGroup));
                    // Not found, so try to get it by species
                    if (!parentGroup) {
                        const parentTaxonGroupId = item.parentGroup.taxonGroup && item.parentGroup.taxonGroup.id;
                        const parentTaxonNameId = item.parentGroup.taxonName && item.parentGroup.taxonName.id;
                        if (isNil(parentTaxonGroupId) && isNil(parentTaxonNameId)) {
                            parentGroup = undefined; // remove link to parent
                        }
                        else {
                            parentGroup = this._availableParents.find((p) => p &&
                                ((!p.taxonGroup && !parentTaxonGroupId) || (p.taxonGroup && p.taxonGroup.id === parentTaxonGroupId)) &&
                                ((!p.taxonName && !parentTaxonNameId) || (p.taxonName && p.taxonName.id === parentTaxonNameId)));
                        }
                    }
                }
                if (parentGroup || row.editing) {
                    if (item.parentGroup !== parentGroup) {
                        item.parentGroup = parentGroup;
                        // If row use a validator, force update
                        if (!row.editing && row.validator)
                            row.validator.patchValue(item, { emitEvent: false });
                    }
                    return item; // Keep only rows with a parent (or in editing mode)
                }
                // Could not find the parent anymore (parent has been deleted)
                hasRemovedItem = true;
                return undefined;
            })
                .filter(isNotNil);
            if (hasRemovedItem) {
                // Make sure to convert into a Sample - fix issue #371
                this.value = data.map((c) => SubBatch.fromObject(c));
            }
        });
    }
    onLoadData(data) {
        this.linkDataToParentGroup(data);
        return data;
    }
    onSaveData(data) {
        // Can be override by subclasses
        return data;
    }
    refreshPmfms() {
        return __awaiter(this, void 0, void 0, function* () {
            const pmfms = this._initialPmfms;
            if (!pmfms)
                return; // Not loaded
            this._dataService.pmfms = this._initialPmfms;
            yield this._dataService.waitIdle({ stop: this.destroySubject });
            this.updateColumns();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    onPrepareRowForm(form) {
        var _a;
        if (!form)
            return; // Skip
        console.debug('[sub-batches-table] Initializing row validator');
        this.validatorService.updateFormGroup(form, {
            withWeight: this.enableWeightConversion,
            pmfms: this.pmfms,
        });
        // Add length -> weight conversion
        (_a = this._rowValidatorSubscription) === null || _a === void 0 ? void 0 : _a.unsubscribe();
        if (this.enableWeightConversion) {
            const subscription = this.validatorService.delegate.enableWeightLengthConversion(form, {
                pmfms: this.pmfms,
                qvPmfm: this._qvPmfm,
                onError: (err) => this.setError((err && err.message) || 'TRIP.SUB_BATCH.ERROR.WEIGHT_LENGTH_CONVERSION_FAILED'),
                markForCheck: () => this.markForCheck(),
            });
            if (subscription) {
                this._rowValidatorSubscription = subscription;
                this.registerSubscription(this._rowValidatorSubscription);
                this._rowValidatorSubscription.add(() => {
                    this.unregisterSubscription(subscription);
                    this._rowValidatorSubscription = null;
                });
            }
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesTable.prototype, "displayParentPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesTable.prototype, "showForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchesTable.prototype, "tabindex", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchesTable.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchesTable.prototype, "weightDisplayedUnit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesTable.prototype, "weightDisplayDecimals", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesTable.prototype, "compactFields", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SubBatchesTable.prototype, "qvPmfm", null);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SubBatchesTable.prototype, "availableParents", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showParentColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showTaxonNameColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showTaxonNameInParentAutocomplete", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showIndividualCount", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showWeightColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SubBatchesTable.prototype, "showCommentsColumn", null);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SubBatchForm)
], SubBatchesTable.prototype, "form", void 0);
SubBatchesTable = __decorate([
    Component({
        selector: 'app-sub-batches-table',
        templateUrl: 'sub-batches.table.html',
        styleUrls: ['sub-batches.table.scss'],
        providers: [
            { provide: ContextService, useExisting: TripContextService },
            SubBatchValidatorService,
            {
                provide: SUB_BATCHES_TABLE_OPTIONS,
                useFactory: () => ({
                    prependNewElements: false,
                    suppressErrors: environment.production,
                    reservedStartColumns: SUB_BATCH_RESERVED_START_COLUMNS,
                    reservedEndColumns: SUB_BATCH_RESERVED_END_COLUMNS,
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __param(2, Inject(SUB_BATCHES_TABLE_OPTIONS)),
    __metadata("design:paramtypes", [Injector,
        SubBatchValidatorService, Object])
], SubBatchesTable);
export { SubBatchesTable };
//# sourceMappingURL=sub-batches.table.js.map