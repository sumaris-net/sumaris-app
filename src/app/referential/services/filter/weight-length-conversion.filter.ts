import { EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, fromDateISOString, IEntityFilter, isNotNil } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { WeightLengthConversionRef } from '@app/referential/weight-length-conversion/weight-length-conversion.model';
import { isNonEmptyArray } from '@apollo/client/utilities';
import { StoreObject } from '@apollo/client/core';

@EntityClass({typename: 'WeightLengthConversionFilterVO'})
export class WeightLengthConversionFilter
  extends EntityFilter<WeightLengthConversionFilter, WeightLengthConversionRef, number, EntityAsObjectOptions>
  implements IEntityFilter<WeightLengthConversionFilter, WeightLengthConversionRef> {

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

  lengthPmfmId: number = null;
  lengthPmfmIds?: number[];

  rectangleLabel: string = null;
  rectangleLabels?: string[];

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
    this.lengthPmfmId = source.lengthPmfmId;
    this.lengthPmfmIds = source.lengthPmfmIds;
    this.rectangleLabel = source.rectangleLabel;
    this.rectangleLabels = source.rectangleLabels;
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
      target.lengthPmfmIds = isNotNil(this.lengthPmfmId) ? [this.lengthPmfmId] : this.lengthPmfmIds;
      delete target.lengthPmfmId;
      target.rectangleLabels = isNotNil(this.rectangleLabel) ? [this.rectangleLabel] : this.rectangleLabels;
      delete target.rectangleLabel;
    }
    return target;
  }

  public buildFilter(): FilterFn<WeightLengthConversionRef>[] {
    const filterFns = super.buildFilter();

    // Year
    const year = this.year;
    if (isNotNil(year)) {
      filterFns.push(t => t.year === year);
    }

    // Month
    const month = this.month;
    if (isNotNil(month)) {
      filterFns.push(t => (t.startMonth <= month) && (month <= t.endMonth));
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

    // Reference Taxon
    const referenceTaxonId = this.referenceTaxonId;
    if (isNotNil(referenceTaxonId)) {
      filterFns.push(t => (t.referenceTaxonId === referenceTaxonId));
    }

    // Rectangle
    const rectangleLabel = this.rectangleLabel;
    if (isNotNil(rectangleLabel)) {
      filterFns.push(t => (t.rectangleLabels?.includes(rectangleLabel)));
    }

    // Length Pmfm
    const lengthPmfmId = this.lengthPmfmId;
    if (isNotNil(lengthPmfmId)) {
      filterFns.push(t => (t.lengthPmfmIds?.includes(lengthPmfmId)));
    }

    // Sex
    const sexId = this.sexId;
    if (isNotNil(sexId)) {
      filterFns.push(t => t.id === sexId);
    }

    return filterFns;
  }
}
