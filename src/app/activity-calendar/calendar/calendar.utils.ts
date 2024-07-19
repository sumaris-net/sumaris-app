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
}
