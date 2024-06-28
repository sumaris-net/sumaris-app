import { arrayResize, DateUtils, isNil, isNotEmptyArray, isNotNil, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { ProgramPrivilegeEnum, QualityFlagIds } from '@app/referential/services/model/model.enum';
import { IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';
import { VesselRegistrationPeriod } from '@app/vessel/services/model/vessel.model';

export class ActivityMonthUtils {
  static fromActivityCalendar(
    data: ActivityCalendar,
    opts?: { fillEmptyGuf?: boolean; fillEmptyFishingArea?: boolean; fishingAreaCount?: number; timezone?: string; isAdmin?: boolean }
  ): ActivityMonth[] {
    data = ActivityCalendar.fromObject(data);
    const year = data?.year || DateUtils.moment().year() - 1;
    const monthStartDates = CalendarUtils.getMonths(year, opts?.timezone);
    const vesselId = data.vesselSnapshot?.id;
    const gearUseFeatures = (data.gearUseFeatures || []).map(GearUseFeatures.fromObject).sort(GearUseFeaturesComparators.sortByDateAndRankOrderFn);
    const metierIds = removeDuplicatesFromArray(gearUseFeatures.map((guf) => guf.metier?.id).filter(isNotNil)).concat(undefined);
    const fishingAreaCount = opts?.fishingAreaCount || 2;
    const registrationPeriods: VesselRegistrationPeriod[] = Object.values(data.vesselRegistrationPeriodsByPrivileges).flatMap((values) => values);
    const writablePeriods = opts?.isAdmin ? registrationPeriods : data.vesselRegistrationPeriodsByPrivileges?.[ProgramPrivilegeEnum.OBSERVER] || [];

    const vufs = (data.vesselUseFeatures || []).filter((vuf) => vuf.qualityFlagId !== QualityFlagIds.CONFLICTUAL);
    const conflictualVufs = (data.vesselUseFeatures || []).filter((vuf) => vuf.qualityFlagId === QualityFlagIds.CONFLICTUAL);

    let metierBlockCount = 0;
    const months = monthStartDates.map((startDate) => {
      const endDate = startDate.clone().endOf('month');

      // DEBUG
      //console.debug(`Month #${startDate.month() + 1} - ${toDateISOString(startDate)} -> ${toDateISOString(endDate)}`);

      const source = vufs.find((vuf) => DateUtils.isSame(startDate, vuf.startDate, 'day') && DateUtils.isSame(endDate, vuf.endDate, 'day')) || {
        startDate,
      };
      const target = ActivityMonth.fromObject(source || {});
      target.gearUseFeatures = gearUseFeatures?.filter(
        (guf) => DateUtils.isSame(startDate, guf.startDate, 'day') && DateUtils.isSame(endDate, guf.endDate, 'day')
      );
      if (opts?.fillEmptyGuf && metierIds.length > 1) {
        target.gearUseFeatures = metierIds.flatMap((metierId) => {
          const existingGuf = target.gearUseFeatures.filter((guf) => guf.metier?.id === metierId);
          if (isNotEmptyArray(existingGuf)) return existingGuf;
          return [new GearUseFeatures()]; // Empty GUF
        });

        // Fill empty fishing area
        if (opts?.fillEmptyFishingArea) {
          target.gearUseFeatures.forEach((guf) => {
            guf.fishingAreas = arrayResize(guf.fishingAreas, fishingAreaCount, <FishingArea>{}).map(FishingArea.fromObject);
          });
        }
      }
      metierBlockCount = Math.max(metierBlockCount, target.gearUseFeatures.length);
      target.vesselId = vesselId;
      target.month = startDate.month() + 1;
      target.endDate = endDate;

      target.canEdit = opts?.isAdmin || IUseFeaturesUtils.isInPeriods(target, writablePeriods);
      target.registrationLocations = registrationPeriods
        .filter((period) => IUseFeaturesUtils.isInPeriods(target, [period]))
        .map((vrp) => vrp.registrationLocation);
      return target;
    });

    // TODO : common code with block above : find a way to merge this
    metierBlockCount = 0;
    const conflictualMonths = monthStartDates
      .map((startDate) => {
        const endDate = startDate.clone().endOf('month');

        // DEBUG
        //console.debug(`Month #${startDate.month() + 1} - ${toDateISOString(startDate)} -> ${toDateISOString(endDate)}`);

        const source = conflictualVufs.find(
          (vuf) => DateUtils.isSame(startDate, vuf.startDate, 'day') && DateUtils.isSame(endDate, vuf.endDate, 'day')
        ) || {
          startDate,
        };
        const target = ActivityMonth.fromObject(source || {});
        target.gearUseFeatures = gearUseFeatures?.filter(
          (guf) => DateUtils.isSame(startDate, guf.startDate, 'day') && DateUtils.isSame(endDate, guf.endDate, 'day')
        );
        if (opts?.fillEmptyGuf && metierIds.length > 1) {
          target.gearUseFeatures = metierIds.flatMap((metierId) => {
            const existingGuf = target.gearUseFeatures.filter((guf) => guf.metier?.id === metierId);
            if (isNotEmptyArray(existingGuf)) return existingGuf;
            return [new GearUseFeatures()]; // Empty GUF
          });

          // Fill empty fishing area
          if (opts?.fillEmptyFishingArea) {
            target.gearUseFeatures.forEach((guf) => {
              guf.fishingAreas = arrayResize(guf.fishingAreas, fishingAreaCount, <FishingArea>{}).map(FishingArea.fromObject);
            });
          }
        }
        metierBlockCount = Math.max(metierBlockCount, target.gearUseFeatures.length);
        target.vesselId = vesselId;
        target.month = startDate.month() + 1;
        target.endDate = endDate;

        target.canEdit = opts?.isAdmin || IUseFeaturesUtils.isInPeriods(target, writablePeriods);
        target.registrationLocations = registrationPeriods
          .filter((period) => IUseFeaturesUtils.isInPeriods(target, [period]))
          .map((vrp) => vrp.registrationLocation);
        return target;
      })
      .reverse();

    for (const conflictualMonth of conflictualMonths) {
      if (isNil(conflictualMonth.id)) continue;
      conflictualMonth.canEdit = false;
      months.splice(conflictualMonth.month - 1, 0, conflictualMonth);
    }

    return months;
  }
}
