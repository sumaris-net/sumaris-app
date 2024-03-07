var Sale_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, fromDateISOString, isNotEmptyArray, isNotNil, Person, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { Sample } from '../sample/sample.model';
import { Measurement, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { Product } from '../product/product.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
let Sale = Sale_1 = class Sale extends DataRootVesselEntity {
    constructor() {
        super(Sale_1.TYPENAME);
        this.startDateTime = null;
        this.endDateTime = null;
        this.saleLocation = null;
        this.saleType = null;
        this.observedLocationId = null;
        this.tripId = null;
        this.measurements = null;
        this.samples = null;
        this.rankOrder = null;
        this.observers = null;
        this.products = null;
    }
    fromObject(source) {
        super.fromObject(source);
        this.startDateTime = fromDateISOString(source.startDateTime);
        this.endDateTime = fromDateISOString(source.endDateTime);
        this.saleLocation = source.saleLocation && ReferentialRef.fromObject(source.saleLocation);
        this.saleType = source.saleType && ReferentialRef.fromObject(source.saleType);
        this.rankOrder = source.rankOrder;
        this.tripId = source.tripId;
        this.observedLocationId = source.observedLocationId;
        this.samples = source.samples && source.samples.map(Sample.fromObject) || [];
        this.observers = source.observers && source.observers.map(Person.fromObject) || [];
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
        target.startDateTime = toDateISOString(this.startDateTime);
        target.endDateTime = toDateISOString(this.endDateTime);
        target.saleLocation = this.saleLocation && this.saleLocation.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.saleType = this.saleType && this.saleType.asObject(Object.assign(Object.assign({}, options), NOT_MINIFY_OPTIONS)) || undefined;
        target.samples = this.samples && this.samples.map(s => s.asObject(options)) || undefined;
        target.observers = this.observers && this.observers.map(o => o.asObject(options)) || undefined;
        target.measurements = this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map(m => m.asObject(options)) || undefined;
        // Products
        target.products = this.products && this.products.map(o => o.asObject(options)) || undefined;
        // Affect parent link
        if (isNotEmptyArray(target.products)) {
            target.products.forEach(product => {
                product.saleId = target.id;
                // todo product.landingId must also be set, but not here, see pod
                delete product.parent;
            });
        }
        return target;
    }
    equals(other) {
        // Same Entity, by ID
        return (isNotNil(this.id) && super.equals(other))
            // Or same [trip, rankOrder]
            || (isNotNil(this.tripId) && this.tripId === other.tripId && this.rankOrder === other.rankOrder)
            // Or same [observationLocation, rankOrder]
            || (isNotNil(this.observedLocationId) && this.observedLocationId === other.observedLocationId && this.rankOrder === other.rankOrder);
    }
};
Sale = Sale_1 = __decorate([
    EntityClass({ typename: 'SaleVO' }),
    __metadata("design:paramtypes", [])
], Sale);
export { Sale };
//# sourceMappingURL=sale.model.js.map