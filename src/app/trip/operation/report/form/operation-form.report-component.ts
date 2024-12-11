import { Component, Input, inject } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { MeasurementFormValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { BaseReportStats, IComputeStatsOpts } from '@app/data/report/base-report.class';
import { FormReportPageDimensions } from '@app/data/report/common-report.class';
import { ReportChunkModule } from '@app/data/report/component/form/report-chunk.module';
import {
  ReportPmfmsTipsByPmfmIds,
  ReportTableComponent,
  ReportTableComponentPageDimension,
  ReportTips,
  TableHeadPmfmNameReportChunk,
  TipsReportChunk,
} from '@app/data/report/report-table-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { EntityAsObjectOptions, LatLongPattern, LocalSettingsService, arrayDistinct, isNil, isNotNil, splitById } from '@sumaris-net/ngx-components';

interface OperationFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnPmfmWidth: number;
  columnNumOpWidth: number;
  columnIndividualMeasureWidth: number;
  columnTripProgressWidth: number;
  columnGearSpeciesWidth: number;
  columnDateWidth: number;
  columnLatLongWidth: number;
}

export class OperationFromReportComponentStats extends BaseReportStats {
  options: {
    showEndDate: boolean;
    allowParentOperation: boolean;
    latLongPattern: LatLongPattern;
    fishingAreaDisplayAttributes: string[];
    columnCommentTitleText: string;
    limitTipsToShowOnAnnex: number;
  };
  pmfms: IDenormalizedPmfm[];
  pmfmsById: { [key: number]: IPmfm };
  childPmfms: IDenormalizedPmfm[];
  childPmfmsById: { [key: number]: IPmfm };
  tableHeadColspan: number;
  hasPmfm: {
    hasIndividualMeasure: boolean;
    tripProgress: boolean;
  };
  pmfmsTipsByPmfmIdByTableParts: ReportPmfmsTipsByPmfmIds[];
  tipsByTablePart: ReportTips[][];
  measurementValues: MeasurementFormValues[];
  pmfmsTablePart: number[][];
  pmfmsColumnWidthByPmfmsIds: { [key: number]: number };
  nbOperationByPage: number;

  fromObject(source: any): void {
    super.fromObject(source);
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsById = splitById(this.pmfms);
    this.childPmfms = source.childPmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.childPmfmsById = splitById(this.childPmfms);
    this.tableHeadColspan = source.tableHeadColspan;
    this.hasPmfm = source.hasPmfm;
    this.pmfmsTipsByPmfmIdByTableParts = source.pmfmsTipsByPmfmIdByTableParts;
    this.measurementValues = source.measurementValues;
    this.pmfmsTablePart = source.releasedTableParts;
    this.tipsByTablePart = source.tipsByTablePart;
    this.pmfmsColumnWidthByPmfmsIds = source.pmfmsColumnWidthByPmfmsIds;
    this.nbOperationByPage = source.nbOperationByPage;
  }

  asObject(opts?: EntityAsObjectOptions) {
    return {
      ...super.asObject(opts),
      options: this.options,
      pmfms: this.pmfms.map((pmfm) => pmfm.asObject(opts)),
      childPmfms: this.childPmfms.map((pmfm) => pmfm.asObject(opts)),
      tableHeadColspan: this.tableHeadColspan,
      hasPmfm: this.hasPmfm,
      pmfmsTipsByPmfmIdByTableParts: this.pmfmsTipsByPmfmIdByTableParts,
      measurementValues: this.measurementValues,
      releasedTableParts: this.pmfmsTablePart,
      pmfmsTablePart: this.pmfmsTablePart,
      pmfmsColumnWidthByPmfmsIds: this.pmfmsColumnWidthByPmfmsIds,
      nbOperationByPage: this.nbOperationByPage,
    };
  }
}

@Component({
  standalone: true,
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppReferentialModule,
    AppDataModule,
    ReportChunkModule,
    TipsReportChunk,
    TableHeadPmfmNameReportChunk,
  ],
  selector: 'operation-form-report-component',
  templateUrl: './operation-form.report-component.html',
  styleUrls: ['./operation-form.report-component.scss', '../../../../data/report/base-form-report.scss'],
})
export class OperationFormReportComponent extends ReportTableComponent<
  Operation[],
  OperationFromReportComponentStats,
  OperationFormReportComponentPageDimension
