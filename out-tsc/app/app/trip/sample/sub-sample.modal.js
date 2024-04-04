import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Alerts, AppFormUtils, isNil, isNotNilOrBlank, LocalSettingsService, toBoolean, TranslateContextService } from '@sumaris-net/ngx-components';
import { environment } from '@environments/environment';
import { AlertController, IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { Sample } from './sample.model';
import { debounceTime } from 'rxjs/operators';
import { SubSampleForm } from '@app/trip/sample/sub-sample.form';
let SubSampleModal = class SubSampleModal {
    constructor(injector, modalCtrl, alertCtrl, settings, translate, translateContext, cd) {
        this.injector = injector;
        this.modalCtrl = modalCtrl;
        this.alertCtrl = alertCtrl;
        this.settings = settings;
        this.translate = translate;
        this.translateContext = translateContext;
        this.cd = cd;
        this._subscription = new Subscription();
        this.$title = new BehaviorSubject(undefined);
        this.debug = false;
        this.loading = false;
        // Default value
        this.mobile = settings.mobile;
        this.showComment = !this.mobile;
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
    ngOnInit() {
        this.isNew = toBoolean(this.isNew, !this.data);
        this.usageMode = this.usageMode || this.settings.usageMode;
        this.disabled = toBoolean(this.disabled, false);
        this.acquisitionLevel = this.acquisitionLevel || AcquisitionLevelCodes.INDIVIDUAL_MONITORING;
        this.i18nSuffix = this.i18nSuffix || '';
        this.i18nFullSuffix = `${this.acquisitionLevel}.${this.i18nSuffix}`;
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
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sample-modal] Applying value to form...', data);
            this.form.markAsReady();
            this.form.error = null;
            try {
                // Set form value
                this.data = data || new Sample();
                const promiseOrVoid = this.form.setValue(this.data);
                if (promiseOrVoid)
                    yield promiseOrVoid;
                // Call ready callback
                /*if (this.onReady) {
                  promiseOrVoid = this.onReady(this);
                  if (promiseOrVoid) await promiseOrVoid;
                }*/
                // Compute the title
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
     * Validate and close
     *
     * @param event
     */
    onSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return undefined; // avoid many call
            // Leave without saving
            if (!this.dirty) {
                this.loading = true;
                yield this.modalCtrl.dismiss();
            }
            // Convert and dismiss
            else {
                const data = this.dirty ? this.getDataToSave() : this.data;
                if (!data)
                    return; // invalid
                this.loading = true;
                yield this.modalCtrl.dismiss(data);
            }
        });
    }
    delete(event) {
        return __awaiter(this, void 0, void 0, function* () {
            let canDelete = true;
            if (this.onDelete) {
                canDelete = yield this.onDelete(event, this.data);
                if (isNil(canDelete) || (event && event.defaultPrevented))
                    return; // User cancelled
            }
            if (canDelete) {
                yield this.modalCtrl.dismiss(this.data, 'DELETE');
            }
        });
    }
    /* -- protected methods -- */
    enable() {
        this.form.enable();
    }
    getDataToSave() {
        if (this.invalid) {
            if (this.debug)
                AppFormUtils.logFormErrors(this.form.form, '[sub-sample-modal] ');
            this.form.error = 'COMMON.FORM.HAS_ERROR';
            this.form.markAllAsTouched();
            this.scrollToTop();
            return undefined;
        }
        this.loading = true;
        // To force enable, to get computed values
        this.form.form.enable();
        try {
            // Get form value
            return this.form.value;
        }
        finally {
            this.form.form.disable();
        }
    }
    reset(data) {
        this.data = data || new Sample();
        this.form.error = null;
        try {
            this.form.value = this.data;
            this.form.enable();
            // Compute the title
            this.computeTitle();
        }
        finally {
            this.form.markAsPristine();
            this.form.markAsUntouched();
            this.markForCheck();
        }
    }
    computeTitle(data) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            // Make sure form is ready, before accessing to autocomplete config
            yield this.form.ready();
            // DEBUG
            console.debug('[sub-sample-modal] Computing title');
            data = data || this.data;
            // Compute prefix, from parent
            const parentStr = data.parent && ((_a = this.form) === null || _a === void 0 ? void 0 : _a.autocompleteFields.parent.displayWith(data.parent));
            const prefix = isNotNilOrBlank(parentStr)
                ? this.translateContext.instant(`TRIP.SUB_SAMPLE.TITLE_PREFIX`, this.i18nFullSuffix, { prefix: parentStr })
                : '';
            if (this.isNew || !data) {
                this.$title.next(prefix + this.translateContext.instant(`TRIP.SUB_SAMPLE.NEW.TITLE`, this.i18nFullSuffix));
            }
            else {
                // Label can be optional (e.g. in auction control)
                const label = this.showLabel && data.label || ('#' + data.rankOrder);
                this.$title.next(prefix + this.translateContext.instant(`TRIP.SUB_SAMPLE.EDIT.TITLE`, this.i18nFullSuffix, { label }));
            }
        });
    }
    scrollToTop() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.content.scrollToTop();
        });
    }
    registerSubscription(teardown) {
        this._subscription.add(teardown);
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Sample)
], SubSampleModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SubSampleModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SubSampleModal.prototype, "availableParents", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleModal.prototype, "showLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleModal.prototype, "showParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubSampleModal.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], SubSampleModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "defaultLatitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubSampleModal.prototype, "defaultLongitudeSign", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SubSampleModal.prototype, "onReady", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], SubSampleModal.prototype, "onDelete", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SubSampleForm)
], SubSampleModal.prototype, "form", void 0);
__decorate([
    ViewChild(IonContent),
    __metadata("design:type", IonContent)
], SubSampleModal.prototype, "content", void 0);
SubSampleModal = __decorate([
    Component({
        selector: 'app-sub-sample-modal',
        templateUrl: 'sub-sample.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        AlertController,
        LocalSettingsService,
        TranslateService,
        TranslateContextService,
        ChangeDetectorRef])
], SubSampleModal);
export { SubSampleModal };
//# sourceMappingURL=sub-sample.modal.js.map