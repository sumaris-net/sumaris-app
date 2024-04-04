import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SelectObservedLocationsModal } from '@app/trip/observedlocation/select-modal/select-observed-locations.modal';
import { AppObservedLocationsTableModule } from '@app/trip/observedlocation/table/observed-location-table.module';
import { AppObservedLocationFormModule } from '@app/trip/observedlocation/form/observed-location-form.module';
let AppSelectObservedLocationsModalModule = class AppSelectObservedLocationsModalModule {
};
AppSelectObservedLocationsModalModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            AppReferentialModule,
            AppDataModule,
            TranslateModule.forChild(),
            AppObservedLocationsTableModule,
            AppObservedLocationFormModule,
        ],
        declarations: [
            SelectObservedLocationsModal
        ],
        exports: [
            // Components
            SelectObservedLocationsModal
        ]
    })
], AppSelectObservedLocationsModalModule);
export { AppSelectObservedLocationsModalModule };
//# sourceMappingURL=select-observed-locations.module.js.map