import { DateUtils } from '@sumaris-net/ngx-components';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';

export class ActivityMonthUtils {
  static fromActivityCalendar(data: ActivityCalendar, timezone?: string): ActivityMonth[] {
    data = ActivityCalendar.fromObject(data);
    const year = data?.year || DateUtils.moment().year() - 1;
    const monthStartDates = CalendarUtils.getMonths(year, timezone);
    const vesselId = data.vesselSnapshot?.id;

    let metierBlockCount = 0;
    return monthStartDates.map((startDate) => {
      const endDate = startDate.clone().endOf('month');

      // DEBUG
      //console.debug(`Month #${startDate.month() + 1} - ${toDateISOString(startDate)} -> ${toDateISOString(endDate)}`);

      const source = data.vesselUseFeatures?.find((vuf) => DateUtils.isSame(startDate, vuf.startDate)) || { startDate };
      const target = ActivityMonth.fromObject(source || {});
      target.gearUseFeatures =
        data.gearUseFeatures
          ?.filter((guf) => DateUtils.isSame(startDate, guf.startDate, 'month'))
          .sort(GearUseFeaturesComparators.sortRankOrder)
          .map(GearUseFeatures.fromObject) || [];
      metierBlockCount = Math.max(metierBlockCount, target.gearUseFeatures.length);
      target.vesselId = vesselId;
      target.month = startDate.month() + 1;
      target.endDate = endDate;
      return target;
    });
  }
}
