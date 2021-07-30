import {DataEntityAsObjectOptions} from '@app/data/services/model/data-entity.model';
import {Moment} from 'moment';
import {MeasurementModelValues, MeasurementValuesUtils} from './measurement.model';
import {Sample} from './sample.model';
import {DataRootVesselEntity} from '@app/data/services/model/root-vessel-entity.model';
import {IWithObserversEntity} from '@app/data/services/model/model.utils';
import {EntityClass, fromDateISOString, Person, ReferentialAsObjectOptions, ReferentialRef, ReferentialUtils, toDateISOString, toNumber} from '@sumaris-net/ngx-components';
import {NOT_MINIFY_OPTIONS} from '@app/core/services/model/referential.model';

/**
 * Landing entity
 */
@EntityClass({typename: 'LandingVO'})
export class Landing extends DataRootVesselEntity<Landing> implements IWithObserversEntity<Landing> {

  static fromObject: (source: any, opts?: any) => Landing;

  dateTime: Moment = null;
  location: ReferentialRef = null;
  rankOrder?: number = null;
  rankOrderOnVessel?: number = null;
  measurementValues: MeasurementModelValues = null;

  tripId: number = null;
  observedLocationId: number = null;
  observers: Person[] = null;
  samples: Sample[] = null;
  samplesCount?: number = null;

  constructor() {
    super(Landing.TYPENAME);
  }

  asObject(opts?: DataEntityAsObjectOptions): any {
    const target = super.asObject(opts);
    target.dateTime = toDateISOString(this.dateTime);
    target.location = this.location && this.location.asObject({ ...opts, ...NOT_MINIFY_OPTIONS /*keep for list*/ } as ReferentialAsObjectOptions) || undefined;
    target.observers = this.observers && this.observers.map(p => p && p.asObject(opts)) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, opts);

    target.rankOrder = this.rankOrderOnVessel; // this.rankOrder is not persisted

    // Samples
    target.samples = this.samples && this.samples.map(s => s.asObject(opts)) || undefined;

    if (opts && opts.minify) {
      delete target.rankOrderOnVessel;
    }

    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.dateTime = fromDateISOString(source.dateTime);
    this.location = source.location && ReferentialRef.fromObject(source.location);
    this.rankOrder = source.rankOrder;
    this.rankOrderOnVessel = source.rankOrder; // Landing.rankOrder is stored in rankOrderOnVessel, this.rankOrder is computed by LandingService
    this.observers = source.observers && source.observers.map(Person.fromObject) || [];
    this.measurementValues = source.measurementValues && {...source.measurementValues};
    if (this.measurementValues === undefined) {
      console.warn("Source as no measurementValues. Should never occur ! ", source);
    }

    // Parent link
    this.observedLocationId = source.observedLocationId;
    this.tripId = source.tripId;

    // Samples
    this.samples = source.samples && source.samples.map(Sample.fromObject) || undefined;
    this.samplesCount = toNumber(source.samplesCount, this.samples?.length);
  }

  equals(other: Landing): boolean {
    return super.equals(other)
      || (
        // Same vessel
        (this.vesselSnapshot && other.vesselSnapshot && this.vesselSnapshot.id === other.vesselSnapshot.id)
        // Same rank order on vessel
        && (this.rankOrderOnVessel && other.rankOrderOnVessel && this.rankOrderOnVessel === other.rankOrderOnVessel)
        // Same date
        && (this.dateTime === other.dateTime)
        // Same location
        && ReferentialUtils.equals(this.location, other.location)
      );
  }
}
