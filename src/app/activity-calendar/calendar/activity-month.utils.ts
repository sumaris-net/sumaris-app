import { DateUtils, isNil, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
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

    let metiersIdToIndex: { [key: number]: number };
    if (opts && opts?.fillEmptyGuf) {
      metiersIdToIndex = removeDuplicatesFromArray(
        data.gearUseFeatures.sort((a, b) => (a.rankOrder < b.rankOrder ? -1 : 1)).map((guf) => guf.metier.id)
      ).reduce((acc, metierId, index) => {
        acc[metierId] = index;
        return acc;
      }, {});
    }

    let nbOfFishingAreaPeerMetierId: { [key: number]: number };
    if (opts?.fillEmptyFishingArea) {
      nbOfFishingAreaPeerMetierId = data.gearUseFeatures.reduce((acc, guf) => {
        if (acc[guf.metier.id] === undefined) acc[guf.metier.id] = 0;
        if (acc[guf.metier.id] < guf.fishingAreas?.length || 0) acc[guf.metier.id] = guf.fishingAreas?.length || 0;
        return acc;
      }, {});
    }

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
      if (opts?.fillEmptyGuf) {
        target.gearUseFeatures = [];
        // data.gearPhysicalFeatures have count of total distinct Metiers
        data.gearPhysicalFeatures.forEach((_) => {
          target.gearUseFeatures.push(GearUseFeatures.fromObject({}));
        });
        // If the month has gear feature, put it in the index place in
        // gearUseFeatures array
        gearUseFeatures.forEach((guf) => {
          const index = metiersIdToIndex[guf.metier.id];
          target.gearUseFeatures[index] = guf;
        });
        // Fill empty fishing area
        if (opts?.fillEmptyFishingArea) {
          data.gearPhysicalFeatures.forEach((gph, index) => {
            const metierId = gph.metier.id;
            const totalNbOfFishingAreas = nbOfFishingAreaPeerMetierId[metierId];
            if (isNil(target.gearUseFeatures[index].fishingAreas)) target.gearUseFeatures[index].fishingAreas = [];
            const currentNbOfFishingAreas = target.gearUseFeatures[index].fishingAreas?.length;
            for (let i = currentNbOfFishingAreas; i < totalNbOfFishingAreas; i++) {
              target.gearUseFeatures[index].fishingAreas[i] = new FishingArea();
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
