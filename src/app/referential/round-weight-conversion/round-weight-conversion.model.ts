import {
  DateUtils,
  Entity,
  EntityAsObjectOptions,
  EntityClass,
  fromDateISOString,
  IEntity,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
  toFloat,
  toInt
} from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { StoreObject } from '@apollo/client/core';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export abstract class BaseRoundWeightConversion<T extends Entity<T>>
  extends Entity<T>
  implements IEntity<T> {

  startDate: Moment = null;
  endDate: Moment = null;
  conversionCoefficient: number = null;

  taxonGroupId: number = null;

  statusId: number = null;
  description: string = null;
  comments: string = null;
  creationDate: Moment = null;

  protected constructor(__typename: string) {
    super(__typename);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    // WARN: round to hour, because CSV import can have +1 second (e.g. local time '01/01/1970' can become '01/01/1970 00:00:01')
    this.startDate = fromDateISOString(source.startDate)?.startOf('day');
    this.endDate = fromDateISOString(source.endDate)?.startOf('day');
    this.conversionCoefficient = toFloat(source.conversionCoefficient);
    this.taxonGroupId = toInt(source.taxonGroupId);
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


@EntityClass({typename: 'RoundWeightConversionVO'})
export class RoundWeightConversionRef
  extends BaseRoundWeightConversion<RoundWeightConversionRef> {

  static fromObject: (source: any, opts?: any) => RoundWeightConversionRef;

  locationId: number = null;
  dressingId: number = null;
  preservingId: number = null;

  constructor() {
    super(RoundWeightConversionRef.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.locationId = source.locationId;
    this.dressingId = source.dressingId;
    this.preservingId = source.preservingId;
  }
}

@EntityClass({typename: 'RoundWeightConversionVO'})
export class RoundWeightConversion
  extends BaseRoundWeightConversion<RoundWeightConversion> {

  static fromObject: (source: any, opts?: any) => RoundWeightConversion;

  location: ReferentialRef = null;
  dressing: ReferentialRef = null;
  preserving: ReferentialRef = null;

  constructor() {
    super(RoundWeightConversion.TYPENAME);
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);

    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.dressing = source.dressing && ReferentialRef.fromObject(source.dressing);
    this.preserving = source.preserving && ReferentialRef.fromObject(source.preserving);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);

    target.location = this.location?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.dressing = this.dressing?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
    target.preserving = this.preserving?.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;

    if (opts.minify) {

    }
    return target;
  }

  equals(other: RoundWeightConversion): boolean {

    // -- DEV only
    /*if (this.conversionCoefficient !== other.conversionCoefficient) console.debug('DIFF conversionCoefficient');
    if (!DateUtils.isSame(this.startDate, other.startDate)) console.debug('DIFF startDate');
    if (!DateUtils.isSame(this.endDate, other.endDate)) console.debug('DIFF endDate');
    if (!ReferentialUtils.equals(this.location, other.location)) console.debug('DIFF location');
    if (!ReferentialUtils.equals(this.dressing, other.dressing)) console.debug('DIFF dressing');
    if (!ReferentialUtils.equals(this.preserving, other.preserving)) console.debug('DIFF preserving');*/

    return (super.equals(other) && isNotNil(this.id)) ||
      // Functional unique key
      ((this.taxonGroupId === other.taxonGroupId)
        && DateUtils.isSame(this.startDate, other.startDate)
        && ReferentialUtils.equals(this.location, other.location)
        && ReferentialUtils.equals(this.dressing, other.dressing)
        && ReferentialUtils.equals(this.preserving, other.preserving)
      );
  }
}
