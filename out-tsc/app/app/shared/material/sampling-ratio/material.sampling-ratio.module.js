import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { SharedModule } from '@sumaris-net/ngx-components';
import { MatSamplingRatioField } from '@app/shared/material/sampling-ratio/material.sampling-ratio';
let MatSamplingRatioFieldModule = class MatSamplingRatioFieldModule {
};
MatSamplingRatioFieldModule = __decorate([
    NgModule({
        imports: [
            SharedModule
        ],
        declarations: [
            MatSamplingRatioField
        ],
        exports: [
            MatSamplingRatioField
        ]
    })
], MatSamplingRatioFieldModule);
export { MatSamplingRatioFieldModule };
//# sourceMappingURL=material.sampling-ratio.module.js.map