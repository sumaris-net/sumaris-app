import { EntityClass, ReferentialRef } from '@sumaris-net/ngx-components';

@EntityClass({ typename: 'GearVO' })
export class GearRef extends ReferentialRef<GearRef> {
  static fromObject: (source: any, opts?: any) => GearRef;

  static isTowed(gear: GearRef | any): gear is GearRef {
    return gear?.isTowed === true;
  }
  static isActive(gear: GearRef | any): gear is GearRef {
    return gear?.isActive === true;
  }

  isTowed: boolean;
  isActive: boolean;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.isTowed = source?.isTowed ?? null;
    this.isActive = source?.isActive ?? null;
  }
}
