import { DateUtils, EntityUtils, ReferentialUtils, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { GearPhysicalFeatures } from './gear-physical-features.model';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { Metier } from '@app/referential/metier/metier.model';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';

export class GearPhysicalFeaturesUtils {
  static logPrefix = '[ActivityCalendarUtils.getPhysicalFeatures]';

  static fromActivityCalendar(data: ActivityCalendar, opts?: { timezone?: string }): GearPhysicalFeatures[] {
    return GearPhysicalFeaturesUtils.updateFromCalendar(data, data.gearPhysicalFeatures, opts);
  }

  static updateFromCalendar(data: ActivityCalendar, sources: GearPhysicalFeatures[], opts?: { timezone?: string }): GearPhysicalFeatures[] {
    const gearUseFeatures = (data.gearUseFeatures || []).map(GearUseFeatures.fromObject).sort(GearUseFeaturesComparators.sortByDateAndRankOrderFn);
    const sortedMetiers = removeDuplicatesFromArray(gearUseFeatures.map((guf) => guf.metier).filter(ReferentialUtils.isNotEmpty), 'id');

    return this.updateFromMetiers(data, sortedMetiers, sources, opts);
  }

  static updateFromActivityMonths(
    data: ActivityCalendar,
    months: ActivityMonth[],
    sources: GearPhysicalFeatures[],
    opts?: { timezone?: string }
  ): GearPhysicalFeatures[] {
    const gearUseFeatures = (months || []).flatMap((month) => month.gearUseFeatures);
    const sortedMetiers = removeDuplicatesFromArray(gearUseFeatures.map((guf) => guf.metier).filter(ReferentialUtils.isNotEmpty), 'id');
    return this.updateFromMetiers(data, sortedMetiers, sources, opts);
  }

  static updateFromMetiers(
    data: ActivityCalendar,
    sortedMetiers: Metier[],
    sources: GearPhysicalFeatures[],
    opts?: { timezone?: string }
  ): GearPhysicalFeatures[] {
    data = ActivityCalendar.fromObject(data);
    const timezone = opts?.timezone;
    const year = data?.year || DateUtils.moment().year() - 1;

    // Excluded metier without gear (e.g. aquaculture)
    sortedMetiers = sortedMetiers.filter((metier, index) => ReferentialUtils.isNotEmpty(metier.gear));
    const sortedMetierIds: number[] = EntityUtils.collectById(sortedMetiers);

    // Keep GearPhysicalFeatures with a metier that exists in GUF
    sources = (sources || []).filter((gph) => gph.metier && sortedMetierIds.includes(gph.metier.id)) || [];

    const firstDayOfYear = (timezone ? DateUtils.moment().tz(timezone) : DateUtils.moment()).year(year).startOf('year');
    const lastDayOfYear = firstDayOfYear.clone().endOf('year');

    const target = sortedMetiers
      .map((metier, index) => {
        const existingGph = sources.find((guf) => {
          return (
            DateUtils.isSame(firstDayOfYear, guf.startDate, 'day') &&
            DateUtils.isSame(lastDayOfYear, guf.endDate, 'day') &&
            ReferentialUtils.equals(guf.metier, metier)
          );
        });
        if (existingGph) existingGph.rankOrder = index + 1;
        return (
          existingGph || {
            activityCalendarId: data.id,
            startDate: firstDayOfYear,
            endDate: lastDayOfYear,
            rankOrder: index + 1,
            gear: metier.gear,
            metier,
          }
        );
      })
      .map(GearPhysicalFeatures.fromObject);

    // Re index GearPhysicalFeatures rankOrder depending on monthMetiers order.
    // Must be done in last because PhysicalGearFeature can be deleted
    sortedMetiers.forEach((metier, index) => {
      const gpf = target.find((gpf) => gpf.metier.id == metier.id);
      gpf.rankOrder = index;
    });
    console.debug(GearPhysicalFeaturesUtils.logPrefix + 'Loaded :  gearPhysicalFeatures', target);
    return target;
  }
}
