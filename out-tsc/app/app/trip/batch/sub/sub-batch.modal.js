import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { AppFormUtils, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { IonContent, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { PmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { SubBatchForm } from './sub-batch.form';
import { SubBatch } from './sub-batch.model';
import { debounceTime } from 'rxjs/operators';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
import { SubBatchValidatorService } from '@app/trip/batch/sub/sub-batch.validator';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/trip-context.service';
let SubBatchModal = class SubBatchModal {
    constructor(injector, modalCtrl, settings, translate, cd) {
        this.injector = injector;
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
        this._subscription = new Subscription();
        this.debug = false;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        this.showParent = true;
        this.showTaxonName = true;
        this.showIndividualCount = false;
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
        this.mobile = settings.mobile;
        // TODO: for DEV only
        //this.debug = !environment.production;
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
        this.disabled = toBoolean(this.disabled, false);
        this.isNew = toBoolean(this.isNew, false);
        if (this.disabled) {
            this.form.disable();
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
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modalCtrl.dismiss();
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // avoid many call
            // Leave without saving
            if (!this.dirty) {
                this.markAsLoading();
                yield this.modalCtrl.dismiss();
            }
            // Convert and dismiss
            else {
                const data = this.getDataToSave();
                if (!data)
                    return; // invalid
                this.markAsLoading();
                yield this.modalCtrl.dismiss(data);
            }
        });
    }
    /* -- protected methods -- */
    setValue(data) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug('[sub-batch-modal] Applying value to form...', data);
            this.form.markAsReady();
            this.form.error = null;
            try {
                // Set form value
                this.data = this.data || new SubBatch();
                yield this.form.setValue(this.data);
                // Call ready callback
                /*if (this.onReady) {
                  promiseOrVoid = this.onReady(this);
                  if (promiseOrVoid) await promiseOrVoid;
                }*/
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
        if (this.invalid) {
            if (this.debug)
                AppFormUtils.logFormErrors(this.form.form, '[sample-modal] ');
            this.form.error = 'COMMON.FORM.HAS_ERROR';
            this.form.markAllAsTouched();
            this.scrollToTop();
            return undefined;
        }
        this.markAsLoading();
        // To force enable, to get computed values
        this.enable();
        try {
            // Get form value
            return this.form.value;
        }
        finally {
            if (!opts || opts.disable !== false) {
                this.disable();
            }
        }
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || this.data;
            if (this.isNew || !data) {
                this.$title.next(yield this.translate.get('TRIP.SUB_BATCH.NEW.TITLE').toPromise());
            }
            else {
                const label = BatchUtils.parentToString(data);
                this.$title.next(yield this.translate.get('TRIP.SUB_BATCH.EDIT.TITLE', { label }).toPromise());
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
    enable() {
        this.form.enable();
    }
    disable() {
        this.form.disable();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], SubBatchModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", SubBatch)
], SubBatchModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], SubBatchModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchModal.prototype, "showParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchModal.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], SubBatchModal.prototype, "showIndividualCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", PmfmStrategy)
], SubBatchModal.prototype, "qvPmfm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], SubBatchModal.prototype, "availableParents", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", SubBatchForm)
], SubBatchModal.prototype, "form", void 0);
__decorate([
    ViewChild(IonContent),
    __metadata("design:type", IonContent)
], SubBatchModal.prototype, "content", void 0);
SubBatchModal = __decorate([
    Component({
        selector: 'app-sub-batch-modal',
        templateUrl: 'sub-batch.modal.html',
        providers: [
            { provide: ContextService, useExisting: TripContextService },
            { provide: SubBatchValidatorService, useClass: SubBatchValidatorService },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], SubBatchModal);
export { SubBatchModal };
//# sourceMappingURL=sub-batch.modal.js.map