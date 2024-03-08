import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ObservedLocationOfflineModal } from './observed-location-offline.modal';
import { AppCoreModule } from '@app/core/core.module';
let AppObservedLocationOfflineModule = class AppObservedLocationOfflineModule {
};
AppObservedLocationOfflineModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            TranslateModule.forChild(),
        ],
        declarations: [
            ObservedLocationOfflineModal
        ],
        exports: [
            ObservedLocationOfflineModal
        ]
    })
], AppObservedLocationOfflineModule);
export { AppObservedLocationOfflineModule };
//# sourceMappingURL=observed-location-offline.module.js.map