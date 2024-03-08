import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { PhysicalGearForm } from './physical-gear.form';
import { PhysicalGearTable } from './physical-gears.table';
import { PhysicalGearModal } from './physical-gear.modal';
import { AppReferentialModule } from '@app/referential/referential.module';
import { SelectPhysicalGearModal } from './select-physical-gear.modal';
import { AppDataModule } from '@app/data/data.module';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppCoreModule } from '@app/core/core.module';
import { VesselModule } from '@app/vessel/vessel.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
let AppPhysicalGearModule = class AppPhysicalGearModule {
    constructor() {
        console.debug('[physical-gear] Creating module...');
    }
};
AppPhysicalGearModule = __decorate([
    NgModule({
        imports: [
            CommonModule,
            TranslateModule.forChild(),
            // App module
            AppCoreModule,
            AppReferentialModule,
            AppDataModule,
            // Functional modules
            VesselModule,
            AppMeasurementModule
        ],
        declarations: [
            PhysicalGearTable,
            PhysicalGearForm,
            PhysicalGearModal,
            SelectPhysicalGearModal,
        ],
        exports: [
            // Modules
            TranslateModule,
            // Pipes
            // Components
            PhysicalGearTable,
            SelectPhysicalGearModal
        ]
    }),
    __metadata("design:paramtypes", [])
], AppPhysicalGearModule);
export { AppPhysicalGearModule };
//# sourceMappingURL=physical-gear.module.js.map