import { DataEntity } from '@app/data/services/model/data-entity.model';
import { Moment, unitOfTime } from 'moment';
import { DateUtils, EntityUtils, isNotNil } from '@sumaris-net/ngx-components';

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

  /**
   * Determines if the given GearUseFeatures object represents monthly usage.
   *
   * @param {GearUseFeatures} o - The object containing start and end dates to be checked.
   * @return {boolean} Returns true if the duration between startDate and endDate is within one month; otherwise, false.
   */
  static isMonthly<T extends IUseFeatures<any>>(o: T): boolean {
    return o.startDate && o.endDate && DateUtils.diffAbs(o.startDate, o.endDate, 'month') <= 1;
  }

  /**
   * Determines if the given object represents yearly usage.
   *
   * @param {GearUseFeatures} o - The object containing start and end dates to be checked.
   * @return {boolean} Returns true if the duration between startDate and endDate is within one month; otherwise, false.
   */
  static isYearly<T extends IUseFeatures<any>>(o: T): boolean {
    if (!o.startDate || !o.endDate) return false;
    const months = DateUtils.diffAbs(o.startDate, o.endDate, 'month');
    return months > 11 && months <= 12;
  }
}
