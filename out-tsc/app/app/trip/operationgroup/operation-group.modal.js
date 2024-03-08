import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { Alerts, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { AlertController, ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { OperationGroup } from '@app/trip/trip/trip.model';
import { OperationGroupForm } from '@app/trip/operationgroup/operation-group.form';
let OperationGroupModal = class OperationGroupModal {
    constructor(injector, alertCtrl, modalCtrl, settings, translate, cd) {
        this.injector = injector;
        this.alertCtrl = alertCtrl;
        this.modalCtrl = modalCtrl;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
        this._subscription = new Subscription();
        this.debug = !environment.production;
        this.loading = false;
        this.$title = new BehaviorSubject(undefined);
        this.mobile = this.settings.mobile;
        // Default value
        this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;
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
        this.isNew = toBoolean(this.isNew, !this.data);
        this.data = this.data || new OperationGroup();
        this.form.setValue(this.data);
        this.disabled = toBoolean(this.disabled, false);
        if (this.disabled) {
            this.disable();
        }
        else {
            this.enable();
        }
        // Compute the title
        this.computeTitle();
        this.form.markAsReady();
        if (!this.isNew) {
            // Update title each time value changes
            this.form.valueChanges.subscribe(operationGroup => this.computeTitle(operationGroup));
        }
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    cancel(event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveIfDirtyAndConfirm(event);
            // Continue (if event not cancelled)
            if (!event.defaultPrevented) {
                yield this.modalCtrl.dismiss();
            }
        });
    }
    save(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.form.valid || this.loading)
                return false;
            this.loading = true;
            // Nothing to save: just leave
            if (!this.isNew && !this.form.dirty) {
                yield this.modalCtrl.dismiss();
                return false;
            }
            try {
                this.form.error = null;
                const operationGroup = this.form.value;
                if (operationGroup.metier && !operationGroup.metier.taxonGroup) {
                    operationGroup.metier.taxonGroup = this.form.metier.taxonGroup;
                }
                if (operationGroup.metier && !operationGroup.metier.gear) {
                    operationGroup.metier.gear = this.form.metier.gear;
                }
                return yield this.modalCtrl.dismiss(operationGroup);
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
                this.$title.next(yield this.translate.get('TRIP.OPERATION_GROUP.NEW.TITLE').toPromise());
            }
            else {
                this.$title.next(yield this.translate.get('TRIP.OPERATION_GROUP.EDIT.TITLE', this.data).toPromise());
            }
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationGroupModal.prototype, "acquisitionLevel", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationGroupModal.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], OperationGroupModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], OperationGroupModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", OperationGroup)
], OperationGroupModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], OperationGroupModal.prototype, "pmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], OperationGroupModal.prototype, "usageMode", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], OperationGroupModal.prototype, "onDelete", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], OperationGroupModal.prototype, "metiers", void 0);
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", OperationGroupForm)
], OperationGroupModal.prototype, "form", void 0);
OperationGroupModal = __decorate([
    Component({
        selector: 'app-operation-group-modal',
        templateUrl: 'operation-group.modal.html',
        changeDetection: ChangeDetectionStrategy.OnPush
    }),
    __metadata("design:paramtypes", [Injector,
        AlertController,
        ModalController,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], OperationGroupModal);
export { OperationGroupModal };
//# sourceMappingURL=operation-group.modal.js.map