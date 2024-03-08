import { __awaiter, __decorate, __metadata } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LocalSettingsService, toBoolean } from '@sumaris-net/ngx-components';
import { TranscribingItemTable } from '@app/referential/transcribing/transcribing-item.table';
let TranscribingItemsModal = class TranscribingItemsModal {
    constructor(modalCtrl, settings) {
        this.modalCtrl = modalCtrl;
        this.settings = settings;
    }
    get loading() {
        var _a;
        return (_a = this.table) === null || _a === void 0 ? void 0 : _a.loading;
    }
    ngOnInit() {
        this.mobile = toBoolean(this.mobile, this.settings.mobile);
        this.table.value = this.data;
    }
    cancel() {
        this.modalCtrl.dismiss();
    }
    onSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return this.cancel();
            if (this.table.dirty) {
                const saved = yield this.table.save();
                if (!saved)
                    return; // Stop
            }
            this.data = this.table.value;
            return this.modalCtrl.dismiss(this.data);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], TranscribingItemsModal.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], TranscribingItemsModal.prototype, "data", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], TranscribingItemsModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], TranscribingItemsModal.prototype, "mobile", void 0);
__decorate([
    ViewChild('table', { static: true }),
    __metadata("design:type", TranscribingItemTable)
], TranscribingItemsModal.prototype, "table", void 0);
TranscribingItemsModal = __decorate([
    Component({
        selector: 'app-modal',
        templateUrl: './transcribing-items.modal.html',
        styleUrls: ['./transcribing-items.modal.scss']
    }),
    __metadata("design:paramtypes", [ModalController,
        LocalSettingsService])
], TranscribingItemsModal);
export { TranscribingItemsModal };
//# sourceMappingURL=transcribing-items.modal.js.map