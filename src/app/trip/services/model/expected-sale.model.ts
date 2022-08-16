import {EntityClass, fromDateISOString, isNotEmptyArray, ReferentialRef, toDateISOString} from '@sumaris-net/ngx-components';
import {Moment} from 'moment';
import {DataEntity, DataEntityAsObjectOptions} from '@app/data/services/model/data-entity.model';
import {Measurement, MeasurementUtils} from './measurement.model';
import {IWithProductsEntity, Product} from './product.model';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";

@EntityClass({typename: 'ExpectedSaleVO'})
export class ExpectedSale extends DataEntity<ExpectedSale>
  implements IWithProductsEntity<ExpectedSale> {

  static fromObject: (source, opts?: any) => ExpectedSale;

  saleDate: Moment = null;
  saleLocation: ReferentialRef = null;
  saleType: ReferentialRef = null;
  landingId: number = null;
  tripId: number = null;
  measurements: Measurement[] = null;
  products: Product[] = null;

  constructor() {
    super(ExpectedSale.TYPENAME);
  }

  fromObject(source: any): ExpectedSale {
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

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.saleDate = toDateISOString(this.saleDate);
    target.saleLocation = this.saleLocation && this.saleLocation.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.saleType = this.saleType && this.saleType.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
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

}
