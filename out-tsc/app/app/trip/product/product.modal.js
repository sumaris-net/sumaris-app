import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Alerts, isNil, LocalSettingsService, sleep, toBoolean } from '@sumaris-net/ngx-components';
import { AlertController, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { Product } from '@app/trip/product/product.model';
import { ProductForm } from '@app/trip/product/product.form';
let ProductModal = class ProductModal {
    constructor(injector, alertCtrl, modalCtrl, settings, translate, cd) {
        this.injector = injector;
        this.alertCtrl = alertCtrl;
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
        this._subscription = new Subscription();
        this.debug = false;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.PRODUCT;
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
        this.disabled = toBoolean(this.disabled, false);
        this.isNew = toBoolean(this.isNew, !this.data);
        this.data = this.data || new Product();
        this.load();
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.form.markAsReady();
                yield this.form.setValue(this.data);
                if (this.disabled) {
                    this.disable();
                }
                else {
                    this.enable();
                }
                // Compute the title
                yield this.computeTitle();
                if (!this.isNew) {
                    // Update title each time value changes
                    this.form.valueChanges.subscribe(product => this.computeTitle(product));
                }
            }
            catch (err) {
                const error = ((err === null || err === void 0 ? void 0 : err.message) || err);
                this.form.error = error;
                console.error(error);
            }
            finally {
                // Workaround to force form to be untouched, even if 'requiredIf' validator force controls as touched
                yield sleep(500);
                this.form.markAsUntouched();
                this.form.markAsPristine();
            }
        });
    }
    cancel(event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveIfDirtyAndConfirm(event);
            // Continue (if event not cancelled)
            if (!event.defaultPrevented) {
                yield this.modalCtrl.dismiss(undefined, undefined);
            }
        });
    }
    save(event, role) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.form.valid || this.loading)
                return false;
            this.loading = true;
            // Nothing to save: just leave
            if (!this.isNew && !this.form.dirty) {
                yield this.modalCtrl.dismiss(undefined, role);
                return false;
            }
            try {
                this.form.error = null;
                const product = this.form.value;
                return yield this.modalCtrl.dismiss(product, role);
            }
            catch (err) {
                this.loading = false;
                this.form.error = err && err.message || err;
                return false;
            }
        });
    }
    delete(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.onDelete)
                return; // Skip
            const result = yield this.onDelete(event, this.data);
            if (isNil(result) || (event && event.defaultPrevented))
                return; // User cancelled
            if (result) {
                yield this.modalCtrl.dismiss(this.data, 'delete');
            }
        });
    }
    /* -- protected methods -- */
    saveIfDirtyAndConfirm(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.form.dirty)
                return; // skip, if nothing to save
            const confirmation = yield Alerts.askSaveBeforeLeave(this.alertCtrl, this.translate, event);
            // User cancelled
            if (isNil(confirmation) || event && event.defaultPrevented) {
                return;
            }
            if (confirmation === false) {
                return;
            }
            // If user confirm: save
            const saved = yield this.save(event);
            // Error while saving: avoid to close
            if (!saved)
                event.preventDefault();
        });
    }
    computeTitle(data) {
        return __awaiter(this, void 0, void 0, function* () {
            data = data || this.data;
            if (this.isNew) {
                this.$title.next(yield this.translate.get('TRIP.PRODUCT.NEW.TITLE').toPromise());
            }
            else {
                this.$title.next(yield this.translate.get('TRIP.PRODUCT.EDIT.TITLE', { rankOrder: data.rankOrder }).toPromise());
            }
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], ProductModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ProductModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ProductModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ProductModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ProductModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductModal.prototype, "parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductModal.prototype, "parentAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", Product)
], ProductModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], ProductModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], ProductModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], ProductModal.prototype, "onDelete", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", ProductForm)
], ProductModal.prototype, "form", void 0);
ProductModal = __decorate([
    Component({
        selector: 'app-product-modal',
        templateUrl: 'product.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AlertController,
        ModalController,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], ProductModal);
export { ProductModal };
//# sourceMappingURL=product.modal.js.map