import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Injector, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, Subscription } from 'rxjs';
import { AppFormUtils, LocalSettingsService } from '@sumaris-net/ngx-components';
import { Packet } from '../packet/packet.model';
import { PacketSaleForm } from './packet-sale.form';
import { TranslateService } from '@ngx-translate/core';
let PacketSaleModal = class PacketSaleModal {
    constructor(injector, viewCtrl, translate) {
        this.viewCtrl = viewCtrl;
        this.translate = translate;
        this.loading = false;
        this.subscription = new Subscription();
        this.$title = new BehaviorSubject(null);
        this.mobile = injector.get(LocalSettingsService).mobile;
    }
    get enabled() {
        return this.packetSaleForm.enabled;
    }
    get valid() {
        var _a;
        return ((_a = this.packetSaleForm) === null || _a === void 0 ? void 0 : _a.valid) || false;
    }
    get invalid() {
        var _a;
        return ((_a = this.packetSaleForm) === null || _a === void 0 ? void 0 : _a.invalid) || false;
    }
    ngOnInit() {
        this.updateTitle();
        this.packetSaleForm.markAsReady();
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            yield this.packetSaleForm.setValue(Packet.fromObject(this.data));
            if (!this.disabled)
                this.enable();
        }));
    }
    updateTitle() {
        var _a;
        const title = this.translate.instant('PACKET.SALE.TITLE', { rankOrder: (_a = this.data) === null || _a === void 0 ? void 0 : _a.rankOrder });
        this.$title.next(title);
    }
    onSave(event) {
        return __awaiter(this, void 0, void 0, function* () {
            // Avoid multiple call
            if (this.disabled)
                return;
            yield AppFormUtils.waitWhilePending(this.packetSaleForm);
            if (this.packetSaleForm.invalid) {
                AppFormUtils.logFormErrors(this.packetSaleForm.form);
                this.packetSaleForm.markAllAsTouched({ emitEvent: true });
                return;
            }
            this.loading = true;
            try {
                const value = this.packetSaleForm.value;
                this.disable();
                yield this.viewCtrl.dismiss(value);
            }
            catch (err) {
                console.error(err);
                this.packetSaleForm.error = err && err.message || err;
                this.enable();
                this.loading = false;
            }
        });
    }
    disable() {
        this.disabled = true;
        this.packetSaleForm.disable();
    }
    enable() {
        this.disabled = false;
        this.packetSaleForm.enable();
    }
    cancel() {
        this.viewCtrl.dismiss();
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
};
__decorate([
    ViewChild('packetSaleForm', { static: true }),
    __metadata("design:type", PacketSaleForm)
], PacketSaleModal.prototype, "packetSaleForm", void 0);
__decorate([
    Input(),
    __metadata("design:type", Packet)
], PacketSaleModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketSaleModal.prototype, "mobile", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PacketSaleModal.prototype, "packetSalePmfms", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], PacketSaleModal.prototype, "disabled", void 0);
PacketSaleModal = __decorate([
    Component({
        selector: 'app-packet-sale-modal',
        templateUrl: './packet-sale.modal.html'
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        TranslateService])
], PacketSaleModal);
export { PacketSaleModal };
//# sourceMappingURL=packet-sale.modal.js.map