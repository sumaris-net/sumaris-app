import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Alerts, AppFormUtils, AudioProvider, ErrorCodes, isNil, isNotNil, isNotNilOrBlank, LocalSettingsService, PlatformService, ReferentialUtils, toBoolean, } from '@sumaris-net/ngx-components';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, merge, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BatchGroupForm } from './batch-group.form';
import { debounceTime, filter, map, startWith } from 'rxjs/operators';
import { BatchGroup } from './batch-group.model';
import { environment } from '@environments/environment';
import { TripContextService } from '@app/trip/trip-context.service';
import { ContextService } from '@app/shared/context.service';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
let BatchGroupModal = class BatchGroupModal {
    constructor(injector, alertCtrl, modalCtrl, platform, settings, translate, audio, cd) {
        this.injector = injector;
        this.alertCtrl = alertCtrl;
        this.modalCtrl = modalCtrl;
        this.platform = platform;
        this.settings = settings;
        this.translate = translate;
        this.audio = audio;
        this.cd = cd;
        this._subscription = new Subscription();
        this.debug = false;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.showIndividualCount = false;
        this.allowSubBatches = true;
        this.taxonGroupsNoWeight = [];
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
        // TODO: for DEV only
        this.debug = !environment.production;
    }
    get dirty() {
        return this.form.dirty;
    }
    get invalid() {
        return this.form.invalid;
    }
    get valid() {
        return this.form.valid;
    }
    get pending() {
        return this.form.pending;
    }
    get enabled() {
        return !this.disabled;
    }
    enable(opts) {
        this.form.enable(opts);
    }
    disable(opts) {
        this.form.disable(opts);
    }
    ngOnInit() {
        var _a;
        this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
        this.isNew = toBoolean(this.isNew, !this.data);
        this.usageMode = this.usageMode || this.settings.usageMode;
        this._isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
        this.playSound = toBoolean(this.playSound, this.mobile || this._isOnFieldMode);
        this.disabled = toBoolean(this.disabled, false);
        this.enableBulkMode = this.enableBulkMode && !this.disabled && (typeof this.onSaveAndNew === 'function');
        this.showComment = toBoolean(this.showComment, !this.mobile || isNotNil(this.data.comments));
        if (this.disabled)
            this.disable();
        // Update title, when form change
        this._subscription.add(merge(this.form.form.get('taxonGroup').valueChanges, this.form.form.get('taxonName').valueChanges)
            .pipe(filter(_ => !this.form.loading), debounceTime(500), map(() => this.form.value), 
        // Start with current data
        startWith(this.data))
            .subscribe((data) => this.computeTitle(data)));
        this.form.childrenState = {
            showSamplingBatch: this.showSamplingBatch,
            samplingBatchEnabled: ((_a = this.data) === null || _a === void 0 ? void 0 : _a.observedIndividualCount) > 0 || this.defaultHasSubBatches,
            showExhaustiveInventory: false,
            showEstimatedWeight: false
        };
        this.load();
    }
    ngAfterViewInit() {
        // Focus on the first field (if new AND desktop AND enabled)
        if (this.isNew && !this.mobile && this.enabled) {
            this.form.ready().then(() => this.form.focusFirstInput());
        }
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.markAsReady();
            this.markAsLoading();
            try {
                yield this.updateView(this.data);
            }
            catch (err) {
                if (err === 'CANCELLED')
                    return;
                this.setError(err);
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    updateView(data, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.resetError();
            if (!data)
                throw { code: ErrorCodes.DATA_NOT_FOUND_ERROR, message: 'ERROR.DATA_NO_FOUND' };
            this.data = data;
            yield this.setValue(data);
            if (!opts || opts.emitEvent !== false) {
                this.markAsPristine();
                this.markAsUntouched();
                this.updateViewState(data);
            }
        });
    }
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.form.setValue(data);
        });
    }
    ready() {
        return this.form.ready();
    }
    updateViewState(data, opts) {
        if (this.isNew || this.enabled) {
            this.enable(opts);
        }
        else {
            this.disable(opts);
        }
        const errorMessage = this.enabled && this.usageMode === 'DESK' && isNil(data.controlDate) ? data.qualificationComments : null;
        // Skip if default/generic error, because this one is not useful. It can have been set when closing the modal
        if (isNotNilOrBlank(errorMessage) && errorMessage !== this.translate.instant('ERROR.INVALID_OR_INCOMPLETE_FILL')) {
            // Replace newline by a <br> tag, then display
            this.setError(errorMessage.replace(/(\n|\r|<br\/>)+/g, '<br/>'));
        }
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                let saveBeforeLeave = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
                // User cancelled
                if (isNil(saveBeforeLeave) || event && event.defaultPrevented)
                    return;
                // Ask a second confirmation, if observed individual count > 0
                if (saveBeforeLeave === false && this.isNew && this.data.observedIndividualCount > 0) {
                    saveBeforeLeave = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
                    // User cancelled
                    if (isNil(saveBeforeLeave) || event && event.defaultPrevented)
                        return;
                }
                // Is user confirm: close normally
                if (saveBeforeLeave === true) {
                    yield this.onSubmit(event);
                    return;
                }
            }
            yield this.modalCtrl.dismiss();
        });
    }
    getDataToSave(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            // Force enable form, before use value
            if (!this.enabled)
                this.enable({ emitEvent: false });
            this.markAsLoading();
            this.resetError();
            try {
                try {
                    // Wait pending async validator
                    yield AppFormUtils.waitWhilePending(this.form, {
                        timeout: 2000 // Workaround because of child form never finish FIXME
                    });
                }
                catch (err) {
                    console.warn('FIXME - Batch group form pending timeout!');
                }
                const invalid = !this.valid;
                if (invalid) {
                    let allowInvalid = !opts || opts.allowInvalid !== false;
                    // DO not allow invalid form, when taxon group and taxon name are missed
                    const taxonGroup = this.form.form.get('taxonGroup').value;
                    const taxonName = this.form.form.get('taxonName').value;
                    if (ReferentialUtils.isEmpty(taxonGroup) && ReferentialUtils.isEmpty(taxonName)) {
                        this.setError('COMMON.FORM.HAS_ERROR');
                        allowInvalid = false;
                    }
                    // Invalid not allowed: stop
                    if (!allowInvalid) {
                        if (this.debug)
                            this.form.logFormErrors('[batch-group-modal] ');
                        this.form.markAllAsTouched();
                        return undefined;
                    }
                }
                // Save table content
                this.data = this.form.value;
                // Mark as invalid
                if (invalid) {
                    BatchUtils.markAsInvalid(this.data, this.translate.instant('ERROR.INVALID_OR_INCOMPLETE_FILL'));
                }
                // Reset control (and old invalid quality flag)
                else {
                    BatchUtils.markAsNotControlled(this.data, { withChildren: true });
                }
                return this.data;
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    /**
     * Validate and close. If on bulk mode is enable, skip validation if form is pristine
     *
     * @param event
     */
    onSubmitIfDirty(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            if (this.enableBulkMode && !this.dirty) {
                yield this.modalCtrl.dismiss();
            }
            else {
                return this.onSubmit(event);
            }
        });
    }
    onSubmit(event, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            const data = yield this.getDataToSave(Object.assign({ allowInvalid: true }, opts));
            if (!data)
                return;
            this.markAsLoading();
            yield this.modalCtrl.dismiss(data);
        });
    }
    delete(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // Apply deletion, if callback exists
            if (this.onDelete) {
                const deleted = yield this.onDelete(event, this.data);
                if (isNil(deleted) || (event && event.defaultPrevented))
                    return; // User cancelled
                if (deleted)
                    yield this.modalCtrl.dismiss();
            }
            else {
                // Ask caller the modal owner apply deletion
                yield this.modalCtrl.dismiss(this.data, 'delete');
            }
        });
    }
    /**
     * Add and reset form
     */
    onSubmitAndNext(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            // DEBUG
            //console.debug('[batch-group-modal] Calling onSubmitAndNext()');
            // If new AND pristine BUT valid (e.g. all PMFMs are optional): avoid to validate
            if (this.isNew && !this.dirty && this.valid) {
                return; // skip
            }
            const data = yield this.getDataToSave();
            // invalid
            if (!data) {
                if (this.playSound)
                    yield this.audio.playBeepError();
                return;
            }
            this.markAsLoading();
            try {
                const newData = yield this.onSaveAndNew(data);
                if (!newData)
                    return; // Failed to save row
                yield this.reset(newData);
                this.isNew = true;
                if (this.playSound) {
                    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            yield this.audio.playBeepConfirm();
                        }
                        catch (err) {
                            console.error(err);
                        }
                    }), 50);
                }
                yield this.scrollToTop();
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    reset(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateView(data || new BatchGroup());
        });
    }
    onShowSubBatchesButtonClick(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.openSubBatchesModal)
                return; // Skip
            // Save
            const data = yield this.getDataToSave({ allowInvalid: true });
            if (!data)
                return;
            // Execute the callback
            const updatedParent = yield this.openSubBatchesModal(data);
            if (!updatedParent)
                return; // User cancelled
            this.data = updatedParent;
            yield this.form.setValue(this.data);
            this.form.markAsDirty();
        });
    }
    /* -- protected methods -- */
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || this.data;
            if (this.isNew) {
                this.$title.next(yield this.translate.get('TRIP.BATCH.NEW.TITLE').toPromise());
            }
            else {
                const label = BatchUtils.parentToString(data);
                this.$title.next(yield this.translate.get('TRIP.BATCH.EDIT.TITLE', { label }).toPromise());
            }
        });
    }
    markAllAsTouched() {
        this.form.markAllAsTouched();
    }
    markAsUntouched() {
        this.form.markAsUntouched();
    }
    markAsPristine() {
        this.form.markAsPristine();
    }
    scrollToTop() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.content.scrollToTop();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    markAsReady() {
        this.form.markAsReady();
    }
    markAsLoading() {
        this.loading = true;
        this.markForCheck();
    }
    markAsLoaded() {
        this.loading = false;
        this.markForCheck();
    }
    setError(error) {
        const errorMessage = (error === null || error === void 0 ? void 0 : error.message) ? error.message : error;
        this.form.error = errorMessage;
    }
    resetError() {
        this.form.error = null;
    }
};
__decorate([
    Input(),
    __metadata("design:type", BatchGroup)
], BatchGroupModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "playSound", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "qvPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupModal.prototype, "childrenPmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "showIndividualCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "showSamplingBatch", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "allowSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "showHasSubBatchesButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "defaultHasSubBatches", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], BatchGroupModal.prototype, "taxonGroupsNoWeight", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchGroupModal.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "enableWeightConversion", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchGroupModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchGroupModal.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupModal.prototype, "samplingRatioFormat", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchGroupModal.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchGroupModal.prototype, "enableBulkMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BatchGroupModal.prototype, "openSubBatchesModal", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BatchGroupModal.prototype, "onDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BatchGroupModal.prototype, "onSaveAndNew", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", BatchGroupForm)
], BatchGroupModal.prototype, "form", void 0);
__decorate([
    ViewChild(IonContent),
    __metadata("design:type", IonContent)
], BatchGroupModal.prototype, "content", void 0);
BatchGroupModal = __decorate([
    Component({
        selector: 'app-batch-group-modal',
        templateUrl: 'batch-group.modal.html',
        styleUrls: ['batch-group.modal.scss'],
        providers: [
            { provide: ContextService, useExisting: TripContextService }
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AlertController,
        ModalController,
        PlatformService,
        LocalSettingsService,
        TranslateService,
        AudioProvider,
        ChangeDetectorRef])
], BatchGroupModal);
export { BatchGroupModal };
//# sourceMappingURL=batch-group.modal.js.map