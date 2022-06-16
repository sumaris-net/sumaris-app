import { Moment } from 'moment';
import { EntityClass, fromDateISOString, toDateISOString } from '@sumaris-net/ngx-components';
import { DataEntityAsObjectOptions } from '@app/data/services/model/data-entity.model';
import { DataRootVesselEntity } from '@app/data/services/model/root-vessel-entity.model';

@EntityClass({typename: 'TripVO'})
export class TripRef extends DataRootVesselEntity<TripRef>{

  static fromObject: (source: any, opts?: any) => TripRef;

  departureDateTime: Moment;
  returnDateTime: Moment;

  constructor() {
    super(TripRef.TYPENAME);
  }

  asObject(options?: DataEntityAsObjectOptions): any {
    const target = super.asObject(options);
    target.departureDateTime = toDateISOString(this.departureDateTime);
    target.returnDateTime = toDateISOString(this.returnDateTime);
    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.departureDateTime = fromDateISOString(source.departureDateTime);
    this.departureDateTime = fromDateISOString(source.departureDateTime);
  }
}
