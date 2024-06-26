import { DateUtils, isNil } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { ActivityMonth, RegistrationLocationsWithPrivilegeByMonth, VesselRegistrationPeriodsByPrivileges } from './activity-month.model';
import { ProgramPrivilegeEnum } from '@app/referential/services/model/model.enum';
import { VesselRegistrationPeriodComparators } from '@app/vessel/services/model/vessel.model';

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

  static computeMonthPrivileges(
    vesselRegistrationPeriodsPrivileges: VesselRegistrationPeriodsByPrivileges,
    data: ActivityMonth[]
  ): RegistrationLocationsWithPrivilegeByMonth {
    return data.reduce((acc, month) => {
      acc[month.month] = Object.keys(vesselRegistrationPeriodsPrivileges).reduce((subacc, key) => {
        subacc = subacc
          .concat(
            vesselRegistrationPeriodsPrivileges[key]
              .filter((vesselRegistrationPeriod) => {
                return (
                  month.startDate.isSameOrAfter(vesselRegistrationPeriod.startDate, 'month') &&
                  (isNil(vesselRegistrationPeriod.endDate) || month.endDate.isSameOrBefore(vesselRegistrationPeriod.endDate, 'month'))
                );
              })
              .map((vesselRegistrationPeriod) => {
                return {
                  canEdit: key === ProgramPrivilegeEnum.OBSERVER,
                  vesselRegistrationPeriod,
                };
              })
          )
          .sort(VesselRegistrationPeriodComparators.sortStartDate);
        return subacc;
      }, []);
      return acc;
    }, {});
  }
}
