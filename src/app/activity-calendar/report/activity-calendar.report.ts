import { Component, Injector, ViewEncapsulation } from '@angular/core';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { AppDataEntityReport } from '@app/data/report/data-entity-report.class';
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
import { FishingArea } from '@app/data/fishing-area/fishing-area.model';
import { GearUseFeatures } from '../model/gear-use-features.model';
import { Metier } from '@app/referential/metier/metier.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import moment from 'moment';

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
  activityMonthColspan?: number[][];
  metierTableChunks?: { gufId: number; fishingAreasIds: number[] }[][];
}

@Component({
  selector: 'app-activity-calendar-report',
  templateUrl: './activity-calendar.report.html',
  styleUrls: ['./activity-calendar.report.scss', '../../data/report/base-form-report.scss'],
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
    gufTableRowTitleHeight: 20,
    gufTableColTitleWidth: 120,
    gufTableRowHeight: 20,
    investigationQualificationSectionHeight: 60,
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

    stats.footerText = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_FOOTER);
    stats.logoHeadLeftUrl = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_LEFT_URL);
    stats.logoHeadRightUrl = stats.program.getProperty(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_LOGO_HEAD_RIGHT_URL);

    if (this.isBlankForm) {
      const nbOfMetier = stats.program.getPropertyAsInt(ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_METIER);
      const nbOfFishingAreaPerMetier = stats.program.getPropertyAsInt(
        ProgramProperties.ACTIVITY_CALENDAR_REPORT_FORM_BLANK_NB_FISHING_AREA_PER_METIER
      );
      data.gearUseFeatures = Array(nbOfMetier).fill(
        GearUseFeatures.fromObject({
          metier: Metier.fromObject({}),
          fishingAreas: Array(nbOfFishingAreaPerMetier).fill(FishingArea.fromObject({})),
        })
      );
      data.vesselSnapshot = VesselSnapshot.fromObject({});
      data.year = moment().year();
    }

    stats.activityMonth = ActivityMonthUtils.fromActivityCalendar(data, { fillEmptyGuf: true, fillEmptyFishingArea: true });

    this.computeActivityMonthColspan(stats);

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
    return this.isBlankForm
      ? this.translate.instant('ACTIVITY_CALENDAR.REPORT.BLANK_TITLE')
      : this.translate.instant('COMMON.REPORT.REPORT') +
          '&nbsp' +
          this.translateContextService.instant('ACTIVITY_CALENDAR.EDIT.TITLE', this.i18nContext.suffix, {
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

    const metierChunks: { gufId: number; fishingAreasIds: number[] }[] = data.gearUseFeatures.map((guf) => {
      return {
        gufId: guf.id,
        fishingAreasIds: guf.fishingAreas.map((fa) => fa.id),
      };
    });

    // Take the width because the page is a landscape
    const totalAvailableHeightForContent =
      this.pageDimensions.width -
      this.pageDimensions.marginTop -
      this.pageDimensions.marginBottom -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight;
    const heightOfEffortSection =
      this.pageDimensions.sectionTitleHeight +
      this.pageDimensions.monthTableRowHeight +
      stats.effortsTableRows.length * this.pageDimensions.monthTableRowHeight +
      this.pageDimensions.investigationQualificationSectionHeight;
    const heightOfGearSection =
      this.pageDimensions.marginTop / 2 +
      this.pageDimensions.sectionTitleHeight +
      this.pageDimensions.gufTableRowTitleHeight +
      stats.pmfm.physicalGear.length * this.pageDimensions.gufTableRowHeight;
    const heighOfMetierTableHead =
      this.pageDimensions.marginTop + this.pageDimensions.sectionTitleHeight + this.pageDimensions.monthTableRowTitleHeight;

    const availableHeightOnFirstPage = totalAvailableHeightForContent - heightOfEffortSection - heighOfMetierTableHead;
    const availableHeightOnOtherPage = totalAvailableHeightForContent - heighOfMetierTableHead;

    const heightNeededByEachMetierChunk = metierChunks.map((chunk) => {
      const nbOfFishingArea = chunk.fishingAreasIds.length;
      // `+ 1` to count the metier row
      return this.pageDimensions.monthTableRowHeight * (nbOfFishingArea + 1);
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

  protected computeActivityMonthColspan(stats: ActivityCalendarReportStats) {
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
            if (guf.id === nextMonthGuf.id) {
              stats.activityMonthColspan[nextMonthIdx][gufIdx] = 0;
              colspanCount++;
            }
          } while (stats.activityMonthColspan[nextMonthIdx][gufIdx] === 0);
          stats.activityMonthColspan[monthIdx][gufIdx] = colspanCount;
        }
      }
    }
  }
}