> {
  readonly pmfmIdsMap = PmfmIds;

  @Input({ required: true }) enablePosition: boolean;
  @Input({ required: true }) parentPageDimension: FormReportPageDimensions;

  protected logPrefix = '[operation-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);

  constructor(protected settings: LocalSettingsService) {
    super(Array<Operation>, OperationFromReportComponentStats);
  }

  protected computePageDimensions(): OperationFormReportComponentPageDimension {
    return {
      columnPmfmWidth: 30,
      columnNumOpWidth: 30,
      columnIndividualMeasureWidth: 30,
      columnTripProgressWidth: 30,
      columnGearSpeciesWidth: 250,
      columnDateWidth: 90,
      columnLatLongWidth: 140,
    };
  }

  protected async computeStats(
    data: Operation[],
    _?: IComputeStatsOpts<OperationFromReportComponentStats>
  ): Promise<OperationFromReportComponentStats> {
    const stats = new OperationFromReportComponentStats();

    const strategyId = this.strategy?.id;

    stats.options = {
      showEndDate:
        this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_END_DATE_ENABLE) ||
        this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_FISHING_END_DATE_ENABLE),
      allowParentOperation: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_ALLOW_PARENT_OPERATION),
      latLongPattern: this.settings.latLongFormat,
      fishingAreaDisplayAttributes: this.settings.getFieldDisplayAttributes('fishingArea', ['label', 'name']),
      columnCommentTitleText: this.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_OPERATION_TABLE_COLUMN_COMMENT_TITLE_TEXT),
      limitTipsToShowOnAnnex: this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_TIPS_LIMIT_TO_SHOW_ON_ANNEX),
    };

    stats.nbOperationByPage = 10;
    // In the case the header will be more hight, so we have less place du display lines
    if (stats.options.allowParentOperation) {
      stats.nbOperationByPage--;
    }

    stats.pmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.OPERATION,
          strategyId,
        })
      : [];
    stats.pmfmsById = splitById(stats.pmfms);
    stats.childPmfms = isNotNil(strategyId)
      ? await this.programRefService.loadProgramPmfms(this.program.label, {
          acquisitionLevel: AcquisitionLevelCodes.CHILD_OPERATION,
          strategyId,
        })
      : [];
    stats.pmfmsById = splitById(stats.childPmfms);

    // In case of allowParentOperation, also display child pmfm in it own
    // header line for operation table. We also need each array (parent and
    // child pmfms) has the same size to be displayed correctly as table column
    if (stats.options.allowParentOperation) {
      const nbOperationPmfms = stats.pmfms.filter(this.filterPmfmForOperationTable).length;
      const nbChildOperationPmfms = stats.childPmfms.filter(this.filterPmfmForOperationTable).length;
      if (nbOperationPmfms > nbChildOperationPmfms) {
        const diff = nbOperationPmfms - nbChildOperationPmfms;
        stats.childPmfms = [...stats.childPmfms, ...Array(diff - 1).fill(null)];
      } else if (nbChildOperationPmfms > nbOperationPmfms) {
        const diff = nbChildOperationPmfms - nbOperationPmfms;
        stats.pmfms = [...stats.pmfms, ...Array(diff - 1).fill(null)];
      }
    }

    stats.hasPmfm = {
      hasIndividualMeasure: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.HAS_INDIVIDUAL_MEASURES]),
      tripProgress: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.TRIP_PROGRESS]),
    };

    stats.tableHeadColspan = 2 + Object.values(stats.hasPmfm).filter((v) => v).length;

    // Get all needed measurement values in suitable format
    stats.measurementValues = data.map((op) => MeasurementUtils.toMeasurementValues(op.measurements));

    const tableLeftColumnsWidth =
      this.pageDimensions.columnNumOpWidth +
      (stats.hasPmfm.hasIndividualMeasure ? this.pageDimensions.columnIndividualMeasureWidth : 0) +
      (stats.hasPmfm.tripProgress ? this.pageDimensions.columnTripProgressWidth : 0) +
      this.pageDimensions.columnGearSpeciesWidth +
      this.pageDimensions.columnDateWidth +
      this.pageDimensions.columnLatLongWidth + // start date
      (stats.options.showEndDate ? this.pageDimensions.columnDateWidth + this.pageDimensions.columnLatLongWidth : 0);
    const tableRightColumnsWidth = 0;

    stats.pmfmsTablePart = this.computeTablePart(
      stats.pmfms,
      this.parentPageDimension.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth,
      this.pageDimensions.columnPmfmWidth
    );

    const allPmfms = arrayDistinct(stats.pmfms.concat(stats.childPmfms), 'id');
    stats.pmfmsTipsByPmfmIdByTableParts = this.computeReportPmfmsTips(stats.pmfmsTablePart, allPmfms, stats.options.limitTipsToShowOnAnnex);
    stats.tipsByTablePart = stats.pmfmsTipsByPmfmIdByTableParts.map((item) => Object.values(item));
    stats.tipsByTablePart[0].push({
      index: '*',
      showOnAnnex: false,
      text: this.translate.instant('TRIP.REPORT.FORM.OPERATION.HELP.ONE_STAR'),
    });
    stats.tipsByTablePart[0].push({
      index: '**',
      showOnAnnex: false,
      text: this.translate.instant('TRIP.REPORT.FORM.OPERATION.HELP.TWO_STAR'),
    });

    // For each 4 line in tips remove one operation line in the page to keep
    // the place tu put all tips
    const maxTipsLength = Math.max(...stats.tipsByTablePart.map((item) => item.length));
    if (maxTipsLength > 0) {
      stats.nbOperationByPage -= Math.ceil((maxTipsLength - 1) / 4);
    }

    return stats;
  }

  protected filterPmfmForOperationTable(pmfm: IPmfm): boolean {
    return isNil(pmfm) || ![PmfmIds.HAS_INDIVIDUAL_MEASURES, PmfmIds.TRIP_PROGRESS].includes(pmfm.id);
  }

  protected markAsLoaded(opts = { emitEvent: true }) {
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
      if (opts.emitEvent !== false) this.markForCheck();
    }
  }

  protected computeTablePart(
    pmfms: IPmfm[],
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number,
    pmfmColumnWidth: number
  ): number[][] {
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;
    const nbPmfmsThatCanFitOnOnePage = Math.trunc(availableWidthOnePage / pmfmColumnWidth);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (pmfms.length <= nbPmfmsThatCanFitOnOnePage) return [[0, pmfms.length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;

    const nbPmfmsThatCanFitOnFirstPage = Math.trunc(availableWidthOnFirstPage / pmfmColumnWidth);

    return [
      [0, nbPmfmsThatCanFitOnFirstPage - 1],
      [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
    ];
  }
}
