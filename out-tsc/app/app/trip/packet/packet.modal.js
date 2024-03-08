import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { Packet } from './packet.model';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { PacketForm } from './packet.form';
import { AppFormUtils, isNil, LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '@environments/environment';
let PacketModal = class PacketModal {
    constructor(viewCtrl, translate, settings) {
        this.viewCtrl = viewCtrl;
        this.translate = translate;
        this.settings = settings;
        this.loading = false;
        this.subscription = new Subscription();
        this.$title = new BehaviorSubject(null);
        this.mobile = settings.mobile;
        this.debug = !environment.production;
    }
    get enabled() {
        return this.packetForm.enabled;
    }
    get valid() {
        var _a;
        return ((_a = this.packetForm) === null || _a === void 0 ? void 0 : _a.valid) || false;
    }
    get invalid() {
        var _a;
        return ((_a = this.packetForm) === null || _a === void 0 ? void 0 : _a.invalid) || false;
    }
    ngOnInit() {
        this.showParent = toBoolean(this.showParent, this.mobile);
        this.updateTitle();
        this.packetForm.markAsReady();
        setTimeout(() => {
            this.packetForm.setValue(this.data);
            if (!this.disabled)
                this.enable();
        });
    }
    updateTitle(data) {
        data = data || this.data;
        let title;
        if (this.isNew) {
            title = this.translate.instant('PACKET.COMPOSITION.NEW.TITLE');
        }
        else {
            title = this.translate.instant('PACKET.COMPOSITION.TITLE', { rankOrder: data.rankOrder });
        }
        this.$title.next(title);
    }
    onSave(event, role) {
        return __awaiter(this, void 0, void 0, function* () {
            // Avoid multiple call
            if (this.disabled || this.loading)
                return;
            yield AppFormUtils.waitWhilePending(this.packetForm);
            if (this.packetForm.invalid) {
                if (this.debug)
                    AppFormUtils.logFormErrors(this.packetForm.form);
                this.packetForm.markAllAsTouched();
                return;
            }
            this.loading = true;
            try {
                const value = this.packetForm.value;
                this.disable();
                const data = Packet.fromObject(value);
                this.packetForm.error = null;
                yield this.viewCtrl.dismiss(data, role);
            }
            catch (err) {
                this.packetForm.error = err && err.message || err;
                this.enable();
                this.loading = false;
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
                yield this.viewCtrl.dismiss(this.data, 'delete');
            }
        });
    }
    disable() {
        this.packetForm.disable();
    }
    enable() {
        this.packetForm.enable();
    }
    cancel() {
        this.viewCtrl.dismiss();
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
__decorate([
    ViewChild('form', { static: true }),
    __metadata("design:type", PacketForm)
], PacketModal.prototype, "packetForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Packet)
], PacketModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketModal.prototype, "showParent", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketModal.prototype, "isNew", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketModal.prototype, "parents", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketModal.prototype, "parentAttributes", void 0);
__decorate([
    Input(),
    __metadata("design:type", Function)
], PacketModal.prototype, "onDelete", void 0);
PacketModal = __decorate([
    Component({
        selector: 'app-packet-modal',
        templateUrl: './packet.modal.html'
    }),
    __metadata("design:paramtypes", [ModalController,
        TranslateService,
        LocalSettingsService])
], PacketModal);
export { PacketModal };
//# sourceMappingURL=packet.modal.js.map