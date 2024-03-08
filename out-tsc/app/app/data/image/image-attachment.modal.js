import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Component, Inject, Input, Self, ViewChild } from '@angular/core';
import { APP_IMAGE_ATTACHMENT_SERVICE } from './image-attachment.service';
import { ImageAttachment, ImageAttachmentFilter } from './image-attachment.model';
import { Subscription } from 'rxjs';
import { ModalController } from '@ionic/angular';
import { EntityUtils, InMemoryEntitiesService, toBoolean } from '@sumaris-net/ngx-components';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';
let AppImageAttachmentsModal = class AppImageAttachmentsModal {
    constructor(modalCtrl, dataService) {
        this.modalCtrl = modalCtrl;
        this.dataService = dataService;
        this._subscription = new Subscription();
        this.title = '';
    }
    get loading() {
        return false;
    }
    get invalid() {
        return false;
    }
    get valid() {
        return !this.invalid;
    }
    ngOnInit() {
        // Default values
        this.disabled = toBoolean(this.disabled, false);
        // Set value
        this.gallery.markAsReady();
        this.gallery.value = this.data;
    }
    ngOnDestroy() {
        this._subscription.unsubscribe();
    }
    cancel(event) {
        this.modalCtrl.dismiss();
    }
    close(event) {
        this.cancel(event);
    }
    onSubmit(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disabled)
                return this.cancel();
            if (this.gallery.dirty) {
                const saved = yield this.gallery.save();
                if (!saved)
                    return; // Stop
            }
            this.data = this.gallery.value;
            return this.modalCtrl.dismiss(this.data);
        });
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], AppImageAttachmentsModal.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], AppImageAttachmentsModal.prototype, "disabled", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], AppImageAttachmentsModal.prototype, "data", void 0);
__decorate([
    ViewChild('gallery', { static: true }),
    __metadata("design:type", AppImageAttachmentGallery)
], AppImageAttachmentsModal.prototype, "gallery", void 0);
AppImageAttachmentsModal = __decorate([
    Component({
        selector: 'app-image-attachment-modal',
        templateUrl: './image-attachment.modal.html',
        styleUrls: ['./image-attachment.modal.scss'],
        providers: [
            {
                provide: APP_IMAGE_ATTACHMENT_SERVICE,
                useFactory: () => new InMemoryEntitiesService(ImageAttachment, ImageAttachmentFilter, {
                    equals: EntityUtils.equals
                })
            }
        ]
    }),
    __param(1, Self()),
    __param(1, Inject(APP_IMAGE_ATTACHMENT_SERVICE)),
    __metadata("design:paramtypes", [ModalController,
        InMemoryEntitiesService])
], AppImageAttachmentsModal);
export { AppImageAttachmentsModal };
//# sourceMappingURL=image-attachment.modal.js.map