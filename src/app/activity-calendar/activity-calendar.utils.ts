import { DateUtils, ReferentialUtils, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { ActivityMonth } from './calendar/activity-month.model';
import { GearPhysicalFeatures } from './model/gear-physical-features.model';
import { ActivityCalendar } from './model/activity-calendar.model';

export class ActivityCalendarUtils {
  static logPrefix = '[ActivityCalendarUtils.getPhysicalFeatures]';

  static getPhysicalFeatures(
    activityMonths: ActivityMonth[],
    gearPhysicalFeatures: GearPhysicalFeatures[],
    year: number,
    activityCalendarId: number,
    timezone = DateUtils.moment().tz()
  ): GearPhysicalFeatures[] {
    // Set metier table data
    const monthMetiers = removeDuplicatesFromArray(
      activityMonths.flatMap((month) => month.gearUseFeatures.map((guf) => guf.metier)),
      'id'
    );
    const monthMetierIds = monthMetiers.map((metier) => metier.id);

    // Keep in GearPhysicalFeatures only metier present in calendar
    gearPhysicalFeatures = gearPhysicalFeatures?.filter((gph) => monthMetierIds.includes(gph.metier.id)) || [];

    const firstDayOfYear = DateUtils.moment().tz(timezone).year(year).startOf('year');
    const lastDayOfYear = firstDayOfYear.clone().endOf('year');

    const target = monthMetiers
      .map((metier, index) => {
        const existingGph = gearPhysicalFeatures.find((guf) => {
          return (
            DateUtils.isSame(firstDayOfYear, guf.startDate, 'day') &&
            DateUtils.isSame(lastDayOfYear, guf.endDate, 'day') &&
            ReferentialUtils.equals(guf.metier, metier)
          );
        });
        if (existingGph) existingGph.rankOrder = index + 1;
        return (
          existingGph || {
            activityCalendarId: activityCalendarId,
            startDate: firstDayOfYear,
            endDate: lastDayOfYear,
            metier,
            gear: metier.gear,
          }
        );
      })
      .map(GearPhysicalFeatures.fromObject);

    // Re index PhysicalGearFeature rankOrder depending on monthMetiers order.
    // Must be done in last because PhysicalGearFeature can be deleted
    monthMetiers.forEach((metier, index) => {
      target.find((gpf) => gpf.metier.id == metier.id).rankOrder = index;
    });
    console.debug(ActivityCalendarUtils.logPrefix + 'Loaded :  gearPhysicalFeatures', target);
    return target;
  }
}
