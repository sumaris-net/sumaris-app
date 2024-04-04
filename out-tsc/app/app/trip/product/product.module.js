import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { ProductsTable } from './products.table';
import { TranslateModule } from '@ngx-translate/core';
import { ProductForm } from './product.form';
import { ProductModal } from './product.modal';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { AppReferentialModule } from '@app/referential/referential.module';
let AppProductModule = class AppProductModule {
    constructor() {
        console.debug('[product] Creating module...');
    }
};
AppProductModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            AppDataModule,
            TranslateModule.forChild(),
            // Functional modules
            AppReferentialModule,
            AppMeasurementModule
        ],
        declarations: [
            ProductsTable,
            ProductModal,
            ProductForm
        ],
        exports: [
            // Components
            ProductsTable
        ]
    }),
    __metadata("design:paramtypes", [])
], AppProductModule);
export { AppProductModule };
//# sourceMappingURL=product.module.js.map