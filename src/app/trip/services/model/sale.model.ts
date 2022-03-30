import { EntityClass, fromDateISOString, isNotEmptyArray, isNotNil, Person, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import {Moment} from 'moment';
import {DataEntityAsObjectOptions} from '../../../data/services/model/data-entity.model';
import {Sample} from './sample.model';
import {Measurement, MeasurementUtils} from './measurement.model';
import {IWithProductsEntity, Product} from './product.model';
import {DataRootVesselEntity} from '../../../data/services/model/root-vessel-entity.model';
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";

@EntityClass({typename: 'SaleVO'})
export class Sale extends DataRootVesselEntity<Sale>
  implements IWithProductsEntity<Sale> {

  static fromObject: (source, opts?: any) => Sale;

  startDateTime: Moment = null;
  endDateTime: Moment = null;
  saleLocation: ReferentialRef = null;
  saleType: ReferentialRef = null;
  observedLocationId: number = null;
  tripId: number = null;
  measurements: Measurement[] = null;
  samples: Sample[] = null;
  rankOrder: number = null;
  observers: Person[] = null;
  products: Product[] = null;

  constructor() {
    super(Sale.TYPENAME);
  }

  fromObject(source: any): Sale {
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

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.saleLocation = this.saleLocation && this.saleLocation.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.saleType = this.saleType && this.saleType.asObject({...options, ...NOT_MINIFY_OPTIONS}) || undefined;
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

  equals(other: Sale): boolean {
    // Same Entity, by ID
    return (isNotNil(this.id) && super.equals(other))
      // Or same [trip, rankOrder]
      || (isNotNil(this.tripId) && this.tripId === other.tripId && this.rankOrder === other.rankOrder)
      // Or same [observationLocation, rankOrder]
      || (isNotNil(this.observedLocationId) && this.observedLocationId === other.observedLocationId && this.rankOrder === other.rankOrder)
      ;
  }

}
