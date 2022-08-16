import {DataEntityAsObjectOptions} from "../../../data/services/model/data-entity.model";
import {Moment} from "moment";
import { IEntityWithMeasurement, MeasurementFormValues, MeasurementModelValues, MeasurementUtils, MeasurementValuesUtils } from './measurement.model';
import {Landing} from "./landing.model";
import { isNotNil, ReferentialAsObjectOptions, ReferentialRef } from '@sumaris-net/ngx-components';
import {RootDataEntity} from "../../../data/services/model/root-data-entity.model";
import {IWithObserversEntity} from "../../../data/services/model/model.utils";
import {fromDateISOString, toDateISOString} from "@sumaris-net/ngx-components";
import {Person}  from "@sumaris-net/ngx-components";
import {EntityClass}  from "@sumaris-net/ngx-components";
import { NOT_MINIFY_OPTIONS } from "@app/core/services/model/referential.utils";

@EntityClass({typename: "ObservedLocationVO"})
export class ObservedLocation extends RootDataEntity<ObservedLocation>
  implements IEntityWithMeasurement<ObservedLocation>, IWithObserversEntity<ObservedLocation> {

  static fromObject: (source, opts?: any) => ObservedLocation;

  startDateTime: Moment;
  endDateTime: Moment;
  location: ReferentialRef;
  measurementValues: MeasurementModelValues | MeasurementFormValues;
  observers: Person[];

  landings: Landing[];

  constructor() {
    super(ObservedLocation.TYPENAME);
    this.location = null;
    this.measurementValues = {};
    this.observers = [];
    this.landings = [];
  }

  copy(target: ObservedLocation) {
    target.fromObject(this);
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.startDateTime = toDateISOString(this.startDateTime);
    target.endDateTime = toDateISOString(this.endDateTime);
    target.location = this.location && this.location.asObject({ ...options, ...NOT_MINIFY_OPTIONS /*keep for list*/ } as ReferentialAsObjectOptions) || undefined;
    target.measurementValues = MeasurementValuesUtils.asObject(this.measurementValues, options);
    target.landings = this.landings && this.landings.map(s => s.asObject(options)) || undefined;
    target.observers = this.observers && this.observers.map(o => o.asObject({ ...options, ...NOT_MINIFY_OPTIONS /*keep for list*/ } as ReferentialAsObjectOptions)) || undefined;

    return target;
  }

  fromObject(source: any): ObservedLocation {
    super.fromObject(source);
    this.startDateTime = fromDateISOString(source.startDateTime);
    this.endDateTime = fromDateISOString(source.endDateTime);
    this.location = source.location && ReferentialRef.fromObject(source.location);

    this.measurementValues = source.measurementValues && {...source.measurementValues} || MeasurementUtils.toMeasurementValues(source.measurements);
    this.observers = source.observers && source.observers.map(Person.fromObject) || [];
    this.landings = source.landings && source.landings.map(Landing.fromObject) || [];

    return this;
  }

  equals(other: ObservedLocation): boolean {
    return (super.equals(other) && isNotNil(this.id))
      || (
        // Same location
        (this.location && other.location && this.location.id === other.location.id)
        // Same start date/time
        && (this.startDateTime === other.startDateTime)
        // Same recorder person
        && (this.recorderPerson && other.recorderPerson && this.recorderPerson.id === other.recorderPerson.id)
      );
  }
}
