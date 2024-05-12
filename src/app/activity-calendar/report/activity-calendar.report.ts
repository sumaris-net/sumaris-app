import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
import { Metier } from '@app/referential/metier/metier.model';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';
import { Strategy } from '@app/referential/services/model/strategy.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { StrategyRefService } from '@app/referential/services/strategy-ref.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { IRevealExtendedOptions } from '@app/shared/report/reveal/reveal.component';
import { environment } from '@environments/environment';
import { TranslateContextService, isEmptyArray, isNotEmptyArray, isNotNil, referentialToString } from '@sumaris-net/ngx-components';
import { ActivityCalendarService } from '../activity-calendar.service';
import { ActivityMonth } from '../calendar/activity-month.model';
import { ActivityMonthUtils } from '../calendar/activity-month.utils';
import { IsActiveList } from '../calendar/calendar.component';
import { ActivityCalendar } from '../model/activity-calendar.model';

export class ActivityCalendarReportStats extends BaseReportStats {
  subtitle?: string;
  footerText?: string;
  logoHeadLeftUrl?: string;
  logoHeadRightUrl?: string;
  strategy: Strategy;
  activityMonth?: ActivityMonth[];
  pmfm?: {
    activityMonth?: IPmfm[];
    activityCalendar?: IPmfm[];
    physicalGear?: IPmfm[];
  };
  effortsTableRows?: { title: string; values: string[] }[];
  metierTableChunks?: {
    [key: number]: {
      fishingAreasByIds: { [key: number]: FishingArea };
      metier: Metier;
    };
  }[];
}

@Component({
  selector: 'app-activity-calendar-report',
  templateUrl: './activity-calendar.report.html',
  styleUrls: ['./activity-calendar.report.scss', '../../trip/trip/report/form/form-trip.report.scss', '../../data/report/base-report.scss'],
  providers: [],
  encapsulation: ViewEncapsulation.None,
})
export class ActivityCalendarReport extends AppDataEntityReport<ActivityCalendar, number, ActivityCalendarReportStats> {
  readonly pmfmIdsMap = PmfmIds;

  public static readonly isBlankFormParam = 'isBlankForm';

  protected logPrefix = 'trip-form-report';
  protected isBlankForm: boolean;

  protected readonly ActivityCalendarService: ActivityCalendarService;
  protected readonly strategyRefService: StrategyRefService;
  protected readonly programRefService: ProgramRefService;
  protected readonly vesselSnapshotService: VesselSnapshotService;
  protected readonly translateContextService: TranslateContextService;

  protected readonly pageDimensions = Object.freeze({
    height: 297 * 4,
    width: 210 * 4,
    marginTop: 16,
    marginBottom: 16,
    headerHeight: 80,
    footerHeight: 35,
    sectionTitleHeight: 25,
    monthTableRowTitleHeight: 20,
    monthTableRowHeight: 30,
    gearTableRowTitleHeight: 20,
    gearTableRowHeight: 20,
    investigationQualificationSectionHeight: 86,
  });

  protected filterPmfmSurveyQualification(pmfm: IPmfm): boolean {
    return PmfmIds.SURVEY_QUALIFICATION === pmfm.id;
  }

  constructor(injector: Injector) {
    super(injector, ActivityCalendar, ActivityCalendarReportStats);
    this.ActivityCalendarService = this.injector.get(ActivityCalendarService);
    this.strategyRefService = this.injector.get(StrategyRefService);
    this.programRefService = this.injector.get(ProgramRefService);
    this.vesselSnapshotService = this.injector.get(VesselSnapshotService);
    this.translateContextService = this.injector.get(TranslateContextService);

    this.isBlankForm = this.route.snapshot.data[ActivityCalendarReport.isBlankFormParam];
    this.debug = !environment.production;
  }

  computePrintHref(data: ActivityCalendar, stats: ActivityCalendarReportStats): URL {
    if (this.uuid) return super.computePrintHref(data, stats);
    else return new URL(window.location.origin + this.computeDefaultBackHref(data, stats).replace(/\?.*$/, '') + '/report/form');
  }

  protected async loadData(id: number, opts?: any): Promise<ActivityCalendar> {
    console.log(`[${this.logPrefix}] loadData`);
    let data: ActivityCalendar;
    if (this.isBlankForm) {
      // Keep id : needed by method like `computeDefaultBackHref`
      const realData = await this.ActivityCalendarService.load(id, { ...opts });
      data = ActivityCalendar.fromObject({
        id: id,
        program: Program.fromObject({ label: realData.program.label }),
      });
    } else {
      data = await this.ActivityCalendarService.load(id, { ...opts });
    }
    if (!data) throw new Error('ERROR.LOAD_ENTITY_ERROR');
    return data;
  }

