import { VesselOwnerPeriod } from '@app/vessel/services/model/vessel-owner-period.model';
import { DateUtils } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';

export class CalendarUtils {
  /**
   * Months of a year, from 1 to 12
   */
  static MONTHS = new Array(12).fill(null).map((_, month) => month + 1);

  static getMonths(year: number, timezone?: string): Moment[] {
    const startDate = (timezone ? DateUtils.moment().tz(timezone) : DateUtils.moment()).year(year).startOf('year');
    return CalendarUtils.MONTHS.map((month) =>
      startDate
        .clone()
        .month(month - 1)
        .startOf('month')
    );
  }

  static getVesselOwnerPeriodsIndexed(vesselOwnerPeriods: VesselOwnerPeriod[]): VesselOwnerPeriod[] {
    const vesselOwnerPeriodsIndexed: (VesselOwnerPeriod | null)[] = new Array(12).fill(null);

    // Reindex the periods taking into account the covered months
    vesselOwnerPeriods.forEach((vesselOwnerPeriod) => {
      const firstMonth = vesselOwnerPeriod.startDate.clone().startOf('month');

      while (firstMonth.isBefore(vesselOwnerPeriod.endDate) || firstMonth.isSame(vesselOwnerPeriod.endDate, 'month')) {
        const monthIndex = firstMonth.month() + 1;
        vesselOwnerPeriodsIndexed[monthIndex] = vesselOwnerPeriod;
        firstMonth.add(1, 'month');
      }
    });

    return vesselOwnerPeriodsIndexed;
  }
}
