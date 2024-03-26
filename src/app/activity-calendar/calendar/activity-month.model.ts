import { DateUtils, EntityAsObjectOptions, EntityClass, EntityFilter, IEntity, isNotNil } from '@sumaris-net/ngx-components';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { StoreObject } from '@apollo/client/core';

@EntityClass({ typename: 'ActivityMonthVO' })
export class ActivityMonth extends VesselUseFeatures implements IEntity<ActivityMonth> {
  static fromObject: (source: any, options?: any) => ActivityMonth;

  static equals(o1: ActivityMonth, o2: ActivityMonth) {
    return (isNotNil(o1.id) && o1.id === o2.id) || (DateUtils.isSame(o1.startDate, o2.startDate) && DateUtils.isSame(o1.startDate, o2.startDate));
  }

  month: number;
  gearUseFeatures: GearUseFeatures[];

  constructor() {
    super();
  }

  clone(opts?: any): ActivityMonth {
    const target: ActivityMonth = ActivityMonth.fromObject(this.asObject(opts));
    return target;
  }

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.month = this.startDate?.month();
    this.gearUseFeatures = source.gearUseFeatures?.map(GearUseFeatures.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.gearUseFeatures = this.gearUseFeatures?.map((guf) => guf.asObject(opts));
    if (opts?.minify) {
      delete target.month;
    }
    return target;
  }
}

export class ActivityMonthFilter extends EntityFilter<ActivityMonthFilter, ActivityMonth> {}
