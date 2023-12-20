import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { FishingAreaForm } from './fishing-area.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppSharedModule } from '@app/shared/shared.module';
let AppFishingAreaModule = class AppFishingAreaModule {
    constructor() {
        console.debug('[fishing-area] Creating module...');
    }
};
AppFishingAreaModule = __decorate([
    NgModule({
        imports: [
            AppSharedModule,
            TranslateModule.forChild()
        ],
        declarations: [
            FishingAreaForm
        ],
        exports: [
            // Components
            FishingAreaForm
        ]
    }),
    __metadata("design:paramtypes", [])
], AppFishingAreaModule);
export { AppFishingAreaModule };
//# sourceMappingURL=fishing-area.module.js.map