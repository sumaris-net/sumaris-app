import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { Moment } from 'moment';
import { MeasurementFormValues, MeasurementModelValues, MeasurementValuesUtils } from '@app/data/measurement/measurement.model';
import { Sample } from '../sample/sample.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { fillRankOrder, IWithObserversEntity } from '@app/data/services/model/model.utils';
import {
  DateUtils,
  EntityClass,
  EntityClasses,
  fromDateISOString,
  IEntity,
  isNotNil,
  isNotNilOrBlank,
  Person,
  ReferentialAsObjectOptions,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString,
  toNumber,
} from '@sumaris-net/ngx-components';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { Strategy } from '@app/referential/services/model/strategy.model';

/**
 * Landing entity
 */
@EntityClass({ typename: 'LandingVO' })
export class Landing extends DataRootVesselEntity<Landing> implements IWithObserversEntity<Landing> {
  static fromObject: (source: any, opts?: any) => Landing;

  static isDivider(source: any | Landing) {
    return source?.__typename === 'divider';
  }

  strategy: ReferentialRef = null;
  dateTime: Moment = null;
  location: ReferentialRef = null;
  rankOrder?: number = null;
  rankOrderOnVessel?: number = null;
  measurementValues: MeasurementModelValues | MeasurementFormValues = null;

  // Parent entity
  tripId: number = null;
  trip: IEntity<any> = null;
  observedLocationId: number = null;
  observedLocation: IEntity<any> = null;

  observers: Person[] = null;
  samples: Sample[] = null;
  samplesCount?: number = null;

  saleIds: number[] = null;

  constructor() {
    super(Landing.TYPENAME);
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.location =
      (this.location && this.location.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*keep for list*/ } as ReferentialAsObjectOptions)) || undefined;
    target.observers = (this.observers && this.observers.map((p) => p && p.asObject(opts))) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);

    target.rankOrder = this.rankOrderOnVessel; // this.rankOrder is not persisted

    // Parent
    target.tripId = this.tripId;
    target.trip = this.trip?.asObject(opts) || undefined;
    target.observedLocationId = this.observedLocationId;
    target.observedLocation = this.observedLocation?.asObject(opts) || undefined;

    // Samples
    target.samples = (this.samples && this.samples.map((s) => s.asObject(opts))) || undefined;
    target.samplesCount =
      (this.samples && this.samples.filter((s) => s.measurementValues && isNotNilOrBlank(s.measurementValues[PmfmIds.TAG_ID])).length) || undefined;

    target.saleIds = this.saleIds;

    // Strategy
    target.strategy = this.strategy?.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*keep for field*/ });

    if (opts && opts.minify) {
      delete target.rankOrderOnVessel;

      target.observedLocationId = toNumber(target.observedLocationId, target.observedLocation?.id);
      delete target.observedLocation;

      if (target.strategy?.label && PmfmIds.STRATEGY_LABEL !== -1) {
        target.measurementValues[PmfmIds.STRATEGY_LABEL] = target.strategy.label;
      }
      delete target.strategy;
    }

    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.dateTime = fromDateISOString(source.dateTime);
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.rankOrder = source.rankOrder;
    this.rankOrderOnVessel = source.rankOrder; // Landing.rankOrder is stored in rankOrderOnVessel, this.rankOrder is computed by LandingService
    this.observers = (source.observers && source.observers.map(Person.fromObject)) || [];
    this.measurementValues = { ...source.measurementValues }; // Copy values

    // Parent
    this.tripId = source.tripId;
    this.trip = (source.trip && EntityClasses.fromObject(source.trip, { entityName: 'Trip' })) || undefined;
    this.observedLocationId = source.observedLocationId;
    this.observedLocation =
      (source.observedLocation && EntityClasses.fromObject(source.observedLocation, { entityName: 'ObservedLocation' })) || undefined;

    // Samples
    this.samples = (source.samples && source.samples.map(Sample.fromObject)) || undefined;
    this.samplesCount = toNumber(
      source.samplesCount,
      this.samples?.filter((s) => s.measurementValues && isNotNilOrBlank(s.measurementValues[PmfmIds.TAG_ID])).length
    );

    this.saleIds = source.saleIds;

    // Strategy
    this.strategy =
      ReferentialRef.fromObject(source.strategy) ||
      (source.measurementValues?.[PmfmIds.STRATEGY_LABEL] && Strategy.fromObject({ label: source.measurementValues[PmfmIds.STRATEGY_LABEL] })) ||
      undefined;

    // Fill rankOrder (workaround - fix an issue in IMAGINE)
    // FIXME: remove when SAMPLE.RANK_ORDER will always be filled by IMAGINE
    fillRankOrder(this.samples);
  }

  equals(other: Landing): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same vessel
      (this.vesselSnapshot &&
        other.vesselSnapshot &&
        this.vesselSnapshot.id === other.vesselSnapshot.id &&
        // Same rank order on vessel
        this.rankOrderOnVessel &&
        other.rankOrderOnVessel &&
        this.rankOrderOnVessel === other.rankOrderOnVessel &&
        // Same date
        DateUtils.equals(this.dateTime, other.dateTime) &&
        // Same location
        ReferentialUtils.equals(this.location, other.location))
    );
  }

  getStrategyDateTime(): Moment | undefined {
    return this.dateTime;
  }
}
