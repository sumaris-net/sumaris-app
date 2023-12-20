import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { ObservedLocationsPage } from './observed-locations.page';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppReferentialModule } from '@app/referential/referential.module';
import { AppObservedLocationOfflineModule } from '../offline/observed-location-offline.module';
let AppObservedLocationsTableModule = class AppObservedLocationsTableModule {
};
AppObservedLocationsTableModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            AppReferentialModule,
            AppDataModule,
            TranslateModule.forChild(),
            //AppReferentialModule,
            // Sub modules
            AppObservedLocationOfflineModule
        ],
        declarations: [
            ObservedLocationsPage
        ],
        exports: [
            // Components
            ObservedLocationsPage
        ]
    })
], AppObservedLocationsTableModule);
export { AppObservedLocationsTableModule };
//# sourceMappingURL=observed-location-table.module.js.map