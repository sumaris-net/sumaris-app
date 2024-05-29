import { DateUtils, EntityAsObjectOptions, EntityClass, EntityFilter, FilterFn, IEntity, isNotNil } from '@sumaris-net/ngx-components';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { StoreObject } from '@apollo/client/core';

@EntityClass({ typename: 'ActivityMonthVO' })
export class ActivityMonth extends VesselUseFeatures implements IEntity<ActivityMonth> {
  static fromObject: (source: any, options?: any) => ActivityMonth;

  static equals(o1: ActivityMonth, o2: ActivityMonth) {
    return (isNotNil(o1.id) && o1.id === o2.id) || (DateUtils.isSame(o1.startDate, o2.startDate) && DateUtils.isSame(o1.startDate, o2.startDate));
  }

  static isEmpty(o: ActivityMonth) {
    return VesselUseFeatures.isEmpty(o) && (o.gearUseFeatures || []).every(GearUseFeatures.isEmpty);
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

@EntityClass({ typename: 'ActivityMonthFilterVO' })
export class ActivityMonthFilter extends EntityFilter<ActivityMonthFilter, ActivityMonth> {
  static fromObject: (source: any, opts?: any) => ActivityMonthFilter;

  month: number;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.month = source.month;
  }

  protected buildFilter(): FilterFn<ActivityMonth>[] {
    const filterFns = super.buildFilter();
    if (isNotNil(this.month)) {
      const month = this.month;
      filterFns.push((item) => item.startDate?.month() === month);
    }
    return filterFns;
  }
}
