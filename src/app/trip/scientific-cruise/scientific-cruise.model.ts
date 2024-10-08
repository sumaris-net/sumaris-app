import { Trip } from '../trip/trip.model';
import { EntityClass, fromDateISOString, isNotNil, Person, toDateISOString } from '@sumaris-net/ngx-components';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';
import { Moment } from 'moment';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';

@EntityClass({ typename: 'ScientificCruiseVO' })
export class ScientificCruise extends DataRootVesselEntity<ScientificCruise> {
  static ENTITY_NAME = 'ScientificCruise';

  static fromObject: (source: any, opts?: any) => ScientificCruise;

  name: string = null;
  reference: string = null;
  departureDateTime: Moment = null;
  returnDateTime: Moment = null;
  trip: Trip = null;
  managerPerson: Person = null;

  constructor() {
    super(Trip.TYPENAME);
  }

  asObject(opts?: DataEntityAsObjectOptions & { batchAsTree?: boolean; gearAsTree?: boolean }): any {
    const target = super.asObject(opts);
    target.departureDateTime = toDateISOString(this.departureDateTime);
    target.returnDateTime = toDateISOString(this.returnDateTime);
    target.trip = (this.trip && this.trip.asObject(opts)) || undefined;
    target.managerPerson = (this.managerPerson && this.managerPerson.asObject({ ...opts, ...NOT_MINIFY_OPTIONS })) || undefined;

    return target;
  }

  fromObject(source: any, opts?: any): ScientificCruise {
    super.fromObject(source);
    this.departureDateTime = fromDateISOString(source.departureDateTime);
    this.returnDateTime = fromDateISOString(source.returnDateTime);
    this.trip = (source.trip && Trip.fromObject(source.trip)) || undefined;
    this.managerPerson = (source.managerPerson && Person.fromObject(source.managerPerson)) || undefined;

    this.vesselSnapshot = (source.vesselSnapshot && VesselSnapshot.fromObject(source.vesselSnapshot)) || undefined;

    return this;
  }

  equals(other: ScientificCruise): boolean {
    return (
      (super.equals(other) && isNotNil(this.id)) ||
      // Same vessel
      (this.vesselSnapshot &&
        other.vesselSnapshot &&
        this.vesselSnapshot.id === other.vesselSnapshot.id &&
        // Same departure date (or, if not set, same return date)
        (this.departureDateTime === other.departureDateTime ||
          (!this.departureDateTime && !other.departureDateTime && this.returnDateTime === other.returnDateTime)))
    );
  }
}
