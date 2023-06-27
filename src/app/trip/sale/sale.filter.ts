import {EntityClass, FilterFn, isNotNil} from "@sumaris-net/ngx-components";
import {RootDataEntityFilter} from "@app/data/services/model/root-data-filter.model";
import {Sale} from "@app/trip/sale/sale.model";

@EntityClass({typename: 'SaleFilterVO'})
export class SaleFilter extends RootDataEntityFilter<SaleFilter, Sale> {

    static fromObject: (source: any, opts?: any) => SaleFilter;

    observedLocationId?: number;
    tripId?: number;

    fromObject(source: any) {
        super.fromObject(source);
        this.observedLocationId = source.observedLocationId;
        this.tripId = source.tripId;
    }

    buildFilter(): FilterFn<Sale>[] {
      const filterFns = super.buildFilter();

      if (isNotNil(this.observedLocationId)) {
          filterFns.push(t => t.observedLocationId === this.observedLocationId);
      }
      if (isNotNil(this.tripId)) {
          filterFns.push(t => t.tripId === this.tripId);
      }

      return filterFns;
    }
}
