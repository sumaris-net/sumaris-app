import { Component, inject, Input, ViewEncapsulation } from '@angular/core';
import { ActivityMonthUtils } from '@app/activity-calendar/calendar/activity-month.utils';
import { GearPhysicalFeatures } from '@app/activity-calendar/model/gear-physical-features.model';
import { GearPhysicalFeaturesUtils } from '@app/activity-calendar/model/gear-physical-features.utils';
import { GearUseFeatures } from '@app/activity-calendar/model/gear-use-features.model';
import { AppCoreModule } from '@app/core/core.module';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { ReportAppendixSection, ReportContent } from '@app/data/report/report.content.class';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { PmfmUtils } from '@app/referential/services/model/pmfm-utils';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { VesselOwnerPeriodFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselOwner } from '@app/vessel/services/model/vessel-owner.model';
import { VesselOwnerPeridodService } from '@app/vessel/services/vessel-owner-period.service';
import { VesselOwnerService } from '@app/vessel/services/vessel-owner.service';
import { arrayDistinct, DateUtils, EntityAsObjectOptions, isEmptyArray, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { AppDataEntityPipesModule } from '../../../data/pipes/pipes.module';
import { AppReferentialPipesModule } from '../../../referential/pipes/referential-pipes.module';
import { ActivityMonth } from '../../calendar/activity-month.model';
import { IsActiveList } from '../../calendar/calendar.component';
import { ActivityCalendar } from '../../model/activity-calendar.model';
import { ActivityCalendarFormsReportStats } from './activity-calendar-form.report';

export interface ActivityCalendarFormReportContentPageDimensions {
  marginTop: number;
  marginBottom: number;
  headerHeight: number;
  footerHeight: number;
  sectionTitleHeight: number;
  monthTableRowTitleHeight: number;
  monthTableRowHeight: number;
  monthTableMetierRowHeight: number;
  gpfTableRowTitleHeight: number;
  gpfTableColTitleWidth: number;
  gpfTableRowHeight: number;
  investigationQualificationSectionHeight: number;
}

export class ActivityCalendarFormReportContentStats extends BaseReportStats {
  subtitle?: string;
  activityMonth?: ActivityMonth[];
  activityMonthColspan?: number[][];
  metierTableChunks?: { gufId: number; fishingAreasIndexes: number[] }[][];
  lastVesselOwner: VesselOwner;
  pmfm: {
    forGpfTable: IDenormalizedPmfm[];
  };
  pmfmById: {
    forGpfTable?: { [key: number]: IDenormalizedPmfm };
  };
  filteredAndOrderedGpf?: (GearPhysicalFeatures | GearUseFeatures)[];

  static fromObject(source: any): ActivityCalendarFormReportContentStats {
    if (!source) return source;
    if (source instanceof ActivityCalendarFormReportContentStats) return source as ActivityCalendarFormReportContentStats;
    const target = new ActivityCalendarFormReportContentStats();
    target.fromObject(source);
    return target;
  }

  fromObject(source: any) {
    super.fromObject(source);
    this.subtitle = source.subtitle;
    this.activityMonth = source?.activityMonth?.map(ActivityMonth.fromObject) || null;
    this.activityMonthColspan = source.activityMonthColspan;
    this.metierTableChunks = source.metierTableChunks;
    this.lastVesselOwner = VesselOwner.fromObject(source.lastVesselOwner);
    this.pmfm = {
      forGpfTable: source?.pmfm?.forGpfTable?.map(DenormalizedPmfmStrategy.fromObject) || null,
    };
    this.pmfmById = {
      forGpfTable: splitById(this.pmfm.forGpfTable),
    };
    this.filteredAndOrderedGpf = source?.filteredAndOrderedGpf?.map((value: any) => {
      if (value.__typename === GearPhysicalFeatures.TYPENAME) {
        return GearPhysicalFeatures.fromObject(value);
      } else if (value.__typename === GearUseFeatures.TYPENAME) {
        return GearUseFeatures.fromObject(value);
      }
    });
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      subtitle: this.subtitle,
      activityMonth: this?.activityMonth?.map((item) => item.asObject(opts)) || null,
      activityMonthColspan: this.activityMonthColspan,
      metierTableChunks: this.metierTableChunks,
      lastVesselOwner: this.lastVesselOwner?.asObject(opts),
      pmfm: {
        forGpfTable: this?.pmfm?.forGpfTable?.map((item) => item.asObject(opts)) || null,
      },
      filteredAndOrderedGpf: this.filteredAndOrderedGpf.map((item) => item.asObject(opts)),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, ReportChunkModule, AppReferentialPipesModule, AppDataEntityPipesModule],
  selector: 'app-activity-calendar-form-report-content',
  templateUrl: './activity-calendar-form.report.content.html',
  styleUrls: ['../../../data/report/base-form-report.scss', './activity-calendar-form.report.content.scss'],
  providers: [],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarFormReportContent extends ReportContent<ActivityCalendar, ActivityCalendarFormReportContentStats> {
  readonly pmfmIdsMap = PmfmIds;

  protected readonly nbOfNonPmfmRowInEffortTable = 2;

  protected logPrefix = 'activity-calendar-form-report-content';
  protected pageDimensions: ActivityCalendarFormReportContentPageDimensions;

  protected readonly vesselOwnerService: VesselOwnerService = inject(VesselOwnerService);
  protected readonly vesselOwnerPeridodService: VesselOwnerPeridodService = inject(VesselOwnerPeridodService);

  protected readonly isActiveMap = Object.freeze(splitById(IsActiveList));

  protected filterPmfmSurveyQualification(pmfm: IPmfm): boolean {
    return PmfmIds.SURVEY_QUALIFICATION === pmfm.id;
  }

  protected filterPmfmAuctionHabit(pmfm: IPmfm): boolean {
    return PmfmIds.AUCTION_HABIT === pmfm.id;
  }

  @Input({ required: true }) parentStats: ActivityCalendarFormsReportStats;

  constructor() {
    super(ActivityCalendar, ActivityCalendarFormReportContentStats, { i18nPmfmPrefix: 'ACTIVITY_CALENDAR.REPORT.PMFM.' });
  }

  async ngOnStart(opts?: any): Promise<void> {
    this.pageDimensions = this.computePageDimensions();
    return super.ngOnStart(opts);
  }

  dataAsObject(source: ActivityCalendar, _?: EntityAsObjectOptions) {
    throw new Error('Method not implemented.');
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    // NOTE: There is not tips in ths reports
    return [];
  }

  protected async computeStats(
    data: ActivityCalendar,
    opts?: IComputeStatsOpts<ActivityCalendarFormReportContentStats>
  ): Promise<ActivityCalendarFormReportContentStats> {
    const stats = new ActivityCalendarFormReportContentStats();

    stats.activityMonth = ActivityMonthUtils.fromActivityCalendar(data, {
      fillEmptyGuf: true,
      fillEmptyFishingArea: true,
      fishingAreaCount: this.parentStats.options.fishingAreaCount,
      timezone: this.parentStats.options.timezone,
    });

    this.computeActivityMonthColspan(stats);

    if (this.isBlankForm) {
      stats.pmfm = {
        forGpfTable: arrayDistinct(this.parentStats.pmfm.gpf.concat(this.parentStats.pmfm.guf), 'id'),
      };
    } else {
      const gpfGearIds = (data.gearPhysicalFeatures || []).filter((gpf) => isNotNil(gpf.gear)).map((gph) => gph.gear.id);
      const gufGearIds = (data.gearUseFeatures || []).filter((guf) => isNotNil(guf.gear)).map((guf) => guf.gear.id);
      const mergedGearIds = arrayDistinct(gpfGearIds.concat(gufGearIds));
      const pmfmGpf = this.parentStats.pmfm.gpf.filter(
        (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.gearIds) || pmfm.gearIds.some((gearId) => mergedGearIds.includes(gearId))
      );
      const pmfmGuf = this.parentStats.pmfm.guf.filter(
        (pmfm) => !PmfmUtils.isDenormalizedPmfm(pmfm) || isEmptyArray(pmfm.gearIds) || pmfm.gearIds.some((gearId) => mergedGearIds.includes(gearId))
      );
      stats.pmfm = {
        forGpfTable: arrayDistinct(pmfmGpf.concat(pmfmGuf), 'id'),
      };
    }

    stats.filteredAndOrderedGpf = this.isBlankForm
      ? data.gearPhysicalFeatures
      : GearPhysicalFeaturesUtils.fromActivityCalendar(data, { timezone: this.parentStats.options.timezone });

    // compute last vessel owner
    const startDate = (this.parentStats.options.timezone ? DateUtils.moment().tz(this.parentStats.options.timezone) : DateUtils.moment())
      .year(data.year)
      .startOf('year');
    const endDate = startDate.clone().endOf('year');
    const filter = VesselOwnerPeriodFilter.fromObject({
      vesselId: data.vesselSnapshot.id,
      startDate,
      endDate,
    });
    const vesselOwnerPeriods = await this.vesselOwnerPeridodService.loadAll(0, 100, 'startDate', 'asc', filter, {
      fetchPolicy: 'cache-first',
    });
    const lastVesselOwner = isNotEmptyArray(vesselOwnerPeriods.data) ? vesselOwnerPeriods.data[0].vesselOwner : VesselOwner.fromObject({});

    if (isNotNil(lastVesselOwner?.id)) {
      stats.lastVesselOwner = await this.vesselOwnerService.load(lastVesselOwner.id);
    } else {
      stats.lastVesselOwner = VesselOwner.fromObject({});
    }

    this.computeMetierTableChunk(stats);

    return stats;
  }

  protected computeActivityMonthColspan(stats: ActivityCalendarFormReportContentStats): ActivityCalendarFormReportContentStats {
    stats.activityMonthColspan = stats.activityMonth.reduce((acc, month) => {
      const result = {};
      month.gearUseFeatures.forEach((_, idx) => (result[idx] = 1));
      acc.push(result);
      return acc;
    }, []);

    if (!this.isBlankForm) {
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

  protected computeMetierTableChunk(stats: ActivityCalendarFormReportContentStats) {
    stats.metierTableChunks = [];

    const metierChunks: { metierIndex: number; fishingAreasIndexes: number[] }[] = stats.activityMonth[0].gearUseFeatures.map((guf, index) => {
      return {
        metierIndex: index,
        fishingAreasIndexes: guf.fishingAreas.map((_, index) => index),
      };
    });

    const totalAvailableHeightForContent =
      this.parentPageDimensions.pageHeight -
      this.pageDimensions.marginTop -
      this.pageDimensions.marginBottom -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight;
    const heightOfEffortSection =
      this.pageDimensions.sectionTitleHeight +
      this.pageDimensions.monthTableRowHeight +
      (this.parentStats.pmfm.activityMonth.length + this.nbOfNonPmfmRowInEffortTable) * this.pageDimensions.monthTableRowHeight +
      this.pageDimensions.investigationQualificationSectionHeight;
    const heightOfGearSection =
      this.pageDimensions.marginTop / 2 +
      this.pageDimensions.sectionTitleHeight +
      this.pageDimensions.gpfTableRowTitleHeight +
      stats.pmfm.forGpfTable.length * this.pageDimensions.gpfTableRowHeight;
    const heighOfMetierTableHead =
      this.pageDimensions.marginTop + this.pageDimensions.sectionTitleHeight + this.pageDimensions.monthTableRowTitleHeight;

    const availableHeightOnFirstPage = totalAvailableHeightForContent - heightOfEffortSection - heighOfMetierTableHead;
    const availableHeightOnOtherPage = totalAvailableHeightForContent - heighOfMetierTableHead;

    const heightNeededByEachMetierChunk = metierChunks.map((chunk) => {
      const nbOfFishingArea = chunk.fishingAreasIndexes.length;
      return this.pageDimensions.monthTableMetierRowHeight + this.pageDimensions.monthTableRowHeight * nbOfFishingArea;
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

  protected computePageDimensions(): ActivityCalendarFormReportContentPageDimensions {
    return {
      marginTop: 16,
      marginBottom: 16,
      headerHeight: 80,
      footerHeight: 35,
      sectionTitleHeight: 25,
      monthTableRowTitleHeight: 20,
      monthTableRowHeight: 20,
      monthTableMetierRowHeight: 30,
      gpfTableRowTitleHeight: 20,
      gpfTableColTitleWidth: 200,
      gpfTableRowHeight: 20,
      investigationQualificationSectionHeight: 60,
    };
  }
}
