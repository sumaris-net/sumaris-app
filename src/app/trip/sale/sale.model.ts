import {
  EntityClass,
  fromDateISOString,
  IEntity,
  isNotEmptyArray,
  isNotNil,
  Person,
  ReferentialRef,
  toDateISOString,
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { DataEntityAsObjectOptions, MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE } from '@app/data/services/model/data-entity.model';
import { Measurement, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { IWithProductsEntity, Product } from '../product/product.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { Batch } from '@app/trip/batch/common/batch.model';
import { OperationAsObjectOptions } from '@app/trip/trip/trip.model';
import { SortDirection } from '@angular/material/sort';

export interface SaleAsObjectOptions extends DataEntityAsObjectOptions {
  batchAsTree?: boolean;
  keepLanding?: boolean; // Allow to keep landing, needed to apply filter on local storage
  keepTrip?: boolean; // Allow to keep trip, needed to apply filter on local storage
}

export interface SaleFromObjectOptions {
  withBatchTree?: boolean;
}

export const MINIFY_SALE_FOR_LOCAL_STORAGE = Object.freeze(<OperationAsObjectOptions>{
  ...MINIFY_DATA_ENTITY_FOR_LOCAL_STORAGE,
  batchAsTree: false,
  keepLanding: true, // Landing is needed to apply filter on it
  keepTrip: true, // Trip is needed to apply filter on it
});

@EntityClass({ typename: 'SaleVO' })
export class Sale extends DataRootVesselEntity<Sale, number, SaleAsObjectOptions, SaleFromObjectOptions> implements IWithProductsEntity<Sale> {
  static fromObject: (source: any, opts?: any) => Sale;

  static rankOrderComparator(sortDirection: SortDirection = 'asc'): (n1: Sale, n2: Sale) => number {
    return !sortDirection || sortDirection !== 'desc' ? Sale.sortByAscRankOrder : Sale.sortByDescRankOrder;
  }

  static sortByAscRankOrder(n1: Sale, n2: Sale): number {
    return n1.rankOrder === n2.rankOrder ? 0 : n1.rankOrder > n2.rankOrder ? 1 : -1;
  }

  static sortByDescRankOrder(n1: Sale, n2: Sale): number {
    return n1.rankOrder === n2.rankOrder ? 0 : n1.rankOrder > n2.rankOrder ? -1 : 1;
  }

  static sortByEndDateOrStartDate(n1: Sale, n2: Sale): number {
    const d1 = n1.endDateTime || n1.startDateTime;
    const d2 = n2.endDateTime || n2.startDateTime;
    return d1.isSame(d2) ? 0 : d1.isAfter(d2) ? 1 : -1;
  }

  startDateTime: Moment = null;
  endDateTime: Moment = null;
  saleLocation: ReferentialRef = null;
  saleType: ReferentialRef = null;
  measurements: Measurement[] = null;
  rankOrder: number = null;
  observers: Person[] = null;

  catchBatch: Batch = null;
  products: Product[] = null;
  fishingAreas: FishingArea[] = null;

  landingId: number = null;
  landing: IEntity<any> = null;
  tripId: number = null;
  trip: IEntity<any> = null;

  constructor() {
    super(Sale.TYPENAME);
  }

  fromObject(source: any, opts?: SaleFromObjectOptions) {
    super.fromObject(source);
    this.startDateTime = fromDateISOString(source.startDateTime);
    this.endDateTime = fromDateISOString(source.endDateTime);
    this.saleLocation = source.saleLocation && ReferentialRef.fromObject(source.saleLocation);
    this.saleType = source.saleType && ReferentialRef.fromObject(source.saleType);
    this.rankOrder = source.rankOrder;
    this.tripId = source.tripId;
    this.landingId = source.landingId;
    this.observers = (source.observers && source.observers.map(Person.fromObject)) || [];
    this.measurements = (source.measurements && source.measurements.map(Measurement.fromObject)) || [];
    this.fishingAreas = (source.fishingAreas && source.fishingAreas.map(FishingArea.fromObject)) || undefined;

    // Products (sale)
    this.products = (source.products && source.products.map(Product.fromObject)) || [];
    // Affect parent
    this.products.forEach((product) => {
      product.parent = this;
    });

    // Batches
    if (!opts || opts.withBatchTree !== false) {
      this.catchBatch =
        source.catchBatch && !source.batches
          ? // Reuse existing catch batch (useful for local entity)
            Batch.fromObject(source.catchBatch, { withChildren: true })
          : // Convert list to tree (useful when fetching from a pod)
            Batch.fromObjectArrayAsTree(source.batches);
    }
  }

  asObject(opts?: SaleAsObjectOptions): any {
    const target = super.asObject(opts);
    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.saleLocation = (this.saleLocation && this.saleLocation.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;
    target.saleType = (this.saleType && this.saleType.asObject({ ...opts, ...NOT_MINIFY_OPTIONS, keepLocalId: true })) || undefined; // #637 : handle negative SALE_TYPE ids
    target.observers = (this.observers && this.observers.map((o) => o.asObject(opts))) || undefined;
    target.measurements = (this.measurements && this.measurements.filter(MeasurementUtils.isNotEmpty).map((m) => m.asObject(opts))) || undefined;
    target.fishingAreas = (this.fishingAreas && this.fishingAreas.map((value) => value.asObject(opts))) || undefined;

    // Parent
    target.tripId = this.tripId;
    target.trip = this.trip?.asObject(opts) || undefined;
    target.landingId = this.landingId;
    target.landing = this.landing?.asObject(opts) || undefined;

    // Batch
    if (target.catchBatch) {
      // Serialize batches into a tree (will keep only children arrays, and removed parentId and parent)
      if (!opts || opts.batchAsTree !== false) {
        target.catchBatch =
          (this.catchBatch &&
            this.catchBatch.asObject({
              ...opts,
              withChildren: true,
            })) ||
          undefined;
      }
      // Serialize as batches array (this will fill parentId, and remove children and parent properties)
      else {
        target.batches = Batch.treeAsObjectArray(target.catchBatch, opts);
        delete target.catchBatch;
      }
    }

    // Products
    target.products = (this.products && this.products.map((o) => o.asObject(opts))) || undefined;
    // Affect parent link
    if (isNotEmptyArray(target.products)) {
      target.products.forEach((product) => {
        product.saleId = target.id;
        // todo product.landingId must also be set, but not here, see pod
        delete product.parent;
      });
    }

    // Clean properties copied from the parent landing (need by filter)
    if (!opts || opts.keepLanding !== true) {
      delete target.landing;
    }
    if (!opts || opts.keepTrip !== true) {
      delete target.trip;
    }

    return target;
  }

  equals(other: Sale): boolean {
    // Same Entity, by ID
    return (
      (isNotNil(this.id) && super.equals(other)) ||
      // Or same [trip, rankOrder]
      (isNotNil(this.tripId) && this.tripId === other.tripId && this.rankOrder === other.rankOrder) ||
      // Or same [landingId, rankOrder]
      (isNotNil(this.landingId) && this.landingId === other.landingId && this.rankOrder === other.rankOrder)
    );
  }
}
