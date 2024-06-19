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

  static vesselOwnerPeriodsByMonthCovered(VesselOwnerPeriod: VesselOwnerPeriod[]): VesselOwnerPeriod[] {
    // Calculate the months covered by each period
    const VesselOwnerPeriodsWithMonths = VesselOwnerPeriod.map((period) => {
      const coveredMonths: number[] = [];
      const currentMonth = period.startDate.clone().startOf('month');

      // Iterate through all the months until the end of the period
      while (currentMonth.isBefore(period.endDate) || currentMonth.isSame(period.endDate, 'month')) {
        coveredMonths.push(currentMonth.month());
        currentMonth.add(1, 'month');
      }

      return {
        period,
        months: coveredMonths,
      };
    });

    // Sort the periods based on the first covered month
    VesselOwnerPeriodsWithMonths.sort((a, b) => a.months[0] - b.months[0]);

    // Remap the sorted objects to an array of periods
    const VesselOwnerPeriodSortWithMotnh = VesselOwnerPeriodsWithMonths.map((item) => item.period);

    const reindexedPeriods: (VesselOwnerPeriod | null)[] = new Array(12).fill(null);

    // Reindex the periods taking into account the covered months
    VesselOwnerPeriodSortWithMotnh.forEach((period) => {
      const currentMonth = period.startDate.clone().startOf('month');

      // Iterate through all the months until the end of the period
      while (currentMonth.isBefore(period.endDate) || currentMonth.isSame(period.endDate, 'month')) {
        const monthIndex = currentMonth.month() + 1;

        // Place the period in the reindexing array
        reindexedPeriods[monthIndex] = period;
        currentMonth.add(1, 'month');
      }
    });

    return reindexedPeriods;
  }
}
