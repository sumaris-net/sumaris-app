import { DateUtils, isEmptyArray, isNotEmptyArray } from '@sumaris-net/ngx-components';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';

export class ActivityMonthUtils {
  static fromActivityCalendar(
    data: ActivityCalendar,
    opts?: { fillEmptyGuf?: boolean; fillEmptyFishingArea?: boolean; timezone?: string }
  ): ActivityMonth[] {
    data = ActivityCalendar.fromObject(data);
    const year = data?.year || DateUtils.moment().year() - 1;
    const monthStartDates = CalendarUtils.getMonths(year, opts?.timezone);
    const vesselId = data.vesselSnapshot?.id;

    let metierBlockCount = 0;
    return monthStartDates.map((startDate) => {
      const endDate = startDate.clone().endOf('month');

      // DEBUG
      //console.debug(`Month #${startDate.month() + 1} - ${toDateISOString(startDate)} -> ${toDateISOString(endDate)}`);

      const source = data.vesselUseFeatures?.find(
        (vuf) => DateUtils.isSame(startDate, vuf.startDate, 'day') && DateUtils.isSame(endDate, vuf.endDate, 'day')
      ) || { startDate };
      const target = ActivityMonth.fromObject(source || {});
      const gearUseFeatures =
        data.gearUseFeatures
          ?.filter((guf) => DateUtils.isSame(startDate, guf.startDate, 'day') && DateUtils.isSame(endDate, guf.endDate, 'day'))
          .sort(GearUseFeaturesComparators.sortRankOrder)
          .map(GearUseFeatures.fromObject) || [];
      if (opts && opts?.fillEmptyGuf) {
        target.gearUseFeatures = [];
        for (let i = 0; i < data.gearUseFeatures.length; i++) {
          target.gearUseFeatures.push(GearUseFeatures.fromObject({}));
        }
        // If the month has gear feature, put it in the index place in
        // gearUseFeatures array
        gearUseFeatures.forEach((guf) => {
          const index = data.gearUseFeatures.indexOf(guf);
          target.gearUseFeatures[index] = guf;
        });
        // Fill empty fishing area
        if (opts?.fillEmptyFishingArea) {
          data.gearUseFeatures.forEach((guf, index) => {
            const targetGuf = target.gearUseFeatures[index];
            if (isNotEmptyArray(guf.fishingAreas) && isEmptyArray(targetGuf.fishingAreas)) {
              targetGuf.fishingAreas = [];
              for (let i = 0; i < guf.fishingAreas.length; i++) {
                targetGuf.fishingAreas.push(FishingArea.fromObject({}));
              }
            }
          });
        }
      } else {
        target.gearUseFeatures = gearUseFeatures;
      }
      metierBlockCount = Math.max(metierBlockCount, target.gearUseFeatures.length);
      target.vesselId = vesselId;
      target.month = startDate.month() + 1;
      target.endDate = endDate;
      return target;
    });
  }
}
