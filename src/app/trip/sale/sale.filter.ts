import { EntityClass, FilterFn, isNotNil } from '@sumaris-net/ngx-components';
import { RootDataEntityFilter } from '@app/data/services/model/root-data-filter.model';
import { Sale } from '@app/trip/sale/sale.model';

@EntityClass({ typename: 'SaleFilterVO' })
export class SaleFilter extends RootDataEntityFilter<SaleFilter, Sale> {
  static fromObject: (source: any, opts?: any) => SaleFilter;

  tripId?: number;
  landingId?: number;

  fromObject(source: any) {
    super.fromObject(source);
    this.landingId = source.landingId;
    this.tripId = source.tripId;
  }

  buildFilter(): FilterFn<Sale>[] {
    const filterFns = super.buildFilter();

    if (isNotNil(this.tripId)) {
      filterFns.push((t) => t.tripId === this.tripId);
    }
    if (isNotNil(this.landingId)) {
      filterFns.push((t) => t.landingId === this.landingId);
    }

    return filterFns;
  }
}
