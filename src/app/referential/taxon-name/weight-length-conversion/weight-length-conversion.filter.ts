import { EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, IEntityFilter, isNotEmptyArray, isNotNil } from '@sumaris-net/ngx-components';
import { WeightLengthConversion } from '@app/referential/taxon-name/weight-length-conversion/weight-length-conversion.model';
import { StoreObject } from '@apollo/client/core';

@EntityClass({ typename: 'WeightLengthConversionFilterVO' })
export class WeightLengthConversionFilter
  extends EntityFilter<WeightLengthConversionFilter, WeightLengthConversion>
  implements IEntityFilter<WeightLengthConversionFilter, WeightLengthConversion>
{
  static fromObject: (source: any, opts?: any) => WeightLengthConversionFilter;

  month: number = null;
  year: number = null;
  statusIds: number[];

  referenceTaxonId: number = null;
  referenceTaxonIds: number[];

  locationId: number = null;
  locationIds: number[];

  sexId: number = null;
  sexIds: number[];

  lengthParameterId: number = null;
  lengthParameterIds: number[];
  lengthUnitId: number = null;
  lengthUnitIds: number[];

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.month = source.month;
    this.year = source.year;
    this.statusIds = source.statusIds;
    this.referenceTaxonId = source.referenceTaxonId;
    this.referenceTaxonIds = source.referenceTaxonIds;
    this.locationId = source.locationId;
    this.locationIds = source.locationIds;
    this.lengthParameterId = source.lengthParameterId;
    this.lengthParameterIds = source.lengthParameterIds;
    this.lengthUnitId = source.lengthUnitId;
    this.lengthUnitIds = source.lengthUnitIds;
    this.sexId = source.sexId;
    this.sexIds = source.sexIds;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    if (opts && opts.minify) {
      target.referenceTaxonIds = isNotNil(this.referenceTaxonId) ? [this.referenceTaxonId] : this.referenceTaxonIds;
      delete target.referenceTaxonId;
      target.locationIds = isNotNil(this.locationId) ? [this.locationId] : this.locationIds;
      delete target.locationId;
      target.sexIds = isNotNil(this.sexId) ? [this.sexId] : this.sexIds;
      delete target.sexId;
      target.lengthParameterIds = isNotNil(this.lengthParameterId) ? [this.lengthParameterId] : this.lengthParameterIds;
      delete target.lengthParameterId;
      target.lengthUnitIds = isNotNil(this.lengthUnitId) ? [this.lengthUnitId] : this.lengthUnitIds;
      delete target.lengthUnitId;
    }
    return target;
  }

  public buildFilter(): FilterFn<WeightLengthConversion>[] {
    const filterFns = super.buildFilter();

    // Year
    const year = this.year;
    if (isNotNil(year)) {
      filterFns.push((t) => t.year === year);
    }

    // Month
    const month = this.month;
    if (isNotNil(month)) {
      filterFns.push((t) => t.startMonth <= month && month <= t.endMonth);
    }

    // Status
    const statusIds = this.statusIds;
    if (isNotEmptyArray(statusIds)) {
      filterFns.push((t) => statusIds.includes(t.statusId));
    }

    // Location
    const locationIds = isNotNil(this.locationId) ? [this.locationId] : this.locationIds;
    if (isNotEmptyArray(locationIds)) {
      filterFns.push((t) => isNotNil(t.location?.id) && locationIds.includes(t.location?.id));
    }

    // Reference Taxon
    const referenceTaxonIds = isNotNil(this.referenceTaxonId) ? [this.referenceTaxonId] : this.referenceTaxonIds;
    if (isNotEmptyArray(referenceTaxonIds)) {
      filterFns.push((t) => isNotNil(t.referenceTaxonId) && referenceTaxonIds.includes(t.referenceTaxonId));
    }

    // Length parameter
    const lengthParameterIds = isNotNil(this.lengthParameterId) ? [this.lengthParameterId] : this.lengthParameterIds;
    if (isNotEmptyArray(lengthParameterIds)) {
      filterFns.push((t) => isNotNil(t.lengthParameter?.id) && lengthParameterIds.includes(t.lengthParameter.id));
    }

    // Length unit
    const lengthUnitIds = isNotNil(this.lengthUnitId) ? [this.lengthUnitId] : this.lengthUnitIds;
    if (isNotEmptyArray(lengthUnitIds)) {
      filterFns.push((t) => isNotNil(t.lengthUnit?.id) && lengthUnitIds.includes(t.lengthUnit.id));
    }

    // Sex
    const sexIds = isNotNil(this.sexId) ? [this.sexId] : this.sexIds;
    if (isNotEmptyArray(sexIds)) {
      filterFns.push((t) => isNotNil(t.sex?.id) && sexIds.includes(t.sex.id));
    }

    return filterFns;
  }
}
