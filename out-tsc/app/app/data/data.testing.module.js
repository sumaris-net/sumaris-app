import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ImageAttachmentTestPage } from '@app/data/image/testing/image-attachment.test';
import { AppImageAttachmentTestingModule } from '@app/data/image/testing/image-attachment.testing.module';
export const DATA_TESTING_PAGES = [
    { label: 'Data components', divider: true },
    { label: 'Image attachment', page: '/testing/data/image' }
];
const routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'image'
    },
    {
        path: 'image',
        pathMatch: 'full',
        component: ImageAttachmentTestPage
    }
];
let DataTestingModule = class DataTestingModule {
};
DataTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            // Sub modules
            AppImageAttachmentTestingModule
        ],
        exports: [
            RouterModule,
            // Sub modules
            AppImageAttachmentTestingModule
        ]
    })
], DataTestingModule);
export { DataTestingModule };
//# sourceMappingURL=data.testing.module.js.map