import {
  DateUtils,
  EntityAsObjectOptions,
  EntityClass,
  EntityFilter,
  FilterFn,
  IEntity,
  isNotEmptyArray,
  isNotNil,
  ReferentialRef,
  ReferentialUtils,
} from '@sumaris-net/ngx-components';
import { VesselUseFeatures } from '@app/activity-calendar/model/vessel-use-features.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { StoreObject } from '@apollo/client/core';

@EntityClass({ typename: 'ActivityMonthVO' })
export class ActivityMonth extends VesselUseFeatures implements IEntity<ActivityMonth> {
  static fromObject: (source: any, options?: any) => ActivityMonth;

  static equals(o1: ActivityMonth, o2: ActivityMonth) {
    return (
      (isNotNil(o1.id) && o1.id === o2.id) ||
      (DateUtils.isSame(o1.startDate, o2.startDate) && DateUtils.isSame(o1.endDate, o2.endDate) && ReferentialUtils.equals(o1.program, o2.program))
    );
  }

  static isEmpty(o: ActivityMonth) {
    return VesselUseFeatures.isEmpty(o) && (o.gearUseFeatures || []).every(GearUseFeatures.isEmpty);
  }

  month: number;
  readonly: boolean;
  gearUseFeatures: GearUseFeatures[];
  registrationLocations: ReferentialRef[];

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
    this.readonly = source.readonly;
    this.registrationLocations = source.registrationLocations?.map(ReferentialRef.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.gearUseFeatures = this.gearUseFeatures?.map((guf) => {
      const targetGuf = guf.asObject(opts);
      targetGuf.startDate = targetGuf.startDate || target.startDate;
      targetGuf.endDate = targetGuf.endDate || target.endDate;
      return targetGuf;
    });
    if (opts?.minify) {
      delete target.month;
      delete target.readonly;
      delete target.registrationLocations;
    }
    return target;
  }
}

@EntityClass({ typename: 'ActivityMonthFilterVO' })
export class ActivityMonthFilter extends EntityFilter<ActivityMonthFilter, ActivityMonth> {
  static fromObject: (source: any, opts?: any) => ActivityMonthFilter;

  month: number;
  programLabels: string[];

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.month = source.month;
    this.programLabels = source.programLabels;
  }

  asObject(opts?: EntityAsObjectOptions): StoreObject {
    const target = super.asObject(opts);
    target.month = this.month;
    target.programLabels = this.programLabels;
    return target;
  }

  protected buildFilter(): FilterFn<ActivityMonth>[] {
    const filterFns = super.buildFilter();

    // Month
    if (isNotNil(this.month)) {
      const month = this.month;
      filterFns.push((item) => item.startDate?.month() === month);
    }

    // Programs
    if (isNotEmptyArray(this.programLabels)) {
      const programLabels = this.programLabels;
      filterFns.push((item) => !item.program || programLabels.includes(item.program.label));
    }
    return filterFns;
  }
}
