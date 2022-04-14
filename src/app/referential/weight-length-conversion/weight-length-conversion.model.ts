import { Entity, EntityAsObjectOptions, EntityClass, fromDateISOString, IEntity, isNotNil, ReferentialRef, ReferentialUtils, toDateISOString, toNumber } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { StoreObject } from '@apollo/client/core';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export abstract class BaseWeightLengthConversion<T extends Entity<T>>
  extends Entity<T>
  implements IEntity<T> {

  year: number = null;
  startMonth: number = null;
  endMonth: number = null;
  conversionCoefficientA: number = null;
  conversionCoefficientB: number = null;

  referenceTaxonId: number = null;

  statusId: number = null;
  description: string = null;
  comments: string = null;
  creationDate: Moment = null;

  protected constructor(__typename: string) {
    super(__typename);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.year = source.year;
    this.startMonth = source.startMonth;
    this.endMonth = source.endMonth;
    this.conversionCoefficientA = source.conversionCoefficientA;
    this.conversionCoefficientB = source.conversionCoefficientB;
    this.referenceTaxonId = source.referenceTaxonId;
    this.description = source.description;
    this.comments = source.comments;

    this.statusId = source.statusId;
    this.creationDate = fromDateISOString(source.creationDate);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.creationDate = toDateISOString(this.creationDate);
    if (opts.minify) {
      // Convert statusId object into integer
      target.statusId = (typeof this.statusId === 'object') ? this.statusId['id'] : this.statusId;
    }
    return target;
  }

}


@EntityClass({typename: 'WeightLengthConversionVO'})
export class WeightLengthConversionRef
  extends BaseWeightLengthConversion<WeightLengthConversionRef> {

  static fromObject: (source: any, opts?: any) => WeightLengthConversionRef;

  locationId: number = null;

  lengthParameterId: number = null;
  lengthUnitId: number = null;
  lengthUnit: ReferentialRef = null;
  sexId: number = null;

  // Computed fields (on the pod):
  rectangleLabels: string[];
  lengthPmfmIds: number[] = null;

  constructor() {
    super(WeightLengthConversionRef.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.locationId = source.locationId;
    this.lengthParameterId = source.lengthParameterId;
    this.lengthUnitId = toNumber(source.lengthUnitId, source.lengthUnit?.id);
    this.lengthUnit = source.lengthUnit && ReferentialRef.fromObject(source.lengthUnit);
    this.sexId = source.sexId;

    this.rectangleLabels = source.rectangleLabels;
    this.lengthPmfmIds = source.lengthPmfmIds;
  }
}

@EntityClass({typename: 'WeightLengthConversionVO'})
export class WeightLengthConversion
  extends BaseWeightLengthConversion<WeightLengthConversion> {

  static fromObject: (source: any, opts?: any) => WeightLengthConversion;

  location: ReferentialRef = null;
  sex: ReferentialRef = null;
  lengthParameter: ReferentialRef = null;
  lengthUnit: ReferentialRef = null;

  constructor() {
    super(WeightLengthConversion.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.sex = source.sex && ReferentialRef.fromObject(source.sex);
    this.lengthParameter = source.lengthParameter && ReferentialRef.fromObject(source.lengthParameter);
    this.lengthUnit = source.lengthUnit && ReferentialRef.fromObject(source.lengthUnit);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);

    target.location = this.location && this.location.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.sex = this.sex && this.sex.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.lengthParameter = this.lengthParameter && this.lengthParameter.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.lengthUnit = this.lengthUnit && this.lengthUnit.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    return target;
  }

  equals(other: WeightLengthConversion): boolean {

    return (super.equals(other) && isNotNil(this.id)) ||
      // Function unique key
      ((this.referenceTaxonId === other.referenceTaxonId)
        && (this.year === other.year)
        && (this.startMonth === other.startMonth)
        && (this.endMonth === other.endMonth)
        && ReferentialUtils.equals(this.location, other.location)
        && ReferentialUtils.equals(this.sex, other.sex)
        && ReferentialUtils.equals(this.lengthParameter, other.lengthParameter)
        && ReferentialUtils.equals(this.lengthUnit, other.lengthUnit)
      );
  }
}
