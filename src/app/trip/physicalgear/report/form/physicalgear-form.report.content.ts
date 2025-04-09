import { Component, inject, Input } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { MeasurementFormValues, MeasurementModelValues } from '@app/data/measurement/measurement.model';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import {
  CommonReportContentStats,
  ReportAppendixSection,
  ReportPmfmsTipsByPmfmIds,
  ReportTips,
  TipsReportChunk,
} from '@app/data/report/report.content.class';
import { ReportTableContent, ReportTableContentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table.content.class';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { Operation } from '@app/trip/trip/trip.model';
import { arrayDistinct, EntityAsObjectOptions, isNil, isNotEmptyArray, isNotNil, splitById } from '@sumaris-net/ngx-components';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';

interface PhysicalGearsReportFormContentPageDimension extends ReportTableContentPageDimension {
  columnGearCode: number;
  columnOpNum: number;
  columnComments: number;
  columnGearNum: number;
}

export class PhysicalGearsReportFormContentStats extends CommonReportContentStats {
  options: {
    showQualitativeValuesCheckBox: boolean;
    showByTable: boolean;
  };
  measurementValues: (MeasurementFormValues | MeasurementModelValues)[];
  pmfms: IDenormalizedPmfm[];
  pmfmsByIds?: { [key: number]: IDenormalizedPmfm };
  pmfmsByGearsId: { [key: number]: IDenormalizedPmfm[] };
  pmfmTipsByPmfmIds: ReportPmfmsTipsByPmfmIds[];
  operationsRankByGears: { [key: number]: number[] };
  table?: {
    tipsByTablePart: ReportTips[][];
    compactPmfmColumn: boolean;
    allPmfms: IDenormalizedPmfm[];
    nbLinesPeerPage: number;
    pmfmsColumnsWidthByPmfmIds: { [key: number]: number };
    tableParts: number[][];
  };

  fromObject(source: any) {
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsByIds = splitById(this.pmfms);
    this.measurementValues = source.measurementValues;
    this.pmfmsByGearsId = Object.keys(source.pmfmsByGearsId).reduce((result, key) => {
      result[key] = source.pmfmsByGearsId[key].map(DenormalizedPmfmStrategy.fromObject);
      return result;
    }, {});
    this.pmfmTipsByPmfmIds = source.pmfmTipsByPmfmIds;
    this.operationsRankByGears = source.operationsRankByGears;
    if (isNotNil(source.table)) {
      this.table = {
        tipsByTablePart: source.table.tipsByTablePart,
        compactPmfmColumn: source.table.compactPmfmColumn,
        allPmfms: PhysicalGearsReportFormContent.flatPmfmsByGearIds(this.pmfmsByGearsId),
        nbLinesPeerPage: source.table.nbLinesPeerPage,
        pmfmsColumnsWidthByPmfmIds: source.table.pmfmsColumnsWidthByPmfmIds,
        tableParts: source.table.tableParts,
      };
    }
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.pmfms.map((item) => item.asObject(opts)),
      measurementValues: this.measurementValues,
      pmfmsByGearsId: Object.keys(this.pmfmsByGearsId).reduce((result, key) => {
        result[key] = this.pmfmsByGearsId[key].map((pmfm: DenormalizedPmfmStrategy) => pmfm.asObject(opts));
        return result;
      }, {}),
      pmfmTipsByPmfmIds: this.pmfmTipsByPmfmIds,
      operationsRankByGears: this.operationsRankByGears,
      table: isNil(this.table)
        ? null
        : {
            compactPmfmColumn: this.table.compactPmfmColumn,
            nbLinesPeerPage: this.table.nbLinesPeerPage,
            pmfmsColumnsWidthByPmfmIds: this.table.pmfmsColumnsWidthByPmfmIds,
            tableParts: this.table.tableParts,
          },
    };
  }
}
@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, ReportChunkModule, AppReferentialPipesModule, TipsReportChunk, TableHeadPmfmNameReportChunk],
  selector: 'physicalgear-report-content',
  templateUrl: './physicalgear-form.report.content.html',
  styleUrls: ['../../../../data/report/base-form-report.scss'],
})
export class PhysicalGearsReportFormContent extends ReportTableContent<
  PhysicalGear[],
  PhysicalGearsReportFormContentStats,
  PhysicalGearsReportFormContentPageDimension
