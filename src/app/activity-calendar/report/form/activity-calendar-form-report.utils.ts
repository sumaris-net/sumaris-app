import { ActivityCalendar } from '@app/activity-calendar/model/activity-calendar.model';
import {
  ActivityCalendarFormReport,
  ActivityCalendarFormReportPageDimentions,
  ActivityCalendarFormReportStats,
} from './activity-calendar-form.report';
import {
  CORE_CONFIG_OPTIONS,
  ConfigService,
  DateUtils,
  LocalSettingsService,
  StatusIds,
  arrayDistinct,
  firstNotNilPromise,
  isEmptyArray,
  isNotEmptyArray,
  isNotNil,
  splitById,
} from '@sumaris-net/ngx-components';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { Metier } from '@app/referential/metier/metier.model';
import { GearPhysicalFeatures } from '@app/activity-calendar/model/gear-physical-features.model';
import moment from 'moment';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';
import { PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { GearPhysicalFeaturesUtils } from '@app/activity-calendar/model/gear-physical-features.utils';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { VesselOwnerPeriodFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselOwnerService } from '@app/vessel/services/vessel-owner.service';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';

export async function computeCommonActivityCalendarFormReportStats(
  data: ActivityCalendar,
  stats: ActivityCalendarFormReportStats,
  programRefService: ProgramRefService,
  vesselSnapshotService: VesselSnapshotService,
  settings: LocalSettingsService,
  program: Program,
  strategy: Strategy,
  isBlankForm: boolean
): Promise<ActivityCalendarFormReportStats> {
  stats.program = program;
  stats.strategy = strategy;

  stats.footerText = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_FOOTER);
  stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_LEFT_LOGO_URL);
  stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_HEADER_RIGHT_LOGO_URL);
  stats.vesselAttributes = (await vesselSnapshotService.getAutocompleteFieldOptions('vesselSnapshot'))?.attributes;

  stats.displayAttributes = {
    vesselSnapshot: settings.getFieldDisplayAttributes('vesselSnapshot', ['registrationCode', 'name']),
    vesselOwner: settings.getFieldDisplayAttributes('vesselOwner', ['lastName', 'firstName']),
  };

  stats.pmfm = {
    activityMonth: await programRefService.loadProgramPmfms(data.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
      strategyId: stats.strategy.id,
    }),
    activityCalendar: await programRefService.loadProgramPmfms(data.program.label, {
      acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
      strategyId: stats.strategy.id,
    }),
    gpf: !isBlankForm
      ? await programRefService.loadProgramPmfms(data.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_PHYSICAL_FEATURES,
          strategyId: stats.strategy.id,
        })
      : [
          DenormalizedPmfmStrategy.fromObject({
            id: -1,
            name: stats.program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_PHYSICAL_GEAR_PMFM_1),
          }),
          DenormalizedPmfmStrategy.fromObject({
            id: -2,
            name: stats.program.getPropertyAsStrings(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_PHYSICAL_GEAR_PMFM_2),
          }),
        ],
    guf: !isBlankForm
      ? await programRefService.loadProgramPmfms(data.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR_GEAR_USE_FEATURES,
          strategyId: stats.strategy.id,
        })
      : [],
  };

  stats.pmfmById = {
    activityMonth: splitById(stats.pmfm.activityMonth),
    activityCalendar: splitById(stats.pmfm.activityCalendar),
    gpf: splitById(stats.pmfm.gpf),
    guf: splitById(stats.pmfm.guf),
    forGpfTable: splitById(stats.pmfm.forGpfTable),
  };

  // Order survey qualification values by alphabetical order
  stats.surveyQualificationQualitativeValues = stats.pmfm.activityCalendar
    .filter((pmfm) => pmfm.id === PmfmIds.SURVEY_QUALIFICATION)[0]
    ?.qualitativeValues.filter((qv) => (isBlankForm ? true : qv.statusId === StatusIds.ENABLE))
    .sort((a, b) => (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));

  return stats;
}

export async function computeIndividualActivityCalendarFormReportStats(
  data: ActivityCalendar,
  stats: ActivityCalendarFormReportStats,
  pageDimensions: ActivityCalendarFormReportPageDimentions,
  configService: ConfigService,
  vesselOwnerService: VesselOwnerService,
  vesselOwnerPeridodService: VesselOwnerPeridodService,
  isBlankForm: boolean
): Promise<ActivityCalendarFormReportStats> {
  const timezone = (await firstNotNilPromise(configService.config)).getProperty(CORE_CONFIG_OPTIONS.DB_TIMEZONE) || DateUtils.moment().tz();
  const fishingAreaCount: number = isBlankForm
    ? stats.program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_FISHING_AREA_PER_METIER)
    : null;

  stats.activityMonth = ActivityMonthUtils.fromActivityCalendar(data, {
    fillEmptyGuf: true,
    fillEmptyFishingArea: true,
    fishingAreaCount,
    timezone,
  });

  computeActivityMonthColspan(stats, isBlankForm);

  if (!isBlankForm) {
    const gpfGearIds = (data.gearPhysicalFeatures || []).filter((gpf) => isNotNil(gpf.gear)).map((gph) => gph.gear.id);
    stats.pmfm.gpf = stats.pmfm.gpf.filter(
      (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.gearIds) || pmfm.gearIds.some((gearId) => gpfGearIds.includes(gearId))
    );
    const gufGearIds = (data.gearUseFeatures || []).filter((guf) => isNotNil(guf.gear)).map((guf) => guf.gear.id);
    stats.pmfm.guf = stats.pmfm.guf.filter(
      (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.gearIds) || pmfm.gearIds.some((gearId) => gufGearIds.includes(gearId))
    );
  }

  stats.pmfm.forGpfTable = arrayDistinct(stats.pmfm.gpf.concat(stats.pmfm.guf), 'id');

  stats.filteredAndOrderedGpf = isBlankForm ? data.gearPhysicalFeatures : GearPhysicalFeaturesUtils.fromActivityCalendar(data, { timezone });

  // compute last vessel owner
  if (isBlankForm) {
    stats.lastVesselOwner = VesselOwner.fromObject({});
  } else {
    // TODO : get the start date and the end date relative to the clandar year ???
    const startDate = (timezone ? DateUtils.moment().tz(timezone) : DateUtils.moment()).year(data.year).startOf('year');
    const endDate = startDate.clone().endOf('year');
    const filter = VesselOwnerPeriodFilter.fromObject({
      vesselId: data.vesselSnapshot.id,
      startDate,
      endDate,
    });
    const vesselOwnerPeriods = await vesselOwnerPeridodService.loadAll(0, 100, 'startDate', 'asc', filter, {
      fetchPolicy: 'cache-first',
    });
    const lastVesselOwner = isNotEmptyArray(vesselOwnerPeriods.data) ? vesselOwnerPeriods.data[0].vesselOwner : VesselOwner.fromObject({});

    if (isNotNil(lastVesselOwner?.id)) {
      stats.lastVesselOwner = await vesselOwnerService.load(lastVesselOwner.id);
    } else {
      stats.lastVesselOwner = VesselOwner.fromObject({});
    }
  }

  computeMetierTableChunk(stats, pageDimensions);

  return stats;
}

export function fillActivityCalendarBlankData(data: ActivityCalendar, program: Program): ActivityCalendar {
  const nbOfMetierBlock = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_METIER_BLOCK);
  const nbOfGearsColumn = program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_GEARS_COLUMN);
  data.gearPhysicalFeatures = Array(nbOfGearsColumn).fill(
    GearPhysicalFeatures.fromObject({
      metier: Metier.fromObject({}),
    })
  );
  data.gearUseFeatures = Array(nbOfMetierBlock)
    .fill(-1)
    .map((value, index) =>
      GearUseFeatures.fromObject({
        metier: Metier.fromObject({ id: value * index - 1 }),
      })
    );
  data.year = moment().year();
  return data;
}

function computeActivityMonthColspan(stats: ActivityCalendarFormReportStats, isBlankForm: boolean): ActivityCalendarFormReportStats {
  stats.activityMonthColspan = stats.activityMonth.reduce((acc, month) => {
    const result = {};
    month.gearUseFeatures.forEach((_, idx) => (result[idx] = 1));
    acc.push(result);
    return acc;
  }, []);

  if (!isBlankForm) {
    for (let monthIdx = 0; monthIdx < stats.activityMonthColspan.length - 1; monthIdx++) {
      const gufs = stats.activityMonth[monthIdx].gearUseFeatures;
      for (let gufIdx = 0; gufIdx < gufs.length; gufIdx++) {
        if (stats.activityMonthColspan[monthIdx][gufIdx] === 0) continue;
        const guf = gufs[gufIdx];
        let nextMonthIdx = monthIdx;
        let colspanCount = 1;
        do {
          nextMonthIdx++;
          // This is the last month
          if (stats.activityMonth[nextMonthIdx] === undefined) break;
          const nextMonthGuf = stats.activityMonth[nextMonthIdx].gearUseFeatures[gufIdx];
          if (isNotNil(guf.metier?.id) && guf.metier?.id === nextMonthGuf.metier?.id) {
            stats.activityMonthColspan[nextMonthIdx][gufIdx] = 0;
            colspanCount++;
          }
        } while (stats.activityMonthColspan[nextMonthIdx][gufIdx] === 0);
        stats.activityMonthColspan[monthIdx][gufIdx] = colspanCount;
      }
    }
  }

  return stats;
}

function computeMetierTableChunk(stats: ActivityCalendarFormReportStats, pageDimensions: ActivityCalendarFormReportPageDimentions) {
  stats.metierTableChunks = [];

  const metierChunks: { metierIndex: number; fishingAreasIndexes: number[] }[] = stats.activityMonth[0].gearUseFeatures.map((guf, index) => {
    return {
      metierIndex: index,
      fishingAreasIndexes: guf.fishingAreas.map((_, index) => index),
    };
  });

  const totalAvailableHeightForContent =
    pageDimensions.height - pageDimensions.marginTop - pageDimensions.marginBottom - pageDimensions.headerHeight - pageDimensions.footerHeight;
  const heightOfEffortSection =
    pageDimensions.sectionTitleHeight +
    pageDimensions.monthTableRowHeight +
    (stats.pmfm.activityMonth.length + ActivityCalendarFormReport.nbOfNonPmfmRowInEffortTable) * pageDimensions.monthTableRowHeight +
    pageDimensions.investigationQualificationSectionHeight;
  const heightOfGearSection =
    pageDimensions.marginTop / 2 +
    pageDimensions.sectionTitleHeight +
    pageDimensions.gpfTableRowTitleHeight +
    stats.pmfm.forGpfTable.length * pageDimensions.gpfTableRowHeight;
  const heighOfMetierTableHead = pageDimensions.marginTop + pageDimensions.sectionTitleHeight + pageDimensions.monthTableRowTitleHeight;

  const availableHeightOnFirstPage = totalAvailableHeightForContent - heightOfEffortSection - heighOfMetierTableHead;
  const availableHeightOnOtherPage = totalAvailableHeightForContent - heighOfMetierTableHead;

  const heightNeededByEachMetierChunk = metierChunks.map((chunk) => {
    const nbOfFishingArea = chunk.fishingAreasIndexes.length;
    return pageDimensions.monthTableMetierRowHeight + pageDimensions.monthTableRowHeight * nbOfFishingArea;
  });

  let currentChunkItems = [];
  let availableHeight = availableHeightOnFirstPage;
  while (isNotEmptyArray(metierChunks)) {
    const currentChunkHeight = heightNeededByEachMetierChunk.shift();
    // If not enoughs height to fit on current page
    if (currentChunkHeight > availableHeight) {
      let totalHeightNeededByRemainMetierChunk = heightNeededByEachMetierChunk.reduce((r, i) => (r += i), 0);
      // In this case, it has not enoughs space on the first page to put
      // a metier chunk
      if (isEmptyArray(currentChunkItems)) {
        stats.metierTableChunks.push(null);
        // As the chunk was not been consumed, re add its height
        totalHeightNeededByRemainMetierChunk += currentChunkHeight;
      } else {
        // Create new page
        stats.metierTableChunks.push(currentChunkItems);
        currentChunkItems = [];
      }
      availableHeight = availableHeightOnOtherPage;
    }
    currentChunkItems.push(metierChunks.shift());
    availableHeight -= currentChunkHeight;
  }
  stats.metierTableChunks.push(currentChunkItems);
  // If has not enoughs space to put physicalGear table,
  // put it in a new page.
  if (availableHeight - heightOfGearSection < 0) {
    stats.metierTableChunks.push(null);
  }
}
