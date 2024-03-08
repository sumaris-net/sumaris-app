import { __awaiter, __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, ViewChild } from '@angular/core';
import { AppFormProvider, firstNotNilPromise, isNotNil, LocalSettingsService, round } from '@sumaris-net/ngx-components';
import { ProductsTable } from '../product/products.table';
import { MeasurementsForm } from '@app/data/measurement/measurements.form.component';
import { ExpectedSale } from '@app/trip/sale/expected-sale.model';
import { Product } from '@app/trip/product/product.model';
import { SaleProductUtils } from '@app/trip/sale/sale-product.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
let ExpectedSaleForm = class ExpectedSaleForm extends AppFormProvider {
    constructor(injector, settings, cd) {
        super(() => this.saleMeasurementsForm);
        this.injector = injector;
        this.settings = settings;
        this.cd = cd;
        this.debug = !environment.production;
        this.showError = false;
    }
    get value() {
        return this.getValue();
    }
    set value(data) {
        this.setValue(isNotNil(data) ? data : new ExpectedSale());
    }
    ngOnInit() {
        this.productsTable.disable(); // Readonly
    }
    setValue(data, opts) {
        this.data = data;
        this.saleMeasurementsForm.value = data.measurements || [];
        this.updateProducts(data.products);
    }
    getValue() {
        this.data.measurements = this.saleMeasurementsForm.value;
        this.data.products = null; // don't return readonly table value
        return this.data;
    }
    updateProducts(value) {
        return __awaiter(this, void 0, void 0, function* () {
            const pmfms = (yield firstNotNilPromise(this.productsTable.pmfms$)).map((pmfm) => DenormalizedPmfmStrategy.fromObject(pmfm));
            let products = (value || []).slice();
            this.totalPriceCalculated = 0;
            // compute prices
            products = products.map((product) => {
                const saleProduct = SaleProductUtils.productToSaleProduct(product, pmfms);
                SaleProductUtils.computeSaleProduct(product, saleProduct, (object, valueName) => !!object[valueName], (object, valueName) => object[valueName], (object, valueName, value) => (object[valueName] = round(value)), (object, valueName) => (object[valueName] = undefined), true, 'individualCount');
                const target = Object.assign(Object.assign({}, product), saleProduct);
                target.measurementValues = MeasurementValuesUtils.normalizeValuesToForm(target.measurementValues || {}, pmfms);
                // add measurements for each calculated or non calculated values
                MeasurementValuesUtils.setFormValue(target.measurementValues, pmfms, PmfmIds.AVERAGE_WEIGHT_PRICE, saleProduct.averageWeightPrice);
                MeasurementValuesUtils.setFormValue(target.measurementValues, pmfms, PmfmIds.AVERAGE_PACKAGING_PRICE, saleProduct.averagePackagingPrice);
                MeasurementValuesUtils.setFormValue(target.measurementValues, pmfms, PmfmIds.TOTAL_PRICE, saleProduct.totalPrice);
                this.totalPriceCalculated += saleProduct.totalPrice;
                return Product.fromObject(target);
            });
            if (this.totalPriceCalculated === 0)
                this.totalPriceCalculated = undefined;
            // populate table
            this.productsTable.value = products;
        });
    }
    markForCheck() {
        this.cd.markForCheck();
    }
};
__decorate([
    Input(),
    __metadata("design:type", String)
], ExpectedSaleForm.prototype, "programLabel", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], ExpectedSaleForm.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Boolean)
], ExpectedSaleForm.prototype, "mobile", void 0);
__decorate([
    ViewChild('saleMeasurementsForm', { static: true }),
    __metadata("design:type", MeasurementsForm)
], ExpectedSaleForm.prototype, "saleMeasurementsForm", void 0);
__decorate([
    ViewChild('productsTable', { static: true }),
    __metadata("design:type", ProductsTable)
], ExpectedSaleForm.prototype, "productsTable", void 0);
ExpectedSaleForm = __decorate([
    Component({
        selector: 'app-expected-sale-form',
        templateUrl: './expected-sale.form.html',
        styleUrls: ['./expected-sale.form.scss'],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector, LocalSettingsService, ChangeDetectorRef])
], ExpectedSaleForm);
export { ExpectedSaleForm };
//# sourceMappingURL=expected-sale.form.js.map