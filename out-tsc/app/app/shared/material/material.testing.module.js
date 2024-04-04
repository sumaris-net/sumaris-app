import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@sumaris-net/ngx-components';
import { TranslateModule } from '@ngx-translate/core';
import { AppSamplingRatioTestPage } from '@app/shared/material/sampling-ratio/testing/sampling-ratio.test';
import { MatSamplingRatioFieldModule } from '@app/shared/material/sampling-ratio/material.sampling-ratio.module';
export const MATERIAL_TESTING_PAGES = [
    { label: 'Sampling ratio field', page: '/testing/shared/material/samplingRatio' }
];
const routes = [
    {
        path: 'samplingRatio',
        pathMatch: 'full',
        component: AppSamplingRatioTestPage
    }
];
let AppSharedMaterialTestingModule = class AppSharedMaterialTestingModule {
};
AppSharedMaterialTestingModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            SharedModule,
            TranslateModule.forChild(),
            RouterModule.forChild(routes),
            MatSamplingRatioFieldModule
        ],
        declarations: [
            AppSamplingRatioTestPage
        ],
        exports: [
            AppSamplingRatioTestPage
        ]
    })
], AppSharedMaterialTestingModule);
export { AppSharedMaterialTestingModule };
//# sourceMappingURL=material.testing.module.js.map