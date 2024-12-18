import { arrayResize, DateUtils, isNotEmptyArray, isNotNil, removeDuplicatesFromArray } from '@sumaris-net/ngx-components';
import { GearUseFeatures, GearUseFeaturesComparators } from '@app/activity-calendar/model/gear-use-features.model';
import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import { CalendarUtils } from '@app/activity-calendar/calendar/calendar.utils';
import { ActivityMonth } from '@app/activity-calendar/calendar/activity-month.model';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { VesselUseFeatures, VesselUseFeaturesIsActiveEnum } from '@app/activity-calendar/model/vessel-use-features.model';
import { IUseFeaturesUtils } from '@app/activity-calendar/model/use-features.model';

export class ActivityMonthUtils {
  static getSortedMetierIds(
    gearUseFeatures: GearUseFeatures[],
    compareFn: (o1: GearUseFeatures, o2: GearUseFeatures) => number = GearUseFeaturesComparators.sortByDateAndRankOrderFn
  ) {
    const sortedGearUseFeatures = (gearUseFeatures || []).map(GearUseFeatures.fromObject).sort(compareFn);
    return removeDuplicatesFromArray(sortedGearUseFeatures.map((guf) => guf.metier?.id).filter(isNotNil));
  }

  static fromActivityCalendars(
    sources: ActivityCalendar[],
    opts?: {
      fillEmptyMonth?: boolean;
      fillEmptyGuf?: boolean;
      fillEmptyFishingArea?: boolean;
      fishingAreaCount?: number;
      timezone?: string;
      sortedMetierIds?: number[];
    }
  ): ActivityMonth[] {
    const gearUseFeatures = (sources || []).flatMap((ac) => ac.gearUseFeatures).filter(GearUseFeatures.isNotEmpty);
    const sortedMetierIds = ActivityMonthUtils.getSortedMetierIds(gearUseFeatures, GearUseFeaturesComparators.sortByMonthAndRankOrderFn);

    // Convert to months, then sort
    return sources.flatMap((source) => ActivityMonthUtils.fromActivityCalendar(source, { ...opts, sortedMetierIds }));
  }

  static fromActivityCalendar(
    data: ActivityCalendar,
    opts?: {
      fillEmptyMonth?: boolean;
      fillEmptyGuf?: boolean;
      fillEmptyFishingArea?: boolean;
      fishingAreaCount?: number;
      timezone?: string;
      sortedMetierIds?: number[];
    }
  ): ActivityMonth[] {
    if (!data) return undefined;
    data = ActivityCalendar.fromObject(data);
    const year = data?.year || DateUtils.moment().year() - 1;
    const monthStartDates = CalendarUtils.getMonths(year, opts?.timezone);
    const vesselId = data.vesselSnapshot?.id;
    const sortedGearUseFeatures = (data.gearUseFeatures || [])
      .map(GearUseFeatures.fromObject)
      .sort(GearUseFeaturesComparators.sortByDateAndRankOrderFn);
    const sortedMetierIds =
      opts?.sortedMetierIds || (opts?.fillEmptyGuf && removeDuplicatesFromArray(sortedGearUseFeatures.map((guf) => guf.metier?.id).filter(isNotNil)));
    const fishingAreaCount = opts?.fishingAreaCount || 2;
    const program = data.program;

    return monthStartDates
      .map((startDate) => {
        const endDate = startDate.clone().endOf('month').startOf('day');

        // DEBUG
        //console.debug(`Month #${startDate.month() + 1} - ${toDateISOString(startDate)} -> ${toDateISOString(endDate)}`);

        const source =
          data.vesselUseFeatures?.find((vuf) => DateUtils.isSame(startDate, vuf.startDate, 'day') && DateUtils.isSame(endDate, vuf.endDate, 'day')) ||
          (opts?.fillEmptyMonth !== false ? { startDate } : undefined);
        if (!source) return null; // Skip

        const target = ActivityMonth.fromObject(source);
        target.gearUseFeatures = sortedGearUseFeatures?.filter(
          (guf) => DateUtils.isSame(startDate, guf.startDate, 'day') && DateUtils.isSame(endDate, guf.endDate, 'day')
        );
        if (opts?.fillEmptyGuf && isNotEmptyArray(sortedMetierIds)) {
          target.gearUseFeatures = sortedMetierIds.flatMap((metierId) => {
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
        target.vesselId = vesselId;
        target.month = startDate.month();
        target.endDate = endDate;
        target.program = program;

        const vesselRegistrationPeriods = removeDuplicatesFromArray(IUseFeaturesUtils.filterByPeriod(data.vesselRegistrationPeriods, target), 'id');
        // A user can edit a month if the first QIM est editable - see issue #764
        // (=a month is readonly, if the first QIM is readonly)
        target.readonly = vesselRegistrationPeriods?.[0]?.readonly ?? true;
        target.registrationLocations = vesselRegistrationPeriods.map((vrp) => {
          return vrp.registrationLocation;
        });
        return target;
      })
      .filter(isNotNil);
  }

  static toActivityCalendar(sources: ActivityMonth[]): ActivityCalendar {
    const target = new ActivityCalendar();
    ActivityMonthUtils.fillActivityCalendar(target, sources);
    return target;
  }

  static fillActivityCalendar(target: ActivityCalendar, sources: ActivityMonth[]) {
    if (!target) throw new Error("Missing required 'target' argument");
    target.vesselUseFeatures = ActivityMonthUtils.toVesselUseFeatures(sources);
    target.gearUseFeatures = ActivityMonthUtils.toGearUseFeatures(sources);
  }

  static toVesselUseFeatures(sources: ActivityMonth[]): VesselUseFeatures[] {
    return (sources || []).map((m) => VesselUseFeatures.fromObject(m.asObject())).filter(VesselUseFeatures.isNotEmpty);
  }

  static toGearUseFeatures(sources: ActivityMonth[]): GearUseFeatures[] {
    return (sources || []).flatMap((m) =>
      ((m.isActive === VesselUseFeaturesIsActiveEnum.ACTIVE && m.gearUseFeatures) || []).filter(GearUseFeatures.isNotEmpty).map((guf, index) => {
        guf.rankOrder = index + 1;
        guf.fishingAreas = guf.fishingAreas?.filter(FishingArea.isNotEmpty) || [];
        return guf;
      })
    );
  }
}
