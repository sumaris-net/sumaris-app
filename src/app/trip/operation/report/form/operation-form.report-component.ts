import { Component, inject, Input } from '@angular/core';
import { AppCoreModule } from '@app/core/core.module';
import { AppDataModule } from '@app/data/data.module';
import { MeasurementFormValues, MeasurementUtils } from '@app/data/measurement/measurement.model';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import {
  CommonReportComponentStats,
  ReportAppendixSection,
  ReportPmfmsTipsByPmfmIds,
  ReportTips,
  TipsReportChunk,
} from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { AppReferentialModule } from '@app/referential/referential.module';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { AcquisitionLevelCodes, PmfmIds } from '@app/referential/services/model/model.enum';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { arrayPluck } from '@app/shared/functions';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { Operation } from '@app/trip/trip/trip.model';
import { arrayDistinct, EntityAsObjectOptions, isNil, isNotNil, LatLongPattern, LocalSettingsService, splitById } from '@sumaris-net/ngx-components';

interface OperationFormReportComponentPageDimension extends ReportTableComponentPageDimension {
  columnNumOpWidth: number;
  columnIndividualMeasureWidth: number;
  columnTripProgressWidth: number;
  columnGearSpeciesWidth: number;
  columnDateWidth: number;
  columnLatLongWidth: number;
  columnTripNumberWidth: number;
}

export class OperationFromReportComponentStats extends CommonReportComponentStats {
  options: {
    showEndDate: boolean;
    allowParentOperation: boolean;
    latLongPattern: LatLongPattern;
    fishingAreaDisplayAttributes: string[];
    commentsHelpText: string;
    enableVesselAssociation: boolean;
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
  measurementValues: MeasurementFormValues[];
  tipsByTablePart: ReportTips[][];
  pmfmsTablePart: number[][];
  pmfmsColumnWidthByPmfmsIds: { [key: number]: number };
  nbOperationByPage: number;
  dummyOps: Operation[];

  fromObject(source: any): void {
    this.options = source.options;
    this.pmfms = source.pmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.pmfmsById = splitById(this.pmfms);
    this.childPmfms = source.childPmfms.map(DenormalizedPmfmStrategy.fromObject);
    this.childPmfmsById = splitById(this.childPmfms);
    this.tableHeadColspan = source.tableHeadColspan;
    this.hasPmfm = source.hasPmfm;
    this.pmfmsTipsByPmfmIdByTableParts = source.pmfmsTipsByPmfmIdByTableParts;
    this.measurementValues = source.measurementValues;
    this.tipsByTablePart = source.tipsByTablePart;
    this.pmfmsTablePart = source.pmfmsTablePart;
    this.pmfmsColumnWidthByPmfmsIds = source.pmfmsColumnWidthByPmfmsIds;
    this.nbOperationByPage = source.nbOperationByPage;
    this.dummyOps = source.dummyOps?.map(Operation.fromObject);
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      options: this.options,
      pmfms: this.pmfms.map((pmfm) => pmfm.asObject(opts)),
      childPmfms: this.childPmfms?.map((pmfm) => pmfm.asObject(opts)),
      tableHeadColspan: this.tableHeadColspan,
      hasPmfm: this.hasPmfm,
      pmfmsTipsByPmfmIdByTableParts: this.pmfmsTipsByPmfmIdByTableParts,
      measurementValues: this.measurementValues,
      pmfmsTablePart: this.pmfmsTablePart,
      tipsByTablePart: this.tipsByTablePart,
      pmfmsColumnWidthByPmfmsIds: this.pmfmsColumnWidthByPmfmsIds,
      nbOperationByPage: this.nbOperationByPage,
      dummyOps: this.dummyOps?.map((op) => op.asObject(opts)),
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
  @Input({ required: true }) multiTrip: boolean;
  public static NB_LINE_PEER_PAGE = 10;

  protected readonly referentialRefService = inject(ReferentialRefService);

  protected logPrefix = '[operation-form-report] ';
  protected programRefService: ProgramRefService = inject(ProgramRefService);

  constructor(protected settings: LocalSettingsService) {
    super(Array<Operation>, OperationFromReportComponentStats);
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('TRIP.REPORT.FORM.OPERATION.TITLE'),
        blocks: this.flatPmfmTipsForAnnex(this.stats.pmfmsTipsByPmfmIdByTableParts),
      },
    ];
  }

