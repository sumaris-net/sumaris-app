import { EntityAsObjectOptions, EntityClass, IEntity, ReferentialRef, toDateISOString } from '@sumaris-net/ngx-components';
import { Entity } from '../../../../../ngx-sumaris-components/src/app/core/services/model/entity.model';
import { Moment } from 'moment';
import { fromDateISOString } from '../../../../../ngx-sumaris-components/src/app/shared/dates';
import { StoreObject } from '@apollo/client/core';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.model';

export abstract class BaseWeightLengthConversion<T extends Entity<T, number, EntityAsObjectOptions>>
  extends Entity<T, number, EntityAsObjectOptions>
  implements IEntity<T> {

  year: number = null;
  startMonth: number = null;
  endMonth: number = null;
  conversionCoefficientA: number = null;
  conversionCoefficientB: number = null;

  referenceTaxonId: number = null;

  statusId: number;
  description: string = null;
  comments: string = null;
  creationDate: Moment = null;

  protected constructor() {
    super(WeightLengthConversion.TYPENAME);
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
    return target;
  }
}


@EntityClass({typename: 'WeightLengthConversionVO'})
export class WeightLengthConversionRef
  extends BaseWeightLengthConversion<WeightLengthConversionRef> {

  static fromObject: (source: any, opts?: any) => WeightLengthConversionRef;

  locationId: number = null;
  sexId: number = null;
  lengthParameterId: number = null;
  lengthUnitId: number = null;

  constructor() {
    super();
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.locationId = source.locationId;
    this.sexId = source.sexId;
    this.lengthParameterId = source.lengthParameterId;
    this.lengthUnitId = source.lengthUnitId;
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
    super();
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

    target.location = this.location?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.sex = this.sex?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.lengthParameter = this.lengthParameter?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.lengthUnit = this.lengthUnit?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    return target;
  }
}