> {
  public static NB_LINE_PEER_PAGE = 10;

  protected logPrefix = '[physicalgear-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);

  @Input({ required: true }) operations: Operation[];
  @Input({ required: true }) multiTrip: boolean;

  public static flatPmfmsByGearIds(pmfmsByGearIds: { [key: number]: IDenormalizedPmfm[] }): IDenormalizedPmfm[] {
    return arrayDistinct(Object.values(pmfmsByGearIds).flat(), 'id').sort((a, b) => a.rankOrder - b.rankOrder);
  }

  constructor() {
    super(Array<PhysicalGear>, PhysicalGearsReportFormContentStats);
  }

  async ngOnStart(opts?: any): Promise<void> {
    // Set defaults
    this.i18nContext = {
      ...this.i18nContext,
      pmfmPrefix: 'TRIP.PHYSICAL_GEAR.PMFM.',
    };

    return super.ngOnStart(opts);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('TRIP.REPORT.FORM.PHYSICAL_GEAR.TITLE'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.pmfmTipsByPmfmIds),
      },
    ];
  }

  protected computePageDimensions(): PhysicalGearsReportFormContentPageDimension {
    return {
      ...this._computePageDimensions(),
      columnPmfmWidth: 90,
      columnPmfmWidthCompact: 30,
      columnGearCode: this.isBlankForm ? 90 : 180,
      columnOpNum: 120,
      columnComments: 360,
      columnGearNum: 30,
    };
  }

  protected async computeStats(
    data: PhysicalGear[],
    _?: IComputeStatsOpts<PhysicalGearsReportFormContentStats>
  ): Promise<PhysicalGearsReportFormContentStats> {
    const stats = new PhysicalGearsReportFormContentStats();
    const strategyId = this.strategy?.id;

    stats.options = {
      showQualitativeValuesCheckBox: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_BLANK_SHOW_QUALITATIVE_VALUES_CHECK_BOX),
      showByTable: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_REPORT_FORM_PHYSICAL_SHOW_BY_TABLE),
    };

    stats.pmfms = (
      await this.programRefService.loadProgramPmfms(this.program.label, {
        acquisitionLevel: AcquisitionLevelCodes.PHYSICAL_GEAR,
        strategyId,
      })
    ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id));

    stats.pmfmsByGearsId = data
      .map((physicalGear) => physicalGear.gear.id)
      .reduce((res, gearId) => {
        // Extract gearId for physicalGear and remove duplicates
        if (!res.includes(gearId)) res.push(gearId);
        return res;
      }, [])
      .reduce((res, gearId) => {
        // Group pmfm by gearId
        const pmfms = stats.pmfms.filter((pmfm: DenormalizedPmfmStrategy) => {
          return isNil(pmfm.gearIds) || pmfm.gearIds.includes(gearId);
        });
        res[gearId] = pmfms;
        return res;
      }, {});

    stats.measurementValues = data.map((gear) => gear.measurementValues);

    stats.operationsRankByGears = this.isBlankForm
      ? {}
      : data.reduce((result, gear) => {
          const ops = this.operations.filter((op) => op.physicalGear.id == gear.id);
          result[gear.id] = ops.map((op) => op.rankOrder);
          return result;
        }, {});

    if (stats.options.showByTable) {
      const allPmfms = PhysicalGearsReportFormContent.flatPmfmsByGearIds(stats.pmfmsByGearsId);
      const tableLeftColumnsWidth =
        this.pageDimensions.columnGearCode + (this.isBlankForm ? this.pageDimensions.columnGearNum : this.pageDimensions.columnOpNum);
      const tableRightColumnsWidth = this.pageDimensions.columnComments;
      const pmfmsColumnsWidthByPmfmIds = this.computePmfmColumnsWidthByPmfmIds(
        allPmfms,
        !this.isBlankForm,
        stats.options.showQualitativeValuesCheckBox
      );
      const tableParts = this.computeTablePart(
        allPmfms,
        pmfmsColumnsWidthByPmfmIds,
        this.parentPageDimensions.availableWidthForTableLandscape,
        tableLeftColumnsWidth,
        tableRightColumnsWidth
      );
      stats.pmfmTipsByPmfmIds = this.computeReportPmfmsTips(tableParts, stats.pmfms, this.limitTipsToShowOnAppendix);
      const tipsByTablePart: ReportTips[][] = [];
      if (this.isBlankForm) {
        tipsByTablePart[0] = [
          {
            index: '*',
            title: this.translate.instant('TRIP.PHYSICAL_GEAR.EDIT.GEAR'),
            items: this.strategy.gears.map((gear) => {
              return { label: gear.label, name: gear.name };
            }),
            showOnAppendix: false, // TODO: show on appendix if too many items
          },
        ];
      }
      this.computeReportPmfmsTips(tableParts, stats.pmfms, this.limitTipsToShowOnAppendix).forEach((tips, index) => {
        if (isNotEmptyArray(tipsByTablePart[index])) {
          tipsByTablePart[index] = tipsByTablePart[index].concat(Object.values(tips));
        } else {
          tipsByTablePart[index] = Object.values(tips);
        }
      });
      const maxTipsLength = Math.max(...tipsByTablePart.map((item) => item.length));
      stats.table = {
        tipsByTablePart,
        compactPmfmColumn: !this.isBlankForm,
        allPmfms,
        nbLinesPeerPage: PhysicalGearsReportFormContent.NB_LINE_PEER_PAGE - (maxTipsLength > 0 ? Math.ceil(maxTipsLength / 4) : 0),
        pmfmsColumnsWidthByPmfmIds,
        tableParts,
      };

      if (this.isBlankForm) {
        // Fill blank lines on blank form
        this.data = new Array(stats.table.nbLinesPeerPage)
          .fill(null)
          .map((_, index) => PhysicalGear.fromObject({ id: index + 1, rankOrder: index + 1 }));
        // Add tips to refer gear tips
      }
    } else {
      stats.pmfmTipsByPmfmIds = this.computeReportPmfmsTips([[0, stats.pmfms.length]], stats.pmfms, this.limitTipsToShowOnAppendix);
    }

    // header items
    {
      if (this.multiTrip) {
        stats.headerItems = [];
      } else {
        stats.headerItems = [
          this.translate.instant('TRIP.REPORT.FORM.TRIP_DEPARTURE_DATE_TIME') +
            this.translate.instant('COMMON.COLON') +
            ' ' +
            (this.isBlankForm ? '...../...../......' : this.departureDateTime),
        ];
      }
      stats.headerItems.push(
        this.translate.instant('TRIP.REPORT.FORM.VESSEL_NAME') +
          this.translate.instant('COMMON.COLON') +
          ' ' +
          (this.isBlankForm ? '.................................' : this.vesselName)
      );
      if (this.multiTrip) {
        stats.headerItems.push(
          this.translate.instant('TRIP.REPORT.VESSEL_EXTERIOR_MARKING') +
            this.translate.instant('COMMON.COLON') +
            ' ' +
            '.................................'
        );
      }
    }

    return stats;
  }
}