  protected computeSlidesOptions(data: ActivityCalendar, stats: ActivityCalendarReportStats): Partial<IRevealExtendedOptions> {
    return {
      ...super.computeSlidesOptions(data, stats),
      width: this.pageDimensions.width,
      height: this.pageDimensions.height,
      center: false,
    };
  }

  protected async computeStats(data: ActivityCalendar, opts?: IComputeStatsOpts<ActivityCalendarReportStats>): Promise<ActivityCalendarReportStats> {
    const stats = new ActivityCalendarReportStats();

    // Get program and options
    stats.program = await this.programRefService.loadByLabel(data.program.label);
    // TODO Need to get strategy resolution ?
    // const strategyResolution = stats.program.getProperty<DataStrategyResolution>(ProgramProperties.DATA_STRATEGY_RESOLUTION);
    // By default is `last`
    stats.strategy = await this.strategyRefService.loadByFilter({
      programId: stats.program.id,
      acquisitionLevels: [AcquisitionLevelCodes.ACTIVITY_CALENDAR, AcquisitionLevelCodes.MONTHLY_ACTIVITY],
    });

    stats.subtitle = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_SUBTITLE);
    stats.footerText = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_LOGO_HEAD_RIGHT_URL);

    stats.activityMonth = ActivityMonthUtils.fromActivityCalendar(data, { fillNullGuf: true });
    stats.pmfm = {
      activityMonth: await this.programRefService.loadProgramPmfms(data.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.MONTHLY_ACTIVITY,
        strategyId: stats.strategy.id,
      }),
      activityCalendar: await this.programRefService.loadProgramPmfms(data.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.ACTIVITY_CALENDAR,
        strategyId: stats.strategy.id,
      }),
      physicalGear: await this.programRefService.loadProgramPmfms(data.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR,
        strategyId: stats.strategy.id,
      }),
    };

    stats.effortsTableRows = [
      {
        title: this.translate.instant('ACTIVITY_CALENDAR.REPORT.VESSEL_OWNER'),
        values: new Array(12).fill('TODO'),
      },
      {
        title: this.translate.instant('ACTIVITY_CALENDAR.REPORT.REGISTRATION_LOCATION'),
        values: stats.activityMonth.map((_) => referentialToString(data.vesselSnapshot.registrationLocation, ['label', 'name'])),
      },
      {
        title: this.translate.instant('ACTIVITY_CALENDAR.REPORT.IS_ACTIVE'),
        values: stats.activityMonth.map((month) => {
          const isActive = IsActiveList[month.isActive]?.label;
          return isNotNil(isActive) ? this.translate.instant(isActive) : '';
        }),
      },
    ].concat(
      stats.pmfm.activityMonth.map((pmfm) => {
        return {
          title: PmfmUtils.getPmfmName(pmfm),
          values: stats.activityMonth.map((month) => PmfmValueUtils.valueToString(month.measurementValues[pmfm.id], { pmfm, html: true })),
        };
      })
    );

    this.computeMetierTableChunk(data, stats);

    return stats;
  }

  protected async computeTitle(data: ActivityCalendar, stats: ActivityCalendarReportStats): Promise<string> {
    return this.translateContextService.instant('ACTIVITY_CALENDAR.REPORT.TOOL_BAR_TITLE', this.i18nContext.suffix, {
      year: data.year,
      vessel: referentialToString(data.vesselSnapshot, ['exteriorMarking', 'name']),
    });
  }

  protected computeDefaultBackHref(data: ActivityCalendar, stats: ActivityCalendarReportStats): string {
    return `/activity-calendar/${data.id}`;
  }

  protected computeShareBasePath(): string {
    // TODO
    return 'activity-calendar/report';
  }

  protected computeMetierTableChunk(data: ActivityCalendar, stats: ActivityCalendarReportStats) {
    stats.metierTableChunks = [];
    const metierChunks = [];
    for (const item of data.gearUseFeatures) {
      metierChunks.push([
        item.id,
        {
          metier: item.metier,
          fishingAreasByIds: item.fishingAreas.reduce((acc, fishingArea) => {
            acc[fishingArea.id] = fishingArea;
            return acc;
          }, {}),
        },
      ]);
    }

    const availableHeightOnAllInOnePage = this.getAvailableSpaceForMetierBlockInTable(stats, {
      withFirstPageItems: true,
      withLastPageItems: true,
    });

    const availableHeightOnFirstPage = this.getAvailableSpaceForMetierBlockInTable(stats, {
      withFirstPageItems: true,
      withLastPageItems: false,
    });

    const availableHeightOnLastPage = this.getAvailableSpaceForMetierBlockInTable(stats, {
      withFirstPageItems: false,
      withLastPageItems: true,
    });

    const availableHeightOnMiddlePage = this.getAvailableSpaceForMetierBlockInTable(stats, {
      withFirstPageItems: false,
      withLastPageItems: false,
    });

    const heightNeededByEachMetierChunk = metierChunks.map((chunk) => {
      const nbOfFishingArea = Object.keys(chunk[1].fishingAreasByIds).length;
      // `+ 1` to count the metier row
      return this.pageDimensions.monthTableRowHeight * (nbOfFishingArea + 1);
    });

    const totalHeightNeededByAllMetierChunk = heightNeededByEachMetierChunk.reduce((r, i) => (r += i), 0);
    // Check if all chunk can fit on one page
    if (totalHeightNeededByAllMetierChunk <= availableHeightOnAllInOnePage) {
      stats.metierTableChunks = [Object.fromEntries(metierChunks)];
      return;
    }

    let currentChunkItems = [];
    let availableHeight = availableHeightOnFirstPage;
    while (isNotEmptyArray(metierChunks)) {
      // Case when that not have enough for metier table to fit on the first
      // page : add empty section to create a page break
      const currentChunkHeight = heightNeededByEachMetierChunk.shift();
      // If not enoughs height to fit on current page
      if (currentChunkHeight > availableHeight) {
        let totalHeightNeededByRemainMetierChunk = heightNeededByEachMetierChunk.reduce((r, i) => (r += i), 0);
        if (isEmptyArray(currentChunkItems)) {
          stats.metierTableChunks.push(null);
          // The chunk has not been consumed : re add its height
          totalHeightNeededByRemainMetierChunk += currentChunkHeight;
        } else {
          stats.metierTableChunks.push(Object.fromEntries(currentChunkItems));
          currentChunkItems = [];
        }
        availableHeight = totalHeightNeededByRemainMetierChunk <= availableHeightOnLastPage ? availableHeightOnLastPage : availableHeightOnMiddlePage;
      }
      currentChunkItems.push(metierChunks.shift());
      availableHeight -= currentChunkHeight;
    }
    stats.metierTableChunks.push(Object.fromEntries(currentChunkItems));
    // If has not enough height tu put chunk on the last page,
    // add an empty empty metierTableChunks which will generate a new
    // page that only contain gear table.
    if (availableHeight > availableHeightOnLastPage) {
      stats.metierTableChunks.push(null);
    }
  }

  protected getAvailableSpaceForMetierBlockInTable(
    stats: ActivityCalendarReportStats,
    opts?: { withFirstPageItems?: boolean; withLastPageItems?: boolean }
  ) {
    let firstPageItemHeight = 0;
    let lastPageItemsHeight = 0;

    if (opts && opts?.withFirstPageItems) {
      const effortsSectionHeight =
        this.pageDimensions.sectionTitleHeight +
        this.pageDimensions.monthTableRowHeight +
        stats.effortsTableRows.length * this.pageDimensions.monthTableRowHeight;
      firstPageItemHeight = effortsSectionHeight + this.pageDimensions.investigationQualificationSectionHeight;
    }

    if (opts && opts?.withLastPageItems) {
      const gearSectionHeight =
        this.pageDimensions.marginTop +
        this.pageDimensions.sectionTitleHeight +
        this.pageDimensions.gearTableRowTitleHeight +
        stats.pmfm.physicalGear.length * this.pageDimensions.gearTableRowHeight;
      lastPageItemsHeight = gearSectionHeight;
    }

    // Take the width because the page is a landscape
    let availableSpace = this.pageDimensions.width;
    availableSpace -= this.pageDimensions.marginTop + this.pageDimensions.marginBottom;
    availableSpace -= this.pageDimensions.headerHeight + this.pageDimensions.footerHeight;
    availableSpace -= firstPageItemHeight + lastPageItemsHeight;

    // Title for metier section
    availableSpace -= this.pageDimensions.sectionTitleHeight;
    // Title row for metier table
    availableSpace -= this.pageDimensions.monthTableRowTitleHeight;

    return availableSpace;
  }
}
