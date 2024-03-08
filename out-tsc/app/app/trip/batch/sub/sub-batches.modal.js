import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { ChangeDetectionStrategy, Component, Inject, Injector, Input, ViewChild } from '@angular/core';
import { Batch } from '../common/batch.model';
import { Alerts, AppFormUtils, AudioProvider, firstNotNilPromise, isEmptyArray, isNil, isNotNilOrBlank, LocalSettingsService, PlatformService, toBoolean, } from '@sumaris-net/ngx-components';
import { SubBatchForm } from './sub-batch.form';
import { SUB_BATCH_RESERVED_END_COLUMNS, SUB_BATCHES_TABLE_OPTIONS, SubBatchesTable } from './sub-batches.table';
import { IonContent, ModalController } from '@ionic/angular';
import { isObservable, Subject } from 'rxjs';
import { createAnimation } from '@ionic/core';
import { SubBatch } from './sub-batch.model';
import { BatchGroup } from '../group/batch-group.model';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
import { environment } from '@environments/environment';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { SelectionModel } from '@angular/cdk/collections';
import { SubBatchValidatorService } from '@app/trip/batch/sub/sub-batch.validator';
export const SUB_BATCH_MODAL_RESERVED_START_COLUMNS = ['parentGroup', 'taxonName'];
export const SUB_BATCH_MODAL_RESERVED_END_COLUMNS = SUB_BATCH_RESERVED_END_COLUMNS.filter(col => col !== 'individualCount');
let SubBatchesModal = class SubBatchesModal extends SubBatchesTable {
    constructor(injector, viewCtrl, settings, audio, platform, context, options) {
        super(injector, null /*no validator = not editable*/, options);
        this.injector = injector;
        this.viewCtrl = viewCtrl;
        this.settings = settings;
        this.audio = audio;
        this.platform = platform;
        this.context = context;
        this.$title = new Subject();
        this.animationSelection = new SelectionModel(false, []);
        this.showBluetoothIcon = false;
        this.inlineEdition = false; // Disable row edition (no validator)
        this.confirmBeforeDelete = true; // Ask confirmation before delete
        this.allowRowDetail = false; // Disable click on a row
        this.defaultSortBy = 'id';
        this.defaultSortDirection = 'desc';
        this.selection = new SelectionModel(false);
        // default values
        this.showCommentsColumn = false;
        this.showParentColumn = false;
        // TODO: for DEV only ---
        this.debug = !environment.production;
    }
    get selectedRow() {
        return this.selection.selected[0] || this.editedRow;
    }
    set selectedRow(row) {
        this.selection.clear();
        if (row)
            this.selection.select(row);
        this.markForCheck();
    }
    get dirty() {
        return super.dirty || (this.form && this.form.dirty);
    }
    get valid() {
        return this.form && this.form.valid;
    }
    get invalid() {
        return this.form && this.form.invalid;
    }
    set i18nSuffix(value) {
        this.i18nColumnSuffix = value;
    }
    get i18nSuffix() {
        return this.i18nColumnSuffix;
    }
    ngOnInit() {
        if (this.disabled) {
            this.showForm = false;
            this.disable();
        }
        super.ngOnInit();
        // default values
        this.mobile = toBoolean(this.mobile, this.platform.mobile);
        this._isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
        this.showIndividualCount = !this._isOnFieldMode; // Hide individual count on mobile device
        this.showParentGroup = toBoolean(this.showParentGroup, true);
        this.showForm = this._enabled && this.showForm && this.form && true;
        this.playSound = toBoolean(this.playSound, this.mobile);
        this.showBluetoothIcon = this.showBluetoothIcon && this._enabled && this.platform.isApp();
        this.markAsReady();
        this.load();
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Wait for table pmfms
                const pmfms = yield firstNotNilPromise(this.pmfms$, { stop: this.destroySubject, stopError: false });
                yield this.initForm(pmfms);
                // Read data
                const data = isObservable(this.data) ? yield this.data.toPromise() : this.data;
                // Apply data to table
                this.setValue(data);
                // Compute the title
                yield this.computeTitle();
            }
            catch (err) {
                console.error(this.logPrefix + 'Error while loading modal');
            }
        });
    }
    initForm(pmfms) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!pmfms || !this.form)
                return; // skip
            // Configure form's properties
            this.form.qvPmfm = this.qvPmfm;
            yield this.form.setPmfms(pmfms);
            // Mark form as ready
            this.form.markAsReady();
            yield this.form.ready();
            // Reset the form, using default value
            let defaultBatch;
            if (this.parentGroup) {
                defaultBatch = new SubBatch();
                defaultBatch.parentGroup = this.parentGroup;
            }
            yield this.resetForm(defaultBatch);
            // Update table content when changing parent
            this.registerSubscription(this.form.form.get('parentGroup').valueChanges
                // Init table with existing values
                //.pipe(startWith(() => this._defaultValue && this._defaultValue.parent))
                .subscribe(parent => this.onParentChanges(parent)));
        });
    }
    markAsReady() {
        super.markAsReady();
        // Should be done inside initForm(), when pmfms has set
        //this.form?.markAsReady();
    }
    ready() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield ((_a = this.form) === null || _a === void 0 ? void 0 : _a.ready());
        });
    }
    setValue(data, opts) {
        // DEBUG
        //console.debug('[sub-batches-modal] Applying value to table...', data);
        // Compute the first rankOrder to save
        this._initialMaxRankOrder = (data || []).reduce((max, b) => Math.max(max, b.rankOrder || 0), 0);
        super.setValue(data, opts);
    }
    doSubmitForm(event, row) {
        const _super = Object.create(null, {
            doSubmitForm: { get: () => super.doSubmitForm }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield this.scrollToTop();
            const done = yield _super.doSubmitForm.call(this, event, row);
            // Forget the edited row
            if (done) {
                this.selectedRow = null;
                this.markForCheck();
            }
            return done;
        });
    }
    mapPmfms(pmfms) {
        pmfms = super.mapPmfms(pmfms);
        const parentTaxonGroupId = this.parentGroup && this.parentGroup.taxonGroup && this.parentGroup.taxonGroup.id;
        if (isNil(parentTaxonGroupId))
            return pmfms;
        // Filter using parent's taxon group
        return pmfms.filter(pmfm => !PmfmUtils.isDenormalizedPmfm(pmfm)
            || isEmptyArray(pmfm.taxonGroupIds)
            || pmfm.taxonGroupIds.includes(parentTaxonGroupId));
    }
    cancel(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                const saveBeforeLeave = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
                // User cancelled
                if (isNil(saveBeforeLeave) || event && event.defaultPrevented) {
                    return;
                }
                // Is user confirm: close normally
                if (saveBeforeLeave === true) {
                    this.close(event);
                    return;
                }
            }
            yield this.viewCtrl.dismiss();
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // avoid many call
            if (this.debug)
                console.debug('[sub-batch-modal] Closing modal...');
            if (this.debug && this.form && this.form.dirty && this.form.invalid) {
                AppFormUtils.logFormErrors(this.form.form, '[sub-batch-modal] ');
                // Continue
            }
            this.markAsLoading();
            this.resetError();
            try {
                // Save changes
                const saved = yield this.save();
                if (!saved)
                    return; // Error
                yield this.viewCtrl.dismiss(this.getValue());
            }
            catch (err) {
                console.error(err);
                this.setError(err && err.message || err);
                this.markAsLoaded();
            }
        });
    }
    isNewRow(row) {
        return row.currentData.rankOrder > this._initialMaxRankOrder;
    }
    editRow(event, row) {
        row = row || this.selectedRow;
        if (!row)
            throw new Error('Missing row argument, or a row selection.');
        // Confirm last edited row
        const confirmed = this.confirmEditCreate();
        if (!confirmed)
            return false;
        // Copy the row into the form
        this.form.setValue(this.toEntity(row), { emitEvent: true });
        // Then remove the row
        row.startEdit();
        // Mark the row as edited
        this.selectedRow = row;
        return true;
    }
    selectRow(event, row) {
        if ((event === null || event === void 0 ? void 0 : event.defaultPrevented) || !row)
            return;
        if (event)
            event.preventDefault();
        this.selection.clear();
        this.selection.select(row);
    }
    /* -- protected methods -- */
    computeTitle() {
        return __awaiter(this, void 0, void 0, function* () {
            let titlePrefix;
            if (!this.showParentGroup && this.parentGroup) {
                const label = BatchUtils.parentToString(this.parentGroup);
                titlePrefix = yield this.translate.get('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE_PREFIX', { label }).toPromise();
            }
            else {
                titlePrefix = '';
            }
            this.$title.next(titlePrefix + (yield this.translate.get('TRIP.BATCH.EDIT.INDIVIDUAL.TITLE').toPromise()));
        });
    }
    onParentChanges(parent) {
        return __awaiter(this, void 0, void 0, function* () {
            // Skip if same parent
            if (Batch.equals(this.parentGroup, parent))
                return;
            // Store the new parent, in order apply filter in onLoadData()
            this.parentGroup = isNotNilOrBlank(parent) ? parent : undefined;
            // If pending changes, save new rows
            if (this.dirty) {
                const saved = yield this.save();
                if (!saved) {
                    console.error('Could not save the table');
                    this.form.error = 'ERROR.SAVE_DATA_ERROR';
                    return;
                }
            }
            // Call refresh on datasource, to force a data reload (will apply filter calling onLoadData())
            this.onRefresh.emit();
            // TODO BLA: refresh PMFM, with the new parent species ?
        });
    }
    onLoadData(data) {
        // Filter by parent group
        if (data && this.parentGroup) {
            const showIndividualCount = this.showIndividualCount; // Read once the getter value
            const hiddenData = [];
            let maxRankOrder = this._previousMaxRankOrder || this._initialMaxRankOrder;
            const filteredData = data.reduce((res, b) => {
                maxRankOrder = Math.max(maxRankOrder, b.rankOrder || 0);
                // Filter on individual count = 1 when individual count is hide
                // AND same parent
                if ((showIndividualCount || b.individualCount === 1)
                    && Batch.equals(this.parentGroup, b.parentGroup)) {
                    return res.concat(b);
                }
                hiddenData.push(b);
                return res;
            }, []);
            this._hiddenData = hiddenData;
            this._previousMaxRankOrder = maxRankOrder;
            return super.onLoadData(filteredData);
        }
        // Not filtered
        else {
            this._hiddenData = [];
            return super.onLoadData(data);
        }
    }
    onSaveData(data) {
        // Append hidden data to the list, then save
        return data.concat(this._hiddenData || []);
    }
    getMaxRankOrder() {
        const _super = Object.create(null, {
            getMaxRankOrder: { get: () => super.getMaxRankOrder }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const rowMaxRankOrder = yield _super.getMaxRankOrder.call(this);
            this._previousMaxRankOrder = Math.max(rowMaxRankOrder, this._previousMaxRankOrder || this._initialMaxRankOrder);
            return this._previousMaxRankOrder;
        });
    }
    addEntityToTable(newBatch) {
        const _super = Object.create(null, {
            addEntityToTable: { get: () => super.addEntityToTable }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield _super.addEntityToTable.call(this, newBatch);
            // Highlight the row, few seconds
            if (row)
                this.onRowChanged(row);
            return row;
        });
    }
    updateEntityToTable(updatedBatch, row, opts) {
        const _super = Object.create(null, {
            updateEntityToTable: { get: () => super.updateEntityToTable }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const updatedRow = yield _super.updateEntityToTable.call(this, updatedBatch, row, opts);
            // Highlight the row, few seconds
            if (updatedRow)
                this.onRowChanged(updatedRow);
            return updatedRow;
        });
    }
    onInvalidForm() {
        const _super = Object.create(null, {
            onInvalidForm: { get: () => super.onInvalidForm }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Play an error beep, if on field
            if (this.playSound)
                yield this.audio.playBeepError();
            return _super.onInvalidForm.call(this);
        });
    }
    /**
     * When a row has been edited, play a beep and highlight the row (during few seconds)
     *
     * @param row
     * @pram times duration of highlight
     */
    onRowChanged(row) {
        return __awaiter(this, void 0, void 0, function* () {
            // Play a beep
            if (this.playSound)
                this.audio.playBeepConfirm();
            // Selection the animated row (this will apply CSS class mat-row-animated)
            this.animationSelection.select(row);
            this.markForCheck();
            this.cd.detectChanges();
            this.createRowAnimation(document.querySelector('.mat-row-animated'))
                .duration(500)
                .play()
                .then(() => {
                // If row is still selected: unselect it
                if (this.animationSelection.isSelected(row)) {
                    this.animationSelection.deselect(row);
                    this.markForCheck();
                }
            });
        });
    }
    trackByFn(index, row) {
        return row.currentData.rankOrder;
    }
    scrollToTop() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.content.scrollToTop();
        });
    }
    createRowAnimation(rowElement) {
        const cellElements = rowElement && Array.from(rowElement.querySelectorAll('.mat-cell'));
        if (!rowElement || isEmptyArray(cellElements)) {
            return createAnimation();
        }
        const rowAnimation = createAnimation()
            .addElement(rowElement)
            .beforeStyles({ 'transition-timing-function': 'ease-in-out', background: 'var(--ion-color-accent)' })
            .keyframes([
            { offset: 0, opacity: '0.4', transform: 'translateX(50%)', background: 'var(--ion-color-accent)' },
            { offset: 0.5, opacity: '0.9', transform: 'translateX(2%)', background: 'var(--ion-color-accent)' },
            { offset: 1, opacity: '1', transform: 'translateX(0)', background: 'var(--ion-color-base)' }
        ])
            .afterStyles({
            background: 'rgba(var(--ion-color-accent-rgb), 0.8)'
        });
        const cellAnimation = createAnimation()
            .addElement(cellElements)
            .beforeStyles({
            'transition-timing-function': 'ease-in-out',
            color: 'var(--ion-color-accent-contrast)',
            'font-weight': 'bold'
        })
            .keyframes([
            { offset: 0, color: 'var(--ion-color-accent-contrast)', 'font-weight': 'bold' },
            { offset: 0.5, color: 'var(--ion-color-accent-contrast)', 'font-weight': 'bold' },
            { offset: 1, color: 'var(--ion-color-base)', 'font-weight': 'normal' }
        ])
            .afterStyles({
            'font-weight': ''
        });
        return createAnimation().addAnimation([rowAnimation, cellAnimation]);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Function)
], SubBatchesModal.prototype, "onNewParentClick", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchesModal.prototype, "showParentGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", BatchGroup)
], SubBatchesModal.prototype, "parentGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchesModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubBatchesModal.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchesModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchesModal.prototype, "playSound", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchesModal.prototype, "showBluetoothIcon", void 0);
__decorate([
    Input(),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [String])
], SubBatchesModal.prototype, "i18nSuffix", null);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SubBatchForm)
], SubBatchesModal.prototype, "form", void 0);
__decorate([
    ViewChild('content'),
    __metadata("design:type", IonContent)
], SubBatchesModal.prototype, "content", void 0);
SubBatchesModal = __decorate([
    Component({
        selector: 'app-sub-batches-modal',
        styleUrls: ['sub-batches.modal.scss'],
        templateUrl: 'sub-batches.modal.html',
        providers: [
            { provide: ContextService, useExisting: TripContextService },
            { provide: SubBatchValidatorService, useClass: SubBatchValidatorService },
            {
                provide: SUB_BATCHES_TABLE_OPTIONS,
                useFactory: () => ({
                    prependNewElements: true,
                    suppressErrors: true,
                    reservedStartColumns: SUB_BATCH_MODAL_RESERVED_START_COLUMNS,
                    reservedEndColumns: SUB_BATCH_MODAL_RESERVED_END_COLUMNS
                })
            }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __param(6, Inject(SUB_BATCHES_TABLE_OPTIONS)),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        LocalSettingsService,
        AudioProvider,
        PlatformService,
        ContextService, Object])
], SubBatchesModal);
export { SubBatchesModal };
//# sourceMappingURL=sub-batches.modal.js.map