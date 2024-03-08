import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ImageAttachmentTestPage } from '@app/data/image/testing/image-attachment.test';
import { CoreModule } from '@sumaris-net/ngx-components';
import { AppImageAttachmentModule } from '@app/data/image/image-attachment.module';
let AppImageAttachmentTestingModule = class AppImageAttachmentTestingModule {
};
AppImageAttachmentTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            CoreModule,
            TranslateModule.forChild(),
            AppImageAttachmentModule
        ],
        declarations: [
            ImageAttachmentTestPage
        ],
        exports: [
            ImageAttachmentTestPage,
            TranslateModule
        ]
    })
], AppImageAttachmentTestingModule);
export { AppImageAttachmentTestingModule };
//# sourceMappingURL=image-attachment.testing.module.js.map