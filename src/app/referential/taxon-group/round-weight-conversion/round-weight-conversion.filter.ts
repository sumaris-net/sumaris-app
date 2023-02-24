import { EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, fromDateISOString, IEntityFilter, isNil, isNotNil } from '@sumaris-net/ngx-components';
import { isMoment, Moment } from 'moment';
import { RoundWeightConversionRef } from '@app/referential/taxon-group/round-weight-conversion/round-weight-conversion.model';
import { isNonEmptyArray } from '@apollo/client/utilities';
import { StoreObject } from '@apollo/client/core';

@EntityClass({typename: 'RoundWeightConversionFilterVO'})
export class RoundWeightConversionFilter
  extends EntityFilter<RoundWeightConversionFilter, RoundWeightConversionRef, number, EntityAsObjectOptions>
  implements IEntityFilter<RoundWeightConversionFilter, RoundWeightConversionRef> {

  static fromObject: (source: any, opts?: any) => RoundWeightConversionFilter;

  date: Moment = null;
  statusIds: number[];

  taxonGroupId: number = null;
  taxonGroupIds: number[];

  locationId: number = null;
  locationIds: number[];

  dressingId: number = null;
  dressingIds: number[];

  preservingId: number = null;
  preservingIds: number[];

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.date = fromDateISOString(source.date);
    this.statusIds = source.statusIds;
    this.taxonGroupId = source.taxonGroupId;
    this.taxonGroupIds = source.taxonGroupIds;
    this.locationId = source.locationId;
    this.locationIds = source.locationIds;
    this.dressingId = source.dressingId;
    this.dressingIds = source.dressingIds;
    this.preservingId = source.preservingId;
    this.preservingIds = source.preservingIds;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      target.taxonGroupIds = isNotNil(this.taxonGroupId) ? [this.taxonGroupId] : this.taxonGroupIds;
      delete target.taxonGroupId;
      target.locationIds = isNotNil(this.locationId) ? [this.locationId] : this.locationIds;
      delete target.locationId;
      target.dressingIds = isNotNil(this.dressingId) ? [this.dressingId] : this.dressingIds;
      delete target.dressingId;
      target.preservingIds = isNotNil(this.preservingId) ? [this.preservingId] : this.preservingIds;
      delete target.preservingId;

    } else {
      target.taxonGroupId = this.taxonGroupId;
      target.taxonGroupIds = this.taxonGroupIds;
      target.locationId = this.locationId;
      target.locationIds = this.locationIds;
      target.dressingId = this.dressingId;
      target.dressingIds = this.dressingIds;
      target.preservingId = this.preservingId;
      target.preservingIds = this.preservingIds;
    }
    return target;
  }


  public buildFilter(): FilterFn<RoundWeightConversionRef>[] {
    const filterFns = super.buildFilter();

    // Sex
    const dressingId = this.dressingId;
    if (isNotNil(dressingId)) {
      filterFns.push(t => t.id === dressingId);
    }

    // Status
    const statusIds = this.statusIds;
    if (isNonEmptyArray(statusIds)) {
      filterFns.push(t => statusIds.includes(t.statusId));
    }

    // Location
    const locationId = this.locationId;
    if (isNotNil(locationId)) {
      filterFns.push(t => (t.locationId === locationId));
    }

    // Taxon group
    const taxonGroupId = this.taxonGroupId;
    if (isNotNil(taxonGroupId)) {
      filterFns.push(t => (t.taxonGroupId === taxonGroupId));
    }

    // Date
    if (this.date && isMoment(this.date)) {
      filterFns.push(t => this.date.isSameOrAfter(t.startDate) && (isNil(t.endDate) || this.date.isSameOrBefore(t.endDate)));
    }

    return filterFns;
  }
}