  protected computePageDimensions(): OperationFormReportComponentPageDimension {
    return {
      ...super._computePageDimensions(),
      columnNumOpWidth: 30,
      columnIndividualMeasureWidth: 30,
      columnTripProgressWidth: 30,
      columnGearSpeciesWidth: 430,
      columnDateWidth: 90,
      columnLatLongWidth: 140,
      columnTripNumberWidth: 30,
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
      commentsHelpText: this.program.getProperty(ProgramProperties.TRIP_REPORT_FORM_OPERATION_COMMENT_HELP_TEXT),
      enableVesselAssociation: this.program.getPropertyAsBoolean(ProgramProperties.TRIP_OPERATION_ENABLE_VESSEL_ASSOCIATION),
    };

    stats.nbOperationByPage = OperationFormReportComponent.NB_LINE_PEER_PAGE;
    // In the case the header will be more hight, so we have less place du display lines
    if (stats.options.allowParentOperation) {
      stats.nbOperationByPage--;
    }

    stats.pmfms = isNotNil(strategyId)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.OPERATION,
            strategyId,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
      : [];
    stats.pmfmsById = splitById(stats.pmfms);
    stats.childPmfms = isNotNil(strategyId)
      ? (
          await this.programRefService.loadProgramPmfms(this.program.label, {
            acquisitionLevel: AcquisitionLevelCodes.CHILD_OPERATION,
            strategyId,
          })
        ).filter((pmfm) => !this.hiddenPmfms.includes(pmfm.id))
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
        stats.childPmfms = [...stats.childPmfms, ...Array(diff - 1).fill(DenormalizedPmfmStrategy.fromObject({}))];
      } else if (nbChildOperationPmfms > nbOperationPmfms) {
        const diff = nbChildOperationPmfms - nbOperationPmfms;
        stats.pmfms = [...stats.pmfms, ...Array(diff - 1).fill(DenormalizedPmfmStrategy.fromObject({}))];
      }
    }

    stats.hasPmfm = {
      hasIndividualMeasure: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.HAS_INDIVIDUAL_MEASURES]),
      tripProgress: isNotNil(stats.pmfmsById?.[this.pmfmIdsMap.TRIP_PROGRESS]),
    };

    stats.tableHeadColspan = 2 + Object.values(stats.hasPmfm).filter((v) => v).length + (this.multiTrip ? 1 : 0);

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
      null,
      this.parentPageDimensions.availableWidthForTableLandscape,
      tableLeftColumnsWidth,
      tableRightColumnsWidth
    );

    const allPmfms = arrayDistinct(stats.pmfms.concat(stats.childPmfms), 'id');
    stats.pmfmsTipsByPmfmIdByTableParts = this.computeReportPmfmsTips(stats.pmfmsTablePart, allPmfms, this.limitTipsToShowOnAppendix);
    stats.tipsByTablePart = stats.pmfmsTipsByPmfmIdByTableParts.map((item) => Object.values(item));
    stats.tipsByTablePart[0].push({
      index: '*',
      showOnAppendix: false,
      text: this.translate.instant('TRIP.REPORT.FORM.OPERATION.HELP.ONE_STAR'),
    });
    if (!this.enablePosition || this.isBlankForm) {
      const fishingAreaLocationLevelIds = this.program.getPropertyAsNumbers(ProgramProperties.TRIP_OPERATION_FISHING_AREA_LOCATION_LEVEL_IDS);
      const locationLevels = await this.referentialRefService.loadAllByIds(fishingAreaLocationLevelIds, 'LocationLevel');
      stats.tipsByTablePart[0].push({
        index: '**',
        showOnAppendix: false,
        text: `${this.translate.instant('TRIP.REPORT.FORM.OPERATION.TABLE.FISHING_AREA')}${this.translate.instant('COMMON.COLON')} ${arrayPluck(locationLevels, 'name').join(', ')}`,
      });
    }

    // For each 4 line in tips remove one operation line in the page to keep
    // the place tu put all tips
    const maxTipsLength = Math.max(...stats.tipsByTablePart.map((item) => item.length));
    if (maxTipsLength > 0) {
      stats.nbOperationByPage -= Math.ceil((maxTipsLength - 1) / 4);
    }

    if (this.isBlankForm) {
      const nbOfOperationPage = this.program.getPropertyAsInt(ProgramProperties.TRIP_REPORT_FORM_BLANK_NB_OF_OPERATION_PAGE);
      stats.dummyOps = new Array(stats.nbOperationByPage * nbOfOperationPage).fill(null).map((_, index) =>
        Operation.fromObject({
          id: index + 1,
          rankOrder: index + 1,
        })
      );
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
    columnWidthByPmfmsIds: { [key: number]: number } | undefined,
    availableWidthForTable: number,
    leftPartWidth: number,
    rightPartWidth: number
  ): number[][] {
    const availableWidthOnePage = availableWidthForTable - rightPartWidth - leftPartWidth;
    const nbPmfmsThatCanFitOnOnePage = Math.trunc(availableWidthOnePage / this.pageDimensions.columnPmfmWidthCompact);

    // If all pmfm column can fit in one page : there is only one table part that contain all pmfms
    if (pmfms.length <= nbPmfmsThatCanFitOnOnePage) return [[0, pmfms.length]];

    const availableWidthOnFirstPage = availableWidthForTable - leftPartWidth;

    const nbPmfmsThatCanFitOnFirstPage = Math.trunc(availableWidthOnFirstPage / this.pageDimensions.columnPmfmWidthCompact);

    return [
      [0, nbPmfmsThatCanFitOnFirstPage - 1],
      [nbPmfmsThatCanFitOnFirstPage - 1, pmfms.length],
    ];
  }
}
