var Product_1;
import { __decorate, __metadata } from "tslib";
import { EntityClass, equalsOrNil, isNil, isNotNil, isNotNilOrBlank, ReferentialRef, ReferentialUtils, } from '@sumaris-net/ngx-components';
import { DataEntity } from '@app/data/services/model/data-entity.model';
import { MeasurementValuesUtils, } from '@app/data/measurement/measurement.model';
import { Sample } from '../sample/sample.model';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { TaxonGroupRef } from '@app/referential/services/model/taxon-group.model';
export class ProductFilter extends DataEntityFilter {
    static fromParent(parent) {
        return ProductFilter.fromObject({ parent });
    }
    static fromObject(source) {
        if (!source || source instanceof ProductFilter)
            return source;
        const target = new ProductFilter();
        target.fromObject(source);
        return target;
    }
    fromObject(source, opts) {
        super.fromObject(source, opts);
        this.parent = source.parent;
    }
    buildFilter() {
        return [
            (p) => (!this.parent) || (p.parent && this.parent && this.parent.equals(p.parent))
        ];
    }
}
let Product = Product_1 = class Product extends DataEntity {
    constructor() {
        super(Product_1.TYPENAME);
        this.label = null;
        this.comments = null;
        this.rankOrder = null;
        this.individualCount = null;
        this.subgroupCount = null;
        this.taxonGroup = null;
        this.weight = null;
        this.saleType = null;
        this.measurementValues = {};
        this.saleProducts = [];
        this.samples = [];
        this.operationId = null;
        this.saleId = null;
        this.expectedSaleId = null;
        this.landingId = null;
        this.batchId = null;
    }
    static equals(p1, p2) {
        return p1 && p2 && ((isNotNil(p1.id) && p1.id === p2.id)
            // Or by functional attributes
            || (p1.rankOrder === p2.rankOrder
                // same operation
                && ((!p1.operationId && !p2.operationId) || p1.operationId === p2.operationId)
                // same taxon group
                && ReferentialUtils.equals(p1.taxonGroup, p2.taxonGroup)
                // same batch
                && ((isNil(p1.batchId) && isNil(p1.batchId)) || p1.batchId === p2.batchId)));
    }
    asObject(opts) {
        const target = super.asObject(opts);
        target.taxonGroup = this.taxonGroup && this.taxonGroup.asObject(Object.assign(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS), { keepEntityName: true })) || undefined;
        target.saleType = this.saleType && ReferentialRef.fromObject(this.saleType).asObject(Object.assign(Object.assign({}, opts), NOT_MINIFY_OPTIONS)) || undefined;
        target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);
        if (!opts || opts.minify !== true) {
            target.saleProducts = this.saleProducts && this.saleProducts.map(s => s.asObject(opts)) || [];
            target.samples = this.samples && this.samples.map(s => s.asObject(Object.assign(Object.assign({}, opts), { withChildren: false }))) || [];
        }
        else {
            delete target.saleProducts;
            delete target.samples;
        }
        delete target.parent;
        return target;
    }
    fromObject(source) {
        super.fromObject(source);
        this.label = source.label;
        this.comments = source.comments;
        this.rankOrder = +source.rankOrder;
        this.individualCount = isNotNilOrBlank(source.individualCount) ? parseInt(source.individualCount) : null;
        this.subgroupCount = isNotNilOrBlank(source.subgroupCount) ? parseFloat(source.subgroupCount) : null;
        this.taxonGroup = source.taxonGroup && TaxonGroupRef.fromObject(source.taxonGroup) || undefined;
        this.weight = source.weight || undefined;
        this.weightCalculated = source.weightCalculated || false;
        this.saleType = source.saleType && ReferentialRef.fromObject(source.saleType) || undefined;
        this.parent = source.parent;
        this.operationId = source.operationId;
        this.saleId = source.saleId;
        this.expectedSaleId = source.expectedSaleId;
        this.landingId = source.landingId;
        this.batchId = source.batchId;
        // Get all measurements values (by copy)
        this.measurementValues = source.measurementValues && Object.assign({}, source.measurementValues);
        this.saleProducts = source.saleProducts && source.saleProducts.map(saleProduct => Product_1.fromObject(saleProduct)) || [];
        this.samples = source.samples && source.samples.map(json => Sample.fromObject(json)) || [];
        return this;
    }
    /**
     * This equals function should also works with SaleProduct
     *
     * @param other
     */
    equals(other) {
        return (super.equals(other) && isNotNil(this.id))
            || (this.taxonGroup.equals(other.taxonGroup) && this.rankOrder === other.rankOrder
                && equalsOrNil(this.individualCount, other.individualCount) && equalsOrNil(this.weight, other.weight)
                && equalsOrNil(this.subgroupCount, other.subgroupCount) && ReferentialUtils.equals(this.saleType, other.saleType));
    }
};
Product = Product_1 = __decorate([
    EntityClass({ typename: 'ProductVO' }),
    __metadata("design:paramtypes", [])
], Product);
export { Product };
export class ProductUtils {
    static isSampleOfProduct(product, sample) {
        return product && sample
            && ((product.operationId === sample.operationId) || (product.parent && product.parent.id === sample.operationId))
            && product.taxonGroup && sample.taxonGroup
            && ReferentialUtils.equals(product.taxonGroup, sample.taxonGroup);
    }
}
//# sourceMappingURL=product.model.js.map