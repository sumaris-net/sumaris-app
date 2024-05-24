import { DateUtils, ReferentialUtils, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { ActivityMonth } from './calendar/activity-month.model';
import { GearUseFeatures } from './model/gear-use-features.model';

export class ActivityCalendarUtils {
  static getMetierValue(activityMonths: ActivityMonth[], gearUseFeatures: GearUseFeatures[], timezone: string, year: number): GearUseFeatures[] {
    // Set metier table data
    // TODO sort by startDate ?
    const monthMetiers = removeDuplicatesFromArray(
      activityMonths.flatMap((month) => month.gearUseFeatures.map((guf) => guf.metier)),
      'id'
    );
    const firstDayOfYear = DateUtils.moment().tz(timezone).year(year).startOf('year');
    const lastDayOfYear = firstDayOfYear.clone().endOf('year');

    const metiers = monthMetiers
      .map((metier, index) => {
        const existingGuf = (gearUseFeatures || []).find((guf) => {
          //TODO MFA à voir avec ifremer comment filtrer les GUF qui sont à afficher dans le tableau des métiers
          return (
            DateUtils.isSame(firstDayOfYear, guf.startDate, 'day') &&
            DateUtils.isSame(lastDayOfYear, guf.endDate, 'day') &&
            ReferentialUtils.equals(guf.metier, metier)
          );
        });
        if (existingGuf) existingGuf.rankOrder = index + 1;
        return existingGuf || { startDate: firstDayOfYear, endDate: lastDayOfYear, metier, rankOrder: index + 1 };
      })
      .map(GearUseFeatures.fromObject);

    // DEBUG
    console.debug('[ActivityCalendarUtils.getMetierValue] Loaded metiers: ', metiers);
    return metiers;
  }
}
