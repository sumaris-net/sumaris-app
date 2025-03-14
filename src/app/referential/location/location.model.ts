import { EntityClass, ReferentialRef } from '@sumaris-net/ngx-components';

@EntityClass({ typename: 'LocationVO' })
export class LocationRef extends ReferentialRef<LocationRef> {
  static fromObject: (source: any, opts?: any) => LocationRef;

  locationLevel: ReferentialRef;
}
