import { __decorate, __metadata } from "tslib";
import { NgModule } from '@angular/core';
import { ExpectedSaleForm } from './expected-sale.form';
import { ProductSaleForm } from './product-sale.form';
import { ProductSaleModal } from './product-sale.modal';
import { PacketSaleModal } from './packet-sale.modal';
import { PacketSaleForm } from './packet-sale.form';
import { TranslateModule } from '@ngx-translate/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppMeasurementModule } from '@app/data/measurement/measurement.module';
import { SaleForm } from '@app/trip/sale/sale.form';
import { AppProductModule } from '@app/trip/product/product.module';
let AppSaleModule = class AppSaleModule {
    constructor() {
        console.debug('[sale] Creating module...');
    }
};
AppSaleModule = __decorate([
    NgModule({
        imports: [
            AppCoreModule,
            TranslateModule.forChild(),
            // Functional modules
            AppMeasurementModule,
            AppProductModule
        ],
        declarations: [
            SaleForm,
            ProductSaleForm,
            ProductSaleModal,
            ExpectedSaleForm,
            PacketSaleForm,
            PacketSaleModal
        ],
        exports: [
            // Components
            SaleForm,
            ProductSaleForm,
            ProductSaleModal,
            ExpectedSaleForm,
            PacketSaleForm,
            PacketSaleModal
        ]
    }),
    __metadata("design:paramtypes", [])
], AppSaleModule);
export { AppSaleModule };
//# sourceMappingURL=sale.module.js.map