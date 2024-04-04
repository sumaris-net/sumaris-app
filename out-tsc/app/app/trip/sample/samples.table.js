import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, Output } from '@angular/core';
import { SampleValidatorService } from './sample.validator';
import { SamplingStrategyService } from '@app/referential/services/sampling-strategy.service';
import { AppFormUtils, AppValidatorService, DateUtils, firstNotNilPromise, getPropertyByPath, InMemoryEntitiesService, isEmptyArray, isNil, isNilOrBlank, isNotEmptyArray, isNotNil, isNotNilOrBlank, isNotNilOrNaN, LocalSettingsService, NetworkService, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, suggestFromArray, toBoolean, toNumber, } from '@sumaris-net/ngx-components';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { SampleModal } from './sample.modal';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
import { Sample, SampleUtils } from './sample.model';
import { AcquisitionLevelCodes, ParameterGroups, PmfmIds } from '@app/referential/services/model/model.enum';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { environment } from '@environments/environment';
import { debounceTime } from 'rxjs/operators';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { SampleFilter } from './sample.filter';
import { PmfmService } from '@app/referential/services/pmfm.service';
import { SelectPmfmModal } from '@app/referential/pmfm/table/select-pmfm.modal';
import { BehaviorSubject } from 'rxjs';
import { TaxonNameRef } from '@app/referential/services/model/taxon-name.model';
import { arrayPluck } from '@app/shared/functions';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { BatchGroup } from '@app/trip/batch/group/batch-group.model';
import { SubSampleModal } from '@app/trip/sample/sub-sample.modal';
import { PmfmFilter } from '@app/referential/services/filter/pmfm.filter';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { AppImageAttachmentsModal } from '@app/data/image/image-attachment.modal';
import { DataEntityUtils } from '@app/data/services/model/data-entity.model';
export const SAMPLE_RESERVED_START_COLUMNS = ['label', 'taxonGroup', 'taxonName', 'sampleDate'];
export const SAMPLE_RESERVED_END_COLUMNS = ['comments', 'images'];
export const SAMPLE_TABLE_DEFAULT_I18N_PREFIX = 'TRIP.SAMPLE.TABLE.';
let SamplesTable = class SamplesTable extends BaseMeasurementsTable {
    constructor(injector, samplingStrategyService) {
        super(injector, Sample, SampleFilter, new InMemoryEntitiesService(Sample, SampleFilter, {
            onSave: (data) => this.onSave(data),
            equals: Sample.equals,
            sortByReplacement: { id: 'rankOrder' }
        }), injector.get(LocalSettingsService).mobile ? null : injector.get(SampleValidatorService), {
            reservedStartColumns: SAMPLE_RESERVED_START_COLUMNS,
            reservedEndColumns: SAMPLE_RESERVED_END_COLUMNS,
            requiredStrategy: false,
            i18nColumnPrefix: 'TRIP.SAMPLE.TABLE.',
            i18nPmfmPrefix: 'TRIP.SAMPLE.PMFM.',
            // Cannot override mapPmfms (by options)
            mapPmfms: (pmfms) => this.mapPmfms(pmfms),
            onPrepareRowForm: (form) => this.onPrepareRowForm(form)
        });
        this.samplingStrategyService = samplingStrategyService;
        this.$pmfmGroups = new BehaviorSubject(null);
        this.pmfmGroupColumns$ = new BehaviorSubject([]);
        this.groupHeaderColumnNames = [];
        this.footerColumns = ['footer-start'];
        this.tagCount$ = new BehaviorSubject(0);
        this.showGroupHeader = false;
        this.useSticky = false;
        this.useFooterSticky = false;
        this.canAddPmfm = false;
        this.showError = true;
        this.showIdColumn = true;
        this.showLabelColumn = false;
        this.requiredLabel = true;
        this.showPmfmDetails = false;
        this.showFabButton = false;
        this.showIndividualMonitoringButton = false;
        this.showIndividualReleaseButton = false;
        this.defaultSampleDate = null;
        this.defaultTaxonGroup = null;
        this.defaultTaxonName = null;
        this.compactFields = true;
        this.showDisplayColumnModal = true;
        this.enableTagIdGeneration = false;
        this.tagIdMinLength = 4;
        this.tagIdPadString = '0';
        this.allowSubSamples = false;
        this.showReadonlyPmfms = true;
        this.pmfmValueColor = null;
        this.availableTaxonGroups = null;
        this.prepareRowForm = new EventEmitter();
        this.weightUnitChanges = new EventEmitter();
        this.selectInputContent = AppFormUtils.selectInputContent;
        this.isIndividualMonitoring = SampleUtils.isIndividualMonitoring;
        this.isIndividualRelease = SampleUtils.isIndividualRelease;
        this.referentialRefService = injector.get(ReferentialRefService);
        this.pmfmService = injector.get(PmfmService);
        this.networkService = injector.get(NetworkService);
        this.confirmBeforeDelete = false;
        this.confirmBeforeCancel = false;
        this.undoableDeletion = false;
        this.saveBeforeSort = true;
        this.saveBeforeFilter = true;
        this.propagateRowError = true;
        this.errorTranslatorOptions = { separator: '\n', controlPathTranslator: this };
        // Set default value
        this.acquisitionLevel = null; // Avoid load to early. Need sub classes to set it
        this.excludesColumns = ['images']; // Hide images by default
        //this.debug = false;
        this.debug = !environment.production;
        this.logPrefix = '[samples-table] ';
    }
    set pmfmGroups(value) {
        if (this.$pmfmGroups.value !== value) {
            if (value && Object.keys(value).length) {
                this.showGroupHeader = true;
            }
            else {
                this.showGroupHeader = false;
            }
            this.$pmfmGroups.next(value);
        }
    }
    get pmfmGroups() {
        return this.$pmfmGroups.getValue();
    }
    set value(data) {
        this.memoryDataService.value = data;
    }
    get value() {
        return this.memoryDataService.value;
    }
    set showSampleDateColumn(value) {
        this.setShowColumn('sampleDate', value);
    }
    get showSampleDateColumn() {
        return this.getShowColumn('sampleDate');
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
    set showImagesColumn(value) {
        this.setShowColumn('images', value);
    }
    get showImagesColumn() {
        return this.getShowColumn('images');
    }
    getRowError(row, opts) {
        return super.getRowError(row, opts);
    }
    setModalOption(key, value) {
        this.modalOptions = this.modalOptions || {};
        this.modalOptions[key] = value;
    }
    getModalOption(key) {
        return this.modalOptions[key];
    }
    get tagIdGenerationMode() {
        return this.enableTagIdGeneration ? (this.forcedTagIdGenerationMode || this.defaultTagIdGenerationMode) : 'none';
    }
    ngOnInit() {
        this.inlineEdition = !this.readOnly && this.validatorService && !this.mobile;
        this.allowRowDetail = !this.inlineEdition;
        this.usageMode = this.usageMode || this.settings.usageMode;
        this.showToolbar = toBoolean(this.showToolbar, !this.showGroupHeader);
        this.defaultTagIdGenerationMode = this.defaultTagIdGenerationMode || 'none';
        // Always add a confirmation before deletion, if mobile
        if (this.mobile)
            this.confirmBeforeDelete = true;
        super.ngOnInit();
        // Add footer listener
        this.registerSubscription(this.pmfms$.subscribe(pmfms => this.addFooterListener(pmfms)));
    }
    ngAfterViewInit() {
        super.ngAfterViewInit();
        this.setShowColumn('label', this.showLabelColumn);
        this.setShowColumn('comments', this.showCommentsColumn);
        // Taxon group combo
        this.registerAutocompleteField('taxonGroup', {
            suggestFn: (value, options) => this.suggestTaxonGroups(value, options),
            mobile: this.mobile
        });
        // Taxon name combo
        this.registerAutocompleteField('taxonName', {
            suggestFn: (value, options) => this.suggestTaxonNames(value, options),
            showAllOnFocus: this.showTaxonGroupColumn /*show all, because limited to taxon group*/,
            mobile: this.mobile
        });
    }
    ngOnDestroy() {
        var _a;
        super.ngOnDestroy();
        (_a = this.memoryDataService) === null || _a === void 0 ? void 0 : _a.stop();
        this.prepareRowForm.complete();
        this.prepareRowForm.unsubscribe();
        this.$pmfmGroups.complete();
        this.$pmfmGroups.unsubscribe();
        this.pmfmGroupColumns$.complete();
        this.pmfmGroupColumns$.unsubscribe();
        this.memoryDataService.stop();
    }
    configureValidator(opts) {
        super.configureValidator(opts);
        this.validatorService.delegateOptions = { withImages: this.showImagesColumn, requiredLabel: this.requiredLabel };
    }
    onPrepareRowForm(form, opts) {
        if (this.validatorService) {
            this.validatorService.updateFormGroup(form);
        }
        this.prepareRowForm.emit(Object.assign({ form, pmfms: this.pmfms, markForCheck: () => this.markForCheck() }, opts));
    }
    deleteSelection(event, opts) {
        // FIXME -cf issue #454
        //console.debug('FIXME check deleteSelection')
        return super.deleteSelection(event, opts);
    }
    /**
     * Use in ngFor, for trackBy
     *
     * @param index
     * @param column
     */
    trackColumnDef(index, column) {
        return column.key;
    }
    setSubSampleModalOption(key, value) {
        this.subSampleModalOptions = this.subSampleModalOptions || {};
        this.subSampleModalOptions[key] = value;
    }
    onSave(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.debug)
                console.debug('[samples-table] Preparing data to be saved...');
            data = data.map(entity => {
                this.prepareEntityToSave(entity);
                return entity;
            });
            return data;
        });
    }
    // Change visibility to public
    setError(error, opts) {
        // if duplicated error
        if (error && isNotEmptyArray(opts === null || opts === void 0 ? void 0 : opts.duplicatedValues)) {
            const duplicatedValuePath = opts.duplicatedValuePath || this.tagIdPmfm && `measurementValues.${this.tagIdPmfm.id}`;
            const rowsWithDuplicatedValue = this.dataSource.getRows()
                .filter(row => {
                const value = getPropertyByPath(row.currentData, duplicatedValuePath);
                return opts.duplicatedValues.includes(value);
            });
            if (isNotEmptyArray(rowsWithDuplicatedValue)) {
                const tagIdPmfmName = this.getI18nPmfmName(this.tagIdPmfm);
                const errorMessage = this.translate.instant('TRIP.SAMPLE.ERROR.DUPLICATED_TAG_ID', { name: tagIdPmfmName === null || tagIdPmfmName === void 0 ? void 0 : tagIdPmfmName.toLowerCase() });
                // For each rows, test if has duplicated tag id and mark it if so
                Promise.all(rowsWithDuplicatedValue.map(row => {
                    const entity = row.currentData;
                    DataEntityUtils.markAsInvalid(entity, errorMessage);
                    return this.updateEntityToTable(entity, row, { confirmEdit: !row.editing });
                }))
                    .then(() => {
                    this.showError = true;
                });
                super.setError(error, opts);
                return;
            }
        }
        else {
            this.showError = false;
            super.setError(error, opts);
        }
    }
    openDetailModal(dataToOpen, row) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[samples-table] Opening detail modal...');
            const pmfms = yield firstNotNilPromise(this.pmfms$, { stop: this.destroySubject });
            let isNew = !dataToOpen && true;
            if (isNew) {
                dataToOpen = new Sample();
                yield this.onNewEntity(dataToOpen);
            }
            this.markAsLoading();
            const options = Object.assign(Object.assign({ 
                // Default options:
                programLabel: undefined, // Prefer to pass PMFMs directly, to avoid a reloading
                pmfms, acquisitionLevel: this.acquisitionLevel, disabled: this.disabled, i18nSuffix: this.i18nColumnSuffix, usageMode: this.usageMode, mobile: this.mobile, availableTaxonGroups: this.availableTaxonGroups, defaultSampleDate: this.defaultSampleDate, requiredLabel: this.requiredLabel, showLabel: this.showLabelColumn, showSampleDate: !this.defaultSampleDate ? true : this.showSampleDateColumn, showTaxonGroup: this.showTaxonGroupColumn, showTaxonName: this.showTaxonNameColumn, showIndividualMonitoringButton: this.allowSubSamples && this.showIndividualMonitoringButton || false, showIndividualReleaseButton: this.allowSubSamples && this.showIndividualReleaseButton || false, showPictures: this.showImagesColumn, pmfmValueColor: this.pmfmValueColor, onReady: (modal) => {
                    this.onPrepareRowForm(modal.form.form, {
                        pmfms,
                        markForCheck: () => modal.markForCheck()
                    });
                }, onDelete: (event, data) => this.deleteEntity(event, data), onSaveAndNew: (dataToSave) => __awaiter(this, void 0, void 0, function* () {
                    if (isNew) {
                        yield this.addEntityToTable(dataToSave, { editing: false });
                    }
                    else {
                        yield this.updateEntityToTable(dataToSave, row, { confirmEdit: true });
                        row = null; // Forget the row to update, for the next iteration (should never occur, because onSubmitAndNext always create a new entity)
                    }
                    // Prepare new sample
                    const newData = new Sample();
                    yield this.onNewEntity(newData);
                    isNew = true; // Next row should be new
                    return newData;
                }), openSubSampleModal: (parent, acquisitionLevel) => this.openSubSampleModalFromRootModal(parent, acquisitionLevel) }, this.modalOptions), { 
                // Data to open
                isNew, data: dataToOpen });
            const modal = yield this.modalCtrl.create({
                component: SampleModal,
                componentProps: options,
                keyboardClose: true,
                backdropDismiss: false,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            if (data && this.debug)
                console.debug('[samples-table] Sample modal result: ', data, role);
            this.markAsLoaded();
            return { data: (data instanceof Sample ? data : undefined), role };
        });
    }
    onIndividualMonitoringClick(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.onSubSampleButtonClick(event, row, AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
        });
    }
    onIndividualReleaseClick(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.onSubSampleButtonClick(event, row, AcquisitionLevelCodes.INDIVIDUAL_RELEASE);
        });
    }
    onSubSampleButtonClick(event, row, acquisitionLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event)
                event.preventDefault();
            console.debug(`[samples-table] onSubSampleButtonClick() on ${acquisitionLevel}`);
            // Loading spinner
            this.markAsLoading();
            try {
                const parent = this.toEntity(row);
                const { data, role } = yield this.openSubSampleModal(parent, { acquisitionLevel });
                if (isNil(data))
                    return; // User cancelled
                if (role === 'DELETE') {
                    parent.children = SampleUtils.removeChild(parent, data);
                }
                else {
                    parent.children = SampleUtils.insertOrUpdateChild(parent, data, acquisitionLevel);
                }
                if (row.validator) {
                    row.validator.patchValue({ children: parent.children });
                }
                else {
                    row.currentData.children = parent.children.slice(); // Force pipes update
                    this.markAsDirty();
                }
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    openSubSampleModalFromRootModal(parent, acquisitionLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!parent || !acquisitionLevel)
                throw Error('Missing \'parent\' or \'acquisitionLevel\' arguments');
            // Make sure the row exists
            this.editedRow = (this.editedRow && BatchGroup.equals(this.editedRow.currentData, parent) && this.editedRow)
                || (yield this.findRowByEntity(parent))
                // Or add it to table, if new
                || (yield this.addEntityToTable(parent, { confirmCreate: false /*keep row editing*/ }));
            const { data, role } = yield this.openSubSampleModal(parent, { acquisitionLevel });
            if (isNil(data))
                return; // User cancelled
            if (role === 'DELETE') {
                parent.children = SampleUtils.removeChild(parent, data);
            }
            else {
                parent.children = SampleUtils.insertOrUpdateChild(parent, data, acquisitionLevel);
            }
            // Return the updated parent
            return parent;
        });
    }
    openSubSampleModal(parentSample, opts) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const showParent = opts && opts.showParent === true; // False by default
            const acquisitionLevel = (opts === null || opts === void 0 ? void 0 : opts.acquisitionLevel) || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
            console.debug(`[samples-table] Opening sub-sample modal for {acquisitionLevel: ${acquisitionLevel}}`);
            const children = SampleUtils.filterByAcquisitionLevel(parentSample.children || [], acquisitionLevel);
            const isNew = !children || children.length === 0;
            let subSample;
            if (isNew) {
                subSample = new Sample();
            }
            else {
                subSample = children[0];
            }
            // Make sure to set the parent
            subSample.parent = parentSample.asObject({ withChildren: false });
            const hasTopModal = !!(yield this.modalCtrl.getTop());
            const modal = yield this.modalCtrl.create({
                component: SubSampleModal,
                componentProps: Object.assign({ programLabel: this.programLabel, usageMode: this.usageMode, acquisitionLevel,
                    isNew, data: subSample, showParent, i18nSuffix: this.i18nColumnSuffix, defaultLatitudeSign: this.defaultLatitudeSign, defaultLongitudeSign: this.defaultLongitudeSign, showLabel: false, disabled: this.disabled, maxVisibleButtons: (_a = this.modalOptions) === null || _a === void 0 ? void 0 : _a.maxVisibleButtons, mobile: this.mobile, onDelete: (_, __) => Promise.resolve(true) }, this.subSampleModalOptions),
                backdropDismiss: false,
                keyboardClose: true,
                cssClass: hasTopModal ? 'modal-large stack-modal' : 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // Wait until closed
            const { data, role } = yield modal.onDidDismiss();
            // User cancelled
            if (isNil(data)) {
                if (this.debug)
                    console.debug('[sample-table] Sub-sample modal: user cancelled');
            }
            else {
                // DEBUG
                if (this.debug)
                    console.debug('[sample-table] Sub-sample modal result: ', data, role);
            }
            return { data, role };
        });
    }
    filterColumnsByTaxonGroup(taxonGroup) {
        const toggleLoading = !this.loading;
        if (toggleLoading)
            this.markAsLoading();
        try {
            const taxonGroupId = toNumber(taxonGroup && taxonGroup.id, null);
            (this.pmfms || []).forEach(pmfm => {
                const show = isNil(taxonGroupId)
                    || !PmfmUtils.isDenormalizedPmfm(pmfm)
                    || (isEmptyArray(pmfm.taxonGroupIds) || pmfm.taxonGroupIds.includes(taxonGroupId));
                this.setShowColumn(pmfm.id.toString(), show);
            });
            this.updateColumns();
        }
        finally {
            if (toggleLoading)
                this.markAsLoaded();
        }
    }
    openAddPmfmsModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // If pending rows, save first
            if (this.dirty) {
                const saved = yield this.save();
                if (!saved)
                    return;
            }
            const existingPmfmIds = (this.pmfms || []).map(p => p.id).filter(isNotNil);
            const pmfmIds = yield this.openSelectPmfmsModal(event, {
                excludedIds: existingPmfmIds
            }, {
                allowMultiple: false
            });
            if (isEmptyArray(pmfmIds))
                return; // User cancelled
            console.debug('[samples-table] Adding pmfm ids:', pmfmIds);
            yield this.addPmfmColumns(pmfmIds);
        });
    }
    /**
     * Not used yet. Implementation must manage stored samples values and different pmfms types (number, string, qualitative values...)
     *
     * @param event
     */
    openChangePmfmsModal(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingPmfmIds = (this.pmfms || []).map(p => p.id).filter(isNotNil);
            const pmfmIds = yield this.openSelectPmfmsModal(event, {
                excludedIds: existingPmfmIds
            }, {
                allowMultiple: false
            });
            if (!pmfmIds)
                return; // USer cancelled
        });
    }
    openImagesModal(event, row) {
        return __awaiter(this, void 0, void 0, function* () {
            const images = row.currentData.images;
            // Skip if no images to display
            if (this.disabled && isEmptyArray(images))
                return;
            event.stopPropagation();
            const modal = yield this.modalCtrl.create({
                component: AppImageAttachmentsModal,
                componentProps: {
                    data: images,
                    disabled: this.disabled
                },
                keyboardClose: true,
                cssClass: 'modal-large'
            });
            yield modal.present();
            const { data, role } = yield modal.onDidDismiss();
            // User cancel
            if (isNil(data) || this.disabled)
                return;
            if (this.inlineEdition && row.validator) {
                const formArray = row.validator.get('images');
                formArray.patchValue(data);
                row.validator.markAsDirty();
                this.confirmEditCreate();
                this.markAsDirty();
            }
            else {
                row.currentData.images = data;
                this.markAsDirty();
            }
        });
    }
    /* -- protected methods -- */
    suggestTaxonGroups(value, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNotEmptyArray(this.availableTaxonGroups)) {
                return suggestFromArray(this.availableTaxonGroups, value, options);
            }
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
    onNewEntity(data) {
        const _super = Object.create(null, {
            onNewEntity: { get: () => super.onNewEntity }
        });
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-table] Initializing new row data...');
            yield _super.onNewEntity.call(this, data);
            // Init measurement values
            data.measurementValues = data.measurementValues || {};
            // generate label
            if (!this.showLabelColumn && this.requiredLabel) {
                data.label = `${this.acquisitionLevel || ''}#${data.rankOrder}`;
            }
            // Default date
            if (isNotNil(this.defaultSampleDate)) {
                data.sampleDate = this.defaultSampleDate;
            }
            else {
                if (this.settings.isOnFieldMode(this.usageMode)) {
                    data.sampleDate = DateUtils.moment();
                }
            }
            // Default taxon name
            if (isNotNil(this.defaultTaxonName)) {
                data.taxonName = TaxonNameRef.fromObject(this.defaultTaxonName);
            }
            // Default taxon group
            if (isNotNil(this.defaultTaxonGroup)) {
                data.taxonGroup = TaxonGroupRef.fromObject(this.defaultTaxonGroup);
            }
            // Get the previous sample
            const previousSample = this.getPreviousSample();
            // server call for first sample and increment from server call value
            let tagIdGenerationMode = this.tagIdGenerationMode;
            if (this.tagIdPmfm && tagIdGenerationMode !== 'none') {
                // Force previous row, if offline
                if (this.networkService.offline || !this.strategyLabel || this.tagIdMinLength <= 0) {
                    tagIdGenerationMode = 'previousRow';
                }
                let newTagId = null;
                const previousTagId = this.getPreviousTagId();
                console.debug(`[samples-table] Generating new TAG_ID (mode: ${tagIdGenerationMode}, previous: ${previousTagId})`);
                switch (tagIdGenerationMode) {
                    // Previous row + 1
                    case 'previousRow':
                        if (isNotNilOrNaN(previousTagId)) {
                            newTagId = (previousTagId + 1).toString().padStart(this.tagIdMinLength, '0');
                        }
                        break;
                    // Remote generation
                    case 'remote':
                        const nextTagIdComplete = yield this.samplingStrategyService.computeNextSampleTagId(this.strategyLabel, '-', this.tagIdMinLength);
                        const nextTagIdSuffix = parseInt(nextTagIdComplete.slice(-1 * this.tagIdMinLength));
                        newTagId = String(isNotNilOrNaN(previousTagId) ? Math.max(nextTagIdSuffix, previousTagId + 1) : nextTagIdSuffix)
                            .padStart(this.tagIdMinLength, '0');
                        break;
                }
                data.measurementValues[PmfmIds.TAG_ID] = newTagId;
            }
            // Copy some value from previous sample
            if (previousSample && isNotEmptyArray(this.existingPmfmIdsToCopy)) {
                this.existingPmfmIdsToCopy
                    .forEach(pmfmId => {
                    if (isNilOrBlank(data.measurementValues[pmfmId])) {
                        data.measurementValues[pmfmId] = previousSample.measurementValues[pmfmId];
                    }
                });
            }
            // Reset __typename, to force normalization of all values
            MeasurementValuesUtils.resetTypename(data.measurementValues);
            data.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(data.measurementValues, this.pmfms, { keepSourceObject: true });
        });
    }
    getPreviousSample() {
        if (isNil(this.visibleRowCount) || this.visibleRowCount === 0)
            return undefined;
        const row = this.dataSource.getRow(this.visibleRowCount - 1);
        return row === null || row === void 0 ? void 0 : row.currentData;
    }
    getPreviousTagId() {
        if (isNil(this.visibleRowCount) || this.visibleRowCount === 0)
            return undefined;
        for (let i = this.visibleRowCount - 1; i >= 0; i--) {
            const row = this.dataSource.getRow(i);
            if (row) {
                const rowData = row.currentData;
                const existingTagId = toNumber(rowData === null || rowData === void 0 ? void 0 : rowData.measurementValues[PmfmIds.TAG_ID]);
                if (isNotNilOrNaN(existingTagId))
                    return existingTagId;
            }
        }
        return undefined;
    }
    openNewRowDetail() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.allowRowDetail)
                return false;
            const { data, role } = yield this.openDetailModal();
            if (data && role !== 'delete') {
                // Can be an update (is user use the 'save and new' modal's button),
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
                // Can be an update (is user use the 'save and new' modal's button),
                yield this.addOrUpdateEntityToTable(data);
                return true;
            }
            else {
                this.editedRow = null;
                return false;
            }
        });
    }
    prepareEntityToSave(data) {
        // Mark as controlled (should remove the duplicated tag id error - see issue #454)
        DataEntityUtils.markAsControlled(data);
    }
    findRowByEntity(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data || isNil(data.rankOrder))
                throw new Error('Missing argument data or data.rankOrder');
            return this.dataSource.getRows()
                .find(r => r.currentData.rankOrder === data.rankOrder);
        });
    }
    addPmfmColumns(pmfmIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(pmfmIds))
                return; // Skip if empty
            // Load each pmfms, by id
            const fullPmfms = yield Promise.all(pmfmIds.map(id => this.pmfmService.loadPmfmFull(id)));
            let pmfms = fullPmfms.map(DenormalizedPmfmStrategy.fromFullPmfm);
            // Add weight conversion
            if (this.weightDisplayedUnit) {
                pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit, { clone: false });
                console.debug('[samples-table] Add new pmfms: ', pmfms);
            }
            this.pmfms = [
                ...this.pmfms,
                ...pmfms
            ];
        });
    }
    openSelectPmfmsModal(event, filter, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const modal = yield this.modalCtrl.create({
                component: SelectPmfmModal,
                componentProps: {
                    filter: PmfmFilter.fromObject(filter),
                    showFilter: true,
                    allowMultiple: opts === null || opts === void 0 ? void 0 : opts.allowMultiple
                },
                keyboardClose: true,
                backdropDismiss: false,
                cssClass: 'modal-large'
            });
            // Open the modal
            yield modal.present();
            // On dismiss
            const { data } = yield modal.onDidDismiss();
            if (isEmptyArray(data))
                return; // CANCELLED
            // Return pmfm ids
            return data.map(p => p.id);
        });
    }
    /**
     * Force to wait PMFM map to be loaded
     *
     * @param pmfms
     */
    mapPmfms(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isEmptyArray(pmfms))
                return pmfms; // Nothing to map
            // Compute tag id
            this.tagIdPmfm = this.tagIdPmfm || pmfms && pmfms.find(pmfm => pmfm.id === PmfmIds.TAG_ID);
            // Compute pmfms to copy (e.g. need by SIH-OBSBIO)
            this.existingPmfmIdsToCopy = this.pmfmIdsToCopy
                && pmfms.filter(pmfm => !pmfm.defaultValue && !pmfm.hidden && this.pmfmIdsToCopy.includes(pmfm.id))
                    .map(pmfm => pmfm.id);
            if (this.showGroupHeader) {
                console.debug('[samples-table] Computing Pmfm group header...');
                // Wait until map is loaded
                const groupedPmfmIdsMap = yield firstNotNilPromise(this.$pmfmGroups, { stop: this.destroySubject });
                // Create a list of known pmfm ids
                const groupedPmfmIds = Object.values(groupedPmfmIdsMap).flatMap(pmfmIds => pmfmIds);
                // Create pmfms group
                const orderedPmfmIds = [];
                const orderedPmfms = [];
                let groupIndex = 0;
                const groupNames = ParameterGroups.concat('OTHER');
                const pmfmGroupColumns = groupNames.reduce((pmfmGroups, group) => {
                    var _a;
                    let groupPmfms;
                    if (group === 'OTHER') {
                        groupPmfms = pmfms.filter(p => !groupedPmfmIds.includes(p.id));
                    }
                    else {
                        const groupPmfmIds = groupedPmfmIdsMap[group];
                        groupPmfms = isNotEmptyArray(groupPmfmIds) ? pmfms.filter(p => groupPmfmIds.includes(p.id)) : [];
                    }
                    let groupPmfmCount = groupPmfms.length;
                    const readonlyGroup = ((_a = this.readonlyPmfmGroups) === null || _a === void 0 ? void 0 : _a.includes(group)) || false;
                    groupPmfms.forEach(pmfm => {
                        pmfm = pmfm.clone(); // Clone, to leave original PMFM unchanged
                        // If readonly
                        if (readonlyGroup) {
                            // Force as computed
                            pmfm.isComputed = true;
                            // Force as hidden, if not shown
                            if (!this.showReadonlyPmfms && this._enabled) {
                                pmfm.hidden = true;
                                groupPmfmCount--;
                                console.log('TODO HIDE pmfm ', pmfm);
                            }
                        }
                        // Use rankOrder as a group index (will be used in template, to computed column class)
                        if (PmfmUtils.isDenormalizedPmfm(pmfm)) {
                            pmfm.rankOrder = groupIndex + 1;
                        }
                        // Apply weight conversion, if need
                        if (this.weightDisplayedUnit) {
                            PmfmUtils.setWeightUnitConversion(pmfm, this.weightDisplayedUnit, { clone: false });
                        }
                        // Add pmfm into the final list of ordered pmfms
                        if (!orderedPmfms.includes(pmfm))
                            orderedPmfms.push(pmfm);
                    });
                    if (groupPmfmCount) {
                        ++groupIndex;
                    }
                    const cssClass = groupIndex % 2 === 0 ? 'even' : 'odd';
                    return pmfmGroups.concat(...groupPmfms.reduce((res, pmfm, index) => {
                        if (orderedPmfmIds.includes(pmfm.id))
                            return res; // Skip if already proceed
                        orderedPmfmIds.push(pmfm.id);
                        const visible = group !== 'TAG_ID';
                        const key = 'group-' + group;
                        return index !== 0 || groupPmfmCount === 0 ? res : res.concat({
                            key,
                            label: group,
                            name: visible && ('TRIP.SAMPLE.PMFM_GROUP.' + group) || '',
                            cssClass: visible && cssClass || '',
                            colSpan: groupPmfmCount
                        });
                    }, []));
                }, []);
                this.pmfmGroupColumns$.next(pmfmGroupColumns);
                this.groupHeaderColumnNames =
                    ['top-start']
                        .concat(arrayPluck(pmfmGroupColumns, 'key'))
                        .concat(['top-end']);
                this.groupHeaderStartColSpan = RESERVED_START_COLUMNS.length
                    + (this.showLabelColumn ? 1 : 0)
                    + (this.showTaxonGroupColumn ? 1 : 0)
                    + (this.showTaxonNameColumn ? 1 : 0)
                    + (this.showSampleDateColumn ? 1 : 0);
                this.groupHeaderEndColSpan = RESERVED_END_COLUMNS.length
                    + (this.showCommentsColumn ? 1 : 0);
                pmfms = orderedPmfms;
            }
            // No pmfm group (no table top headers)
            else {
                // Apply weight conversion, if need
                if (this.weightDisplayedUnit) {
                    pmfms = PmfmUtils.setWeightUnitConversions(pmfms, this.weightDisplayedUnit);
                }
            }
            // DEBUG
            const hasEmptyPmfm = pmfms.some(p => isNil(p === null || p === void 0 ? void 0 : p.id));
            if (hasEmptyPmfm) {
                console.error('[samples-table] Invalid PMFMS: ', pmfms);
            }
            // Add replacement map, for sort by
            pmfms.forEach(p => this.memoryDataService.addSortByReplacement(p.id.toString(), `measurementValues.${p.id}`));
            return pmfms;
        });
    }
    openSelectColumnsModal(event) {
        return super.openSelectColumnsModal(event);
    }
    setTagIdGenerationMode(mode) {
        this.forcedTagIdGenerationMode = mode;
        this.markForCheck();
    }
    addFooterListener(pmfms) {
        this.tagIdPmfm = this.tagIdPmfm || pmfms && pmfms.find(pmfm => pmfm.id === PmfmIds.TAG_ID);
        this.showTagCount = !!this.tagIdPmfm;
        // Should display tag count: add column to footer
        if (this.showTagCount && !this.footerColumns.includes('footer-tagCount')) {
            this.footerColumns = [...this.footerColumns, 'footer-tagCount'];
        }
        // If tag count not displayed
        else if (!this.showTagCount) {
            // Remove from footer columns
            this.footerColumns = this.footerColumns.filter(column => column !== 'footer-tagCount');
            // Reset counter
            this.tagCount$.next(0);
        }
        this.showFooter = this.footerColumns.length > 1;
        // DEBUG
        console.debug('[samples-table] Show footer ?', this.showFooter);
        // Remove previous rows listener
        if (!this.showFooter && this._footerRowsSubscription) {
            this.unregisterSubscription(this._footerRowsSubscription);
            this._footerRowsSubscription.unsubscribe();
            this._footerRowsSubscription = null;
        }
        else if (this.showFooter && !this._footerRowsSubscription) {
            this._footerRowsSubscription = this.dataSource.connect(null)
                .pipe(debounceTime(500)).subscribe(rows => this.updateFooter(rows));
        }
    }
    updateFooter(rows) {
        // Update tag count
        const tagCount = (rows || []).map(row => row.currentData.measurementValues[PmfmIds.TAG_ID.toString()])
            .filter(isNotNilOrBlank)
            .length;
        this.tagCount$.next(tagCount);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "tagIdPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showGroupHeader", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "useFooterSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "canAddPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SamplesTable.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesTable.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showIdColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showLabelColumn", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "requiredLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showPmfmDetails", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showFabButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showIndividualMonitoringButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showIndividualReleaseButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "defaultSampleDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", TaxonGroupRef)
], SamplesTable.prototype, "defaultTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", TaxonNameRef)
], SamplesTable.prototype, "defaultTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "modalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "compactFields", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showDisplayColumnModal", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesTable.prototype, "weightDisplayedUnit", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "enableTagIdGeneration", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesTable.prototype, "defaultTagIdGenerationMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "tagIdMinLength", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "tagIdPadString", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesTable.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SamplesTable.prototype, "defaultLongitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "allowSubSamples", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "subSampleModalOptions", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SamplesTable.prototype, "readonlyPmfmGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "showReadonlyPmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SamplesTable.prototype, "pmfmIdsToCopy", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SamplesTable.prototype, "pmfmValueColor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object),
    __metadata("design:paramtypes", [Object])
], SamplesTable.prototype, "pmfmGroups", null);
__decorate([
    Input(),
    __metadata("design:type", Array),
    __metadata("design:paramtypes", [Array])
], SamplesTable.prototype, "value", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplesTable.prototype, "showSampleDateColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplesTable.prototype, "showTaxonGroupColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplesTable.prototype, "showTaxonNameColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Boolean),
    __metadata("design:paramtypes", [Boolean])
], SamplesTable.prototype, "showImagesColumn", null);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SamplesTable.prototype, "availableTaxonGroups", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "prepareRowForm", void 0);
__decorate([
    Output(),
    __metadata("design:type", Object)
], SamplesTable.prototype, "weightUnitChanges", void 0);
SamplesTable = __decorate([
    Component({
        selector: 'app-samples-table',
        templateUrl: 'samples.table.html',
        styleUrls: ['samples.table.scss'],
        providers: [
            { provide: AppValidatorService, useExisting: SampleValidatorService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        SamplingStrategyService])
], SamplesTable);
export { SamplesTable };
//# sourceMappingURL=samples.table.js.map