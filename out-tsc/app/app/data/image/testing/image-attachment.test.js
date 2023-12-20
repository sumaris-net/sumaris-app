import { __decorate, __metadata } from "tslib";
import { Component, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';
let ImageAttachmentTestPage = class ImageAttachmentTestPage {
    constructor() {
    }
    ngOnInit() {
    }
    applyExample() {
    }
};
__decorate([
    ViewChild('mobileGallery'),
    __metadata("design:type", AppImageAttachmentGallery)
], ImageAttachmentTestPage.prototype, "mobileGallery", void 0);
__decorate([
    ViewChild('tabGroup'),
    __metadata("design:type", MatTabGroup)
], ImageAttachmentTestPage.prototype, "tabGroup", void 0);
ImageAttachmentTestPage = __decorate([
    Component({
        selector: 'app-image-attachment-test',
        templateUrl: './image-attachment.test.html',
        styleUrls: ['./image-attachment.test.scss']
    }),
    __metadata("design:paramtypes", [])
], ImageAttachmentTestPage);
export { ImageAttachmentTestPage };
//# sourceMappingURL=image-attachment.test.js.map