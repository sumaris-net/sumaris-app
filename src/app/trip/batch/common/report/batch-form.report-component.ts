import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatTableDataSource } from '@angular/material/table';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import {
  CommonReportComponentStats,
  ReportAppendixSection,
  ReportPmfmsTipsByPmfmIds,
  TipsReportChunk,
} from '@app/data/report/report-component.class';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm, IPmfm } from '@app/referential/services/model/pmfm.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { EntityAsObjectOptions, ReferentialRef, isNotEmptyArray, isNotNil, referentialToString } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { AppBatchModule } from '../../batch.module';
import { Batch } from '../batch.model';
import { BatchUtils } from '../batch.utils';

type TreeComponent = 'blank' | 'trunc' | 'last-leaf' | 'leaf';

export interface BatchFormReportPageDimension extends ReportTableComponentPageDimension {
  headerHeight: number;
  footerHeight: number;
  tableTitleHeight: number;
  tableLegendHeight: number;
  tableHat: number;
  rowTitleHeight: number;
  rowHeight: number;
  colWidthExhaustiveInventory: number;
  colWidthTaxonGroup: number;
  colWidthTaxonName: number;
  colWidthSortCriterions: number;
  colWidthTitleExhaustiveInventory: number;
  colWidthTitleExhaustiveInventoryYesNo: number;
  colWidthMeasure: number;
  colWidthBlank: number;
}

export class BatchFormReportComponentStats extends CommonReportComponentStats {
  options: {
    blankFormLineNumberSuite: string[];
  };
  tips: ReportPmfmsTipsByPmfmIds;
  fromObject(source: any) {
    super.fromObject(source);
    this.options = source.options;
    this.tips = source.tips;
  }
  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
      options: this.options,
      tips: this.tips,
    };
  }
}

@Component({
  standalone: true,
  imports: [
    AppCoreModule,
    AppSharedReportModule,
    AppReferentialPipesModule,
    ReportChunkModule,
    TableHeadPmfmNameReportChunk,
    AppBatchModule,
    TipsReportChunk,
  ],
  selector: 'batch-form-report-component',
  templateUrl: './batch-form.report-component.html',
  styleUrls: ['./batch-form.report-component.scss', '../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BatchFormReportComponent extends ReportTableComponent<Batch, BatchFormReportComponentStats, BatchFormReportPageDimension> {
  protected treeIndentByBatchId: { [key: number]: TreeComponent[] } = {};
  protected sortingValueTextByBatchId: { [key: number]: string[] } = {};
  protected batchWithCalculatedWeightById: { [key: number]: boolean } = {};
  protected pages: MatTableDataSource<Batch>[];
  protected displayedColumns: string[];
  protected dateAdapter: MomentDateAdapter = inject(MomentDateAdapter);

  @Input({ required: true }) pmfms: {
    sortingBatch: IDenormalizedPmfm[];
    sortingBatchIndividual: IDenormalizedPmfm[];
  };
  @Input({ required: true }) pmfmsByIds: {
    sortingBatch: { [key: number]: IDenormalizedPmfm };
    sortingBatchIndividual: { [key: number]: IDenormalizedPmfm };
  };
  @Input({ required: true }) displayAttributes: {
    location: string[];
    taxonGroup: string[];
    vesselSnapshot: string[];
  };
  @Input({ required: true }) saleDate: Moment;
  @Input({ required: true }) saleLocation: ReferentialRef;
  @Input({ required: true }) vesselSnapshot: VesselSnapshot;
  @Input({ required: true }) footerText: string;

  constructor() {
    super(Batch, BatchFormReportComponentStats);
  }

  async ngOnStart(opts?: any): Promise<void> {
    await super.ngOnStart(opts);
    if (!this.isBlankForm) {
      this.displayedColumns = this.computeDisplayedColumns();
      if (isNotNil(this.data)) {
        this.pages = this.computePagesRows(this.data);
      } else {
        this.pages = [];
      }
    }
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    this.checkIfStatsAreComputed();
    return [
      {
        title: this.translate.instant('SALE.BATCH.REPORT.TITLE'),
        blocks: this.flatPmfmTipsForAnnex([this.stats.tips]),
      },
    ];
  }

  protected async computeStats(data: Batch, opts?: IComputeStatsOpts<BatchFormReportComponentStats>): Promise<BatchFormReportComponentStats> {
    const stats = new BatchFormReportComponentStats();

    stats.options = {
      blankFormLineNumberSuite: ['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'],
    };

    const datePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');

    stats.headerItems = [
      this.translate.instant('SALE.BATCH.REPORT.HEADER.VESSEL') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.vesselSnapshot, this.displayAttributes.vesselSnapshot)),
      this.translate.instant('SALE.BATCH.REPORT.HEADER.SALE_LOCATION') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.saleLocation, this.displayAttributes.location)),
      this.translate.instant('SALE.BATCH.REPORT.HEADER.SELL_DATE_TIME') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : this.dateAdapter.format(this.saleDate, datePattern)),
    ];

    stats.tips = this.isBlankForm
      ? this.computeReportPmfmsTips(
          [[0, this.pmfms.sortingBatch.length]],
          [
            this.pmfmsByIds.sortingBatch[PmfmIds.SIZE_UNLI_CAT],
            this.pmfmsByIds.sortingBatch[PmfmIds.DRESSING],
            this.pmfmsByIds.sortingBatchIndividual[PmfmIds.SEX],
          ],
          this.limitTipsToShowOnAppendix
        )[0]
      : [];

    return stats;
  }

  protected computePageDimensions(): BatchFormReportPageDimension {
    const colWidthExhaustiveInventory = 30;
    const colWidthTaxonGroup = 140;
    const colWidthTaxonName = 140;
    const colWidthSortCriterions = 140;
    const colWidthTitleExhaustiveInventory = colWidthExhaustiveInventory + colWidthTaxonGroup + colWidthTaxonName;
    const colWidthTitleExhaustiveInventoryYesNo = colWidthSortCriterions / 2 + 0.5;
    const colWidthMeasure =
      (this.parentPageDimensions.availableWidthForTablePortrait -
        colWidthExhaustiveInventory -
        colWidthTaxonGroup -
        colWidthTaxonName -
        colWidthSortCriterions) /
        5 -
      1;
    const headerHeight = 70;
    const footerHeight = 20;
    const tableHat = 25;
    const tableTitleHeight = 15;
    const tableLegendHeight = 25;
    const rowTitleHeight = 70;
    return {
      ...super._computePageDimensions(),
      headerHeight,
      footerHeight,
      tableHat,
      tableTitleHeight,
      tableLegendHeight,
      rowTitleHeight,
      rowHeight: 38,
      colWidthExhaustiveInventory,
      colWidthTaxonGroup,
      colWidthTaxonName,
      colWidthSortCriterions,
      colWidthTitleExhaustiveInventory,
      colWidthTitleExhaustiveInventoryYesNo,
      colWidthMeasure,
      colWidthBlank: this.parentPageDimensions.availableWidthForTablePortrait / 9,
    };
  }

  protected computeDisplayedColumns(): string[] {
    const result = ['exhaustiveInventory', 'taxonGroup', 'taxonName', 'sortCriterions', 'totalWeight', 'totalIndiv', 'faction', 'weight', 'nbIndiv'];
    return result;
  }

  private computePagesRows(data: Batch): MatTableDataSource<Batch>[] {
    const batchRow = this.computeBatchRow(data);
    const pagesSlice = this.computePageSlice(batchRow.length);
    return pagesSlice.map((slice) => new MatTableDataSource(batchRow.slice(slice.start, slice.end)));
  }

  private computeBatchRow(data: Batch, result: Batch[] = [], last = { sorting: false, sampling: false, individual: false }): Batch[] {
    const batch = Batch.fromObject(data.asObject());
    const children = batch.children;
    if (BatchUtils.isCatchBatch(batch) && !batch.hasTaxonNameOrGroup) {
      if (isNotEmptyArray(children)) {
        batch.taxonGroup = children[0].taxonGroup;
      } else {
        return [];
      }
    }
    // Ignore sorting batch
    if (!BatchUtils.isSamplingBatch(data)) {
      result.push(batch);
    }
    this.computeTreeComponent(batch, last);
    this.computeSortingValueText(batch);
    this.computeBatchWithCalculatedWeightById(batch);
    if (isNotEmptyArray(children)) {
      children.forEach((child, index) => {
        if (BatchUtils.isIndividualBatch(child)) {
          last.individual = index + 1 === children.length;
        } else if (BatchUtils.isSamplingBatch(child)) {
          last.sampling = index + 1 === children.length;
        } else if (BatchUtils.isSortingBatch(child)) {
          last.sorting = index + 1 === children.length;
          last.sampling = false;
          last.individual = false;
          if (child.children.length === 1 && BatchUtils.isSamplingBatch(child.children[0])) {
            child.samplingRatio = child.children[0].samplingRatio;
            child.individualCount = child.children[0].individualCount;
            if (child.children[0].measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT]) {
              batch.measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT] = child.children[0].measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT];
            }
            if (child.children[0].measurementValues[PmfmIds.BATCH_MEASURED_WEIGHT]) {
              batch.measurementValues[PmfmIds.BATCH_MEASURED_WEIGHT] = child.children[0].measurementValues[PmfmIds.BATCH_CALCULATED_WEIGHT];
            }
          }
        } else {
          return; // unknown ? -> skip
        }
        this.computeBatchRow(child, result, last);
      });
    }
    return result;
  }

  private computeTreeComponent(batch: Batch, last: { sorting: boolean; sampling: boolean; individual: boolean }) {
    const batchId = batch.id.toString();
    if (BatchUtils.isIndividualBatch(batch)) {
      if (last.sorting) {
        if (last.sampling) {
          if (last.individual) {
            this.treeIndentByBatchId[batch.id] = ['blank', 'blank', 'last-leaf'];
          } else {
            this.treeIndentByBatchId[batch.id] = ['blank', 'blank', 'leaf'];
          }
        } else {
          if (last.individual) {
            this.treeIndentByBatchId[batch.id] = ['blank', 'trunc', 'last-leaf'];
          } else {
            this.treeIndentByBatchId[batch.id] = ['blank', 'trunc', 'leaf'];
          }
        }
      } else {
        if (last.sampling) {
          if (last.individual) {
            this.treeIndentByBatchId[batch.id] = ['trunc', 'blank', 'last-leaf'];
          } else {
            this.treeIndentByBatchId[batch.id] = ['trunc', 'blank', 'leaf'];
          }
        } else {
          if (last.individual) {
            this.treeIndentByBatchId[batch.id] = ['trunc', 'trunc', 'last-leaf'];
          } else {
            this.treeIndentByBatchId[batch.id] = ['trunc', 'trunc', 'leaf'];
          }
        }
      }
    } else if (BatchUtils.isSamplingBatch(batch)) {
      if (last.sorting) {
        if (last.sampling) {
          this.treeIndentByBatchId[batch.id] = ['blank', 'last-leaf'];
        } else {
          this.treeIndentByBatchId[batch.id] = ['blank', 'leaf'];
        }
      } else {
        if (last.sampling) {
          this.treeIndentByBatchId[batch.id] = ['trunc', 'last-leaf'];
        } else {
          this.treeIndentByBatchId[batch.id] = ['trunc', 'leaf'];
        }
      }
    } else if (BatchUtils.isSortingBatch(batch)) {
      if (last.sorting) {
        this.treeIndentByBatchId[batch.id] = ['last-leaf'];
      } else {
        this.treeIndentByBatchId[batch.id] = ['leaf'];
      }
    } else {
      this.treeIndentByBatchId[batch.id] = [];
    }
  }

  computeSortingValueText(batch: Batch) {
    if (BatchUtils.isIndividualBatch(batch)) {
      // TODO: Other length measure
      if (Object.keys(batch.measurementValues).includes(PmfmIds.LENGTH_TOTAL_CM.toString())) {
        this.sortingValueTextByBatchId[batch.id] = this.translate.instant('SALE.BATCH.REPORT.TABLE.VALUES.LENGTH_TOTAL', {
          value: batch.measurementValues[PmfmIds.LENGTH_TOTAL_CM],
          unitLabel: this.pmfmsByIds.sortingBatchIndividual[PmfmIds.LENGTH_TOTAL_CM].unitLabel,
        });
      }
    }
  }

  private computePageSlice(nbLines: number) {
    const availableSpaceForTheTable =
      this.parentPageDimensions.pageHeight -
      this.pageDimensions.headerHeight -
      this.pageDimensions.footerHeight -
      this.pageDimensions.tableHat -
      this.pageDimensions.tableTitleHeight -
      this.pageDimensions.rowTitleHeight;
    const nbMaxTableRow = Math.trunc(availableSpaceForTheTable / this.pageDimensions.rowHeight);
    const result = [];
    for (let i = 0; i < nbLines; i = i + nbMaxTableRow) {
      const start = i;
      const end = i + nbMaxTableRow;
      result.push({ start, end });
    }
    return result;
  }

  private computeBatchWithCalculatedWeightById(batch: Batch) {
    this.batchWithCalculatedWeightById[batch.id] = Object.keys(batch.measurementValues).includes(PmfmIds.BATCH_CALCULATED_WEIGHT.toString());
  }
}
