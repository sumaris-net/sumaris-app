import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Batch } from './batch.model';
import { BehaviorSubject } from 'rxjs';
import { BatchForm } from './batch.form';
import { ModalController } from '@ionic/angular';
import { AppFormUtils, isNotNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BatchUtils } from '@app/trip/batch/common/batch.utils';
let BatchModal = class BatchModal {
    constructor(injector, viewCtrl, settings, translate, cd) {
        this.injector = injector;
        this.viewCtrl = viewCtrl;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
        this.debug = false;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        this.isNew = false;
        this.showTaxonGroup = true;
        this.showTaxonName = true;
        this.showIndividualCount = false;
        this.showTotalIndividualCount = false;
        this.showSamplingBatch = false;
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.SORTING_BATCH;
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
        // Default values
        this.mobile = isNotNil(this.mobile) ? this.mobile : this.settings.mobile;
        this.disabled = toBoolean(this.disabled, false);
        this.showComment = toBoolean(this.showComment, !this.mobile || isNotNil(this.data.comments));
        if (this.disabled) {
            this.form.disable();
        }
        this.form.value = this.data || new Batch();
        // Compute the title
        this.computeTitle();
        if (!this.isNew) {
            // Update title each time value changes
            this.form.valueChanges.subscribe(batch => this.computeTitle(batch));
        }
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewCtrl.dismiss();
        });
    }
    close(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.loading)
                return; // avoid many call
            if (this.invalid) {
                if (this.debug)
                    AppFormUtils.logFormErrors(this.form.form, '[batch-modal] ');
                this.form.error = 'COMMON.FORM.HAS_ERROR';
                this.form.markAllAsTouched();
                return;
            }
            this.loading = true;
            // Save table content
            const data = this.form.value;
            yield this.viewCtrl.dismiss(data);
        });
    }
    /* -- protected methods -- */
    markForCheck() {
        this.cd.markForCheck();
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || this.data;
            if (this.isNew || !data) {
                this.$title.next(yield this.translate.get('TRIP.BATCH.NEW.TITLE').toPromise());
            }
            else {
                const label = BatchUtils.parentToString(data);
                this.$title.next(yield this.translate.get('TRIP.BATCH.EDIT.TITLE', { label }).toPromise());
            }
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Batch)
], BatchModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "showTaxonGroup", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "showTaxonName", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "showIndividualCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "showTotalIndividualCount", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "showSamplingBatch", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchModal.prototype, "showComment", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchModal.prototype, "maxVisibleButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", Number)
], BatchModal.prototype, "maxItemCountForButtons", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], BatchModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchModal.prototype, "samplingRatioFormat", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], BatchModal.prototype, "i18nSuffix", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], BatchModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], BatchModal.prototype, "onDelete", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", BatchForm)
], BatchModal.prototype, "form", void 0);
BatchModal = __decorate([
    Component({
        selector: 'app-batch-modal',
        templateUrl: './batch.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], BatchModal);
export { BatchModal };
//# sourceMappingURL=batch.modal.js.map