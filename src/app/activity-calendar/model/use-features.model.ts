import { DataEntity } from '@app/data/services/model/data-entity.model';
import { Moment } from 'moment/moment';
import { EntityUtils, isNotNil } from '@sumaris-net/ngx-components';
import { unitOfTime } from 'moment';

export interface IUseFeatures<T extends DataEntity<T> = DataEntity<any>> extends DataEntity<T> {
  vesselId: number;
  startDate: Moment;
  endDate: Moment;

  equals(other: T, opts?: { withMeasurementValues?: boolean }): boolean;
}

export class IUseFeaturesUtils {
  static filterByPeriods<T extends IUseFeatures<any> | { startDate: Moment; endDate?: Moment }>(
    sources: T[],
    periods: { startDate: Moment; endDate: Moment }[],
    granularity?: unitOfTime.StartOf
  ): T[] {
    return (sources || []).filter((source) => IUseFeaturesUtils.isInPeriods(source, periods, granularity));
  }

  static isInPeriods<T extends IUseFeatures<any> | { startDate: Moment; endDate?: Moment }>(
    source: T,
    periods: { startDate: Moment; endDate?: Moment }[],
    granularity?: unitOfTime.StartOf
  ): boolean {
    return (periods || []).some((period) => this.isInPeriod(source, period, granularity));
  }

  static filterByPeriod<T extends IUseFeatures<any> | { startDate: Moment; endDate?: Moment }>(
    sources: T[],
    period: { startDate: Moment; endDate?: Moment },
    granularity?: unitOfTime.StartOf
  ): T[] {
    return (sources || []).filter((source) => IUseFeaturesUtils.isInPeriod(source, period, granularity));
  }

  static isInPeriod<T extends IUseFeatures<any> | { startDate: Moment; endDate?: Moment }>(
    source: T,
    period: { startDate: Moment; endDate?: Moment },
    granularity?: unitOfTime.StartOf
  ): boolean {
    if (!source.endDate && !period.endDate) return true;
    return (
      (!period.endDate || source.startDate.isSameOrBefore(period.endDate, granularity)) &&
      (!source.endDate || source.endDate.isSameOrAfter(period.startDate, granularity))
    );
  }

  static isSame<T extends IUseFeatures<any>>(o1: T, o2: T, opts?: { withId?: boolean; withMeasurementValues?: boolean }): boolean {
    // If ID should be ignored: clone then reset id
    if (o1 && opts?.withId === false && isNotNil(o1.id) && isNotNil(o2?.id)) {
      o1 = o1.clone();
      EntityUtils.cleanIdAndUpdateDate(o1);
    }
    return (!o1 && !o2) || (o1 && o1.equals(o2, opts));
  }
}
