import { CommonReportComponentStats, ReportAppendixSection, ReportComponent } from '@app/data/report/report-component.class';
import { EntityAsObjectOptions, ReferentialRef, isNilOrBlank, isNotEmptyArray, isNotNil, referentialToString } from '@sumaris-net/ngx-components';
import { Batch } from '../batch.model';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ReportTableComponent, ReportTableComponentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table-component.class';
import { BatchUtils } from '../batch.utils';
import { AppCoreModule } from '@app/core/core.module';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { AppBatchModule } from '../../batch.module';
import { PmfmIds } from '@app/referential/services/model/model.enum';
import { Sale } from '@app/trip/sale/sale.model';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { Moment } from 'moment';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';

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
}

export class BatchFormReportComponentStats extends CommonReportComponentStats {
  fromObject(source: any) {
    super.fromObject(source);
  }
  asObject(opts?: EntityAsObjectOptions): any {
    return {
      ...super.asObject(opts),
    };
  }
}

@Component({
  standalone: true,
  imports: [AppCoreModule, AppSharedReportModule, AppReferentialPipesModule, ReportChunkModule, TableHeadPmfmNameReportChunk, AppBatchModule],
  selector: 'batch-form-report-component',
  templateUrl: './batch-form.report-component.html',
  styleUrls: ['../../../../data/report/base-report.scss', '../../../../data/report/base-form-report.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class BatchFormReportComponent extends ReportTableComponent<Batch, BatchFormReportComponentStats, BatchFormReportPageDimension> {
  protected treeIndentByBatchId: { [key: number]: TreeComponent[] } = {};
  protected sortingValueTextByBatchId: { [key: number]: string[] } = {};
  protected sortingBatchWithCalculatedWeightById: { [key: number]: boolean } = {};
  protected pages: MatTableDataSource<Batch>[];
  protected displayedColumns: string[];
  protected dateAdapter: MomentDateAdapter = inject(MomentDateAdapter);

  @Input({ required: true }) pmfms: {
    sortingBatch: IPmfm[];
    sortingBatchIndividual: IPmfm[];
    vesselSnapshot: string[];
  };
  @Input({ required: true }) pmfmsByIds: {
    sortingBatch: { [key: number]: IPmfm };
    sortingBatchIndividual: { [key: number]: IPmfm };
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
    this.displayedColumns = this.computeDisplayedColumns();
    if (isNotNil(this.data)) {
      this.pages = this.computePagesRows(this.data);
    } else {
      this.pages = [];
    }
  }

  computeAppendixBlocks(): ReportAppendixSection[] {
    return []; // There is not appendix blocks
  }

  protected async computeStats(data: Batch, opts?: IComputeStatsOpts<BatchFormReportComponentStats>): Promise<BatchFormReportComponentStats> {
    const stats = new BatchFormReportComponentStats();

    const datePattern = this.translate.instant('COMMON.DATE_TIME_PATTERN');

    stats.headerItems = [
      this.translate.instant('SALE.BATCH.REPORT.HEADER.SELL_DATE_TIME') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : this.dateAdapter.format(this.saleDate, datePattern)),
      this.translate.instant('SALE.BATCH.REPORT.HEADER.SALE_LOCATION') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.saleLocation, this.displayAttributes.location)),
      this.translate.instant('SALE.BATCH.REPORT.HEADER.VESSEL') +
        this.translate.instant('COMMON.COLON') +
        ' ' +
        (this.isBlankForm ? '.................................' : referentialToString(this.vesselSnapshot, this.displayAttributes.vesselSnapshot)),
    ];

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
    result.push(batch);
    this.computeTreeComponent(batch, last);
    this.computeSortingValueText(batch);
    this.computeSortingBatchWithCalculatedWeightById(batch);
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

  private computeSortingBatchWithCalculatedWeightById(batch: Batch) {
    this.sortingBatchWithCalculatedWeightById[batch.id] = Object.keys(batch.measurementValues).includes(PmfmIds.BATCH_CALCULATED_WEIGHT.toString());
  }
}
