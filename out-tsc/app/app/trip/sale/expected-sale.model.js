var ExpectedSale_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, isNotEmptyArray, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { Measurement, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { Product } from '../product/product.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let ExpectedSale = ExpectedSale_1 = class ExpectedSale extends DataEntity {
    constructor() {
        super(ExpectedSale_1.TYPENAME);
        this.saleDate = null;
        this.saleLocation = null;
        this.saleType = null;
        this.landingId = null;
        this.tripId = null;
        this.measurements = null;
        this.products = null;
    }
    fromObject(source) {
        super.fromObject(source);
        this.saleDate = fromDateISOString(source.saleDate);
        this.saleLocation = source.saleLocation && ReferentialRef.fromObject(source.saleLocation);
        this.saleType = source.saleType && ReferentialRef.fromObject(source.saleType);
        this.tripId = source.tripId;
        this.landingId = source.landingId;
        this.measurements = source.measurements && source.measurements.map(Measurement.fromObject) || [];
        // Products (sale)
        this.products = source.products && source.products.map(Product.fromObject) || [];
        // Affect parent
        this.products.forEach(product => {
            product.parent = this;
        });
        return this;
    }
    asObject(options) {
        const target = super.asObject(options);
        target.saleDate = toDateISOString(this.saleDate);
        target.saleLocation = this.saleLocation && this.saleLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.saleType = this.saleType && this.saleType.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(options)) || undefined;
        // Products
        target.products = this.products && this.products.map(o => o.asObject(options)) || undefined;
        // Affect parent link
        if (isNotEmptyArray(target.products)) {
            target.products.forEach(product => {
                product.expectedSaleId = target.id;
                // todo product.landingId must also be set, but not here, see pod
                delete product.parent;
            });
        }
        return target;
    }
};
ExpectedSale = ExpectedSale_1 = __decorate([
    EntityClass({ typename: 'ExpectedSaleVO' }),
    __metadata("design:paramtypes", [])
], ExpectedSale);
export { ExpectedSale };
//# sourceMappingURL=expected-sale.model.js.map