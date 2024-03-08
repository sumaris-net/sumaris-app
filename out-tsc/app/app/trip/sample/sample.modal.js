import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Alerts, AppFormUtils, AudioProvider, EntityUtils, FormErrorTranslator, isNil, isNotEmptyArray, isNotNil, isNotNilOrBlank, LocalSettingsService, referentialToString, toBoolean, TranslateContextService } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { SampleForm } from './sample.form';
import { Sample } from './sample.model';
import { debounceTime } from 'rxjs/operators';
import moment from 'moment';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';
import { ImageAttachment } from '@app/data/image/image-attachment.model';
let SampleModal = class SampleModal {
    constructor(injector, modalCtrl, alertCtrl, settings, translate, translateContext, formErrorTranslator, audio, cd) {
        this.injector = injector;
        this.modalCtrl = modalCtrl;
        this.alertCtrl = alertCtrl;
        this.settings = settings;
        this.translate = translate;
        this.translateContext = translateContext;
        this.formErrorTranslator = formErrorTranslator;
        this.audio = audio;
        this.cd = cd;
        this._subscription = new Subscription();
        this.$title = new BehaviorSubject(undefined);
        this.debug = false;
        this.loading = false;
        this.requiredLabel = true;
        this.showLabel = true;
        this.showSampleDate = true;
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.availableTaxonGroups = null;
        // Default value
        this.mobile = settings.mobile;
        this.acquisitionLevel = AcquisitionLevelCodes.SAMPLE;
        // TODO: for DEV only
        this.debug = !environment.production;
    }
    get dirty() {
        return this.form.dirty || this.gallery.dirty;
    }
    get invalid() {
        return this.form.invalid;
    }
    get valid() {
        return this.form.valid;
    }
    ngOnInit() {
        var _a, _b;
        // Default values
        this.isNew = toBoolean(this.isNew, !this.data);
        this.usageMode = this.usageMode || this.settings.usageMode;
        this._isOnFieldMode = this.settings.isOnFieldMode(this.usageMode);
        this.disabled = toBoolean(this.disabled, false);
        this.i18nSuffix = this.i18nSuffix || '';
        this.showComment = toBoolean(this.showComment, !this.mobile || isNotNil(this.data.comments));
        this.showPictures = toBoolean(this.showPictures, isNotEmptyArray((_a = this.data) === null || _a === void 0 ? void 0 : _a.images));
        this.showIndividualMonitoringButton = !!this.openSubSampleModal && toBoolean(this.showIndividualMonitoringButton, false);
        this.showIndividualReleaseButton = !!this.openSubSampleModal && toBoolean(this.showIndividualReleaseButton, false);
        // Show/Hide individual release button
        if (this.showIndividualReleaseButton) {
            this.tagIdPmfm = (_b = this.pmfms) === null || _b === void 0 ? void 0 : _b.find(p => p.id === PmfmIds.TAG_ID);
            if (this.tagIdPmfm) {
                this.form.ready().then(() => {
                    const tagIdControl = this.form.form.get('measurementValues.' + this.tagIdPmfm.id);
                    this.registerSubscription(tagIdControl
                        .valueChanges
                        .subscribe(tagId => {
                        this.showIndividualReleaseButton = isNotNilOrBlank(tagId);
                        this.markForCheck();
                    }));
                });
            }
        }
        if (this.disabled) {
            this.form.disable();
        }
        else {
            // Change rankOrder validator, to optional
            this.form.form.get('rankOrder').setValidators(null);
        }
        // Update title each time value changes
        if (!this.isNew) {
            this._subscription.add(this.form.valueChanges
                .pipe(debounceTime(250))
                .subscribe(json => this.computeTitle(json)));
        }
        this.setValue(this.data);
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.dirty) {
                const saveBeforeLeave = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
                // User cancelled
                if (isNil(saveBeforeLeave) || event && event.defaultPrevented) {
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
    /**
     * Add and reset form
     */
    onSubmitAndNext(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            // DEBUG
            //console.debug('[sample-modal] Calling onSubmitAndNext()');
            // If new AND pristine BUT valud (e.g. all PMFMs are optional): avoid to validate
            if (this.isNew && !this.dirty && this.valid) {
                return; // skip
            }
            const data = yield this.getDataToSave();
            // invalid
            if (!data) {
                if (this._isOnFieldMode)
                    this.audio.playBeepError();
                return;
            }
            this.markAsLoading();
            try {
                const newData = yield this.onSaveAndNew(data);
                yield this.reset(newData);
                this.isNew = true;
                if (this._isOnFieldMode)
                    this.audio.playBeepConfirm();
                yield this.scrollToTop();
            }
            finally {
                this.markAsLoaded();
            }
        });
    }
    /**
     * Validate and close
     *
     * @param event
     */
    onSubmitIfDirty(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.dirty) {
                yield this.modalCtrl.dismiss();
            }
            else {
                return this.onSubmit(event);
            }
        });
    }
    /**
     * Validate and close
     *
     * @param event
     */
    onSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            // No changes: leave
            if ((!this.dirty && !this.isNew)
                // If new, not changed but valid (e.g. if all PMFM are optional) : avoid to save an empty entity => skip
                || (this.isNew && !this.dirty && this.valid)) {
                this.markAsLoading();
                yield this.modalCtrl.dismiss();
            }
            // Convert then dismiss
            else {
                const data = yield this.getDataToSave();
                if (!data)
                    return; // invalid
                this.markAsLoading();
                // Clone is required to detect images changes (workaround)
                // Fix issue #464 (images was not saved)
                yield this.modalCtrl.dismiss(data.clone());
            }
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
    onIndividualMonitoringClick(event) {
        return this.doOpenSubSampleModal(AcquisitionLevelCodes.INDIVIDUAL_MONITORING);
    }
    onIndividualReleaseClick(event) {
        return this.doOpenSubSampleModal(AcquisitionLevelCodes.INDIVIDUAL_RELEASE);
    }
    toggleImageGallery() {
        this.showPictures = !this.showPictures;
        this.markForCheck();
    }
    /* -- protected methods -- */
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-modal] Applying value to form...', data);
            this.form.markAsReady();
            this.gallery.markAsReady();
            this.resetError();
            try {
                // Set form value
                this.data = data || new Sample();
                const isNew = isNil(this.data.id);
                if (isNew && !this.data.sampleDate) {
                    if (this.defaultSampleDate) {
                        this.data.sampleDate = this.defaultSampleDate.clone();
                    }
                    else if (this._isOnFieldMode) {
                        this.data.sampleDate = moment();
                    }
                }
                // Set form value
                yield this.form.setValue(this.data);
                // DEBUG
                // Set gallery's images
                // this.gallery.value =
                //   [
                //     {id: 0, url: 'https://test.sumaris.net/assets/img/bg/ray-1.jpg', title: 'ray #1'},
                //     {id: 1, url: 'https://test.sumaris.net/assets/img/bg/ray-2.jpg', title: 'ray #2'}
                //   ].map(ImageAttachment.fromObject);
                this.showPictures = this.showPictures || isNotEmptyArray(this.data.images);
                this.gallery.value = this.showPictures && this.data.images || [];
                // Call ready callback
                if (this.onReady)
                    yield this.onReady(this);
                yield this.computeTitle();
            }
            finally {
                if (!this.disabled)
                    this.enable();
                this.form.markAsUntouched();
                this.form.markAsPristine();
                this.markForCheck();
            }
        });
    }
    getDataToSave(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.valid) {
                // Wait validation end
                yield AppFormUtils.waitWhilePending(this.form);
                if (this.invalid) {
                    if (this.debug)
                        AppFormUtils.logFormErrors(this.form.form, '[sample-modal] ');
                    // If not many fields/pmfms: display a simple message,
                    // Otherwise (many fields/pmfms) show a detailed message
                    if (!this.pmfms || this.pmfms.length < 5) {
                        this.setError('COMMON.FORM.HAS_ERROR');
                    }
                    else {
                        const error = this.formErrorTranslator.translateFormErrors(this.form.form, {
                            controlPathTranslator: this.form,
                            separator: '<br/>'
                        });
                        const errorMessage = isNotNilOrBlank(error)
                            ? `<small class="error-details">${error}</small>`
                            : 'COMMON.FORM.HAS_ERROR';
                        this.setError(errorMessage);
                    }
                    this.form.markAllAsTouched();
                    this.scrollToTop();
                    return;
                }
            }
            this.markAsLoading();
            this.resetError();
            // To force enable, to get computed values
            this.enable();
            try {
                // Get form value
                const data = this.form.value;
                // Add images
                if (this.showPictures) {
                    if (this.gallery.dirty) {
                        yield this.gallery.save();
                    }
                    const images = this.gallery.value;
                    data.images = images && images.map(ImageAttachment.fromObject) || undefined;
                }
                return data;
            }
            finally {
                if (!opts || opts.disable !== false) {
                    //this.disable();
                }
            }
        });
    }
    reset(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.setValue(data || new Sample());
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || this.data;
            // Compute prefix
            let prefix = '';
            const prefixItems = [];
            if (data && !this.showTaxonGroup && EntityUtils.isNotEmpty(data.taxonGroup, 'id')) {
                prefixItems.push(referentialToString(data.taxonGroup, this.settings.getFieldDisplayAttributes('taxonGroup')));
            }
            if (data && !this.showTaxonName && data && EntityUtils.isNotEmpty(data.taxonName, 'id')) {
                prefixItems.push(referentialToString(data.taxonName, this.settings.getFieldDisplayAttributes('taxonName')));
            }
            if (isNotEmptyArray(prefixItems)) {
                prefix = this.translateContext.instant('TRIP.SAMPLE.TITLE_PREFIX', this.i18nSuffix, { prefix: prefixItems.join(' / ') });
            }
            if (this.isNew || !data) {
                this.$title.next(prefix + this.translateContext.instant('TRIP.SAMPLE.NEW.TITLE', this.i18nSuffix));
            }
            else {
                // Label can be optional (e.g. in auction control)
                const label = this.showLabel && data.label || ('#' + data.rankOrder);
                this.$title.next(prefix + this.translateContext.instant('TRIP.SAMPLE.EDIT.TITLE', this.i18nSuffix, { label }));
            }
        });
    }
    doOpenSubSampleModal(acquisitionLevel) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.openSubSampleModal)
                return; // Skip
            // Save
            const savedSample = yield this.getDataToSave();
            if (!savedSample)
                return;
            try {
                // Execute the callback
                const updatedParent = yield this.openSubSampleModal(savedSample, acquisitionLevel);
                if (!updatedParent)
                    return; // User cancelled
                this.form.setChildren(updatedParent.children);
                this.form.markAsDirty();
            }
            finally {
                this.loading = false;
                this.form.enable();
            }
        });
    }
    scrollToTop() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.content.scrollToTop();
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
    registerSubscription(teardown) {
        this._subscription.add(teardown);
    }
    markAsLoading() {
        this.loading = true;
        this.markForCheck();
    }
    markAsLoaded() {
        this.loading = false;
        this.markForCheck();
    }
    enable(opts) {
        this.form.enable(opts);
        this.gallery.enable(opts);
    }
    disable(opts) {
        this.form.disable(opts);
        this.gallery.disable(opts);
    }
    setError(error) {
        this.form.error = error;
    }
    resetError() {
        this.form.error = null;
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Sample)
], SampleModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SampleModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SampleModal.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "requiredLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "showSampleDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "showIndividualReleaseButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "showIndividualMonitoringButton", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SampleModal.prototype, "showPictures", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SampleModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SampleModal.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SampleModal.prototype, "availableTaxonGroups", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SampleModal.prototype, "defaultSampleDate", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleModal.prototype, "pmfmValueColor", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleModal.prototype, "onReady", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleModal.prototype, "onSaveAndNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleModal.prototype, "onDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SampleModal.prototype, "openSubSampleModal", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SampleForm)
], SampleModal.prototype, "form", void 0);
__decorate([
    ViewChild('gallery', { static: true }),
    __metadata("design:type", AppImageAttachmentGallery)
], SampleModal.prototype, "gallery", void 0);
__decorate([
    ViewChild(IonContent),
    __metadata("design:type", IonContent)
], SampleModal.prototype, "content", void 0);
SampleModal = __decorate([
    Component({
        selector: 'app-sample-modal',
        templateUrl: 'sample.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        AlertController,
        LocalSettingsService,
        TranslateService,
        TranslateContextService,
        FormErrorTranslator,
        AudioProvider,
        ChangeDetectorRef])
], SampleModal);
export { SampleModal };
//# sourceMappingURL=sample.modal.js.map