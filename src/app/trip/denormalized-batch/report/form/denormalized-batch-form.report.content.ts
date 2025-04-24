import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatTableDataSource } from '@angular/material/table';
import { AppCoreModule } from '@app/core/core.module';
import { IComputeStatsOpts } from '@app/data/report/base-report.class';
import { ReportChunkModule } from '@app/data/report/form/report-chunk.module';
import { ReportTableContent, ReportTableContentPageDimension, TableHeadPmfmNameReportChunk } from '@app/data/report/report-table.content.class';
import { CommonReportContentStats, ReportAppendixSection, ReportPmfmsTipsByPmfmIds, TipsReportChunk } from '@app/data/report/report.content.class';
import { AppReferentialPipesModule } from '@app/referential/pipes/referential-pipes.module';
import { MethodIds, PmfmIds } from '@app/referential/services/model/model.enum';
import { IDenormalizedPmfm } from '@app/referential/services/model/pmfm.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { AppSharedReportModule } from '@app/shared/report/report.module';
import { DenormalizedBatch } from '@app/trip/denormalized-batch/denormalized-batch.model';
import { DenormalizedBatchUtils } from '@app/trip/denormalized-batch/denormalized-batch.utils';
import { EntityAsObjectOptions, ReferentialRef, TreeItemEntityUtils, isNil, isNotNil, isNotNilOrNaN } from '@sumaris-net/ngx-components';
import { Moment } from 'moment';
import { AppEntityQualityModule } from '@app/data/quality/entity-quality.module';
import { MethodUtils } from '@app/referential/pmfm/method/method.utils';
import { DenormalizedBatchModule } from '../../../denormalized-batch/denormalized-batch.module';
import { AppBatchModule } from '@app/trip/batch/batch.module';

type TreeComponent = 'blank' | 'trunc' | 'last-leaf' | 'leaf';

export interface DenormalizedBatchFormReportContentPageDimension extends ReportTableContentPageDimension {
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

export class DenormalizedBatchFormReportContentStats extends CommonReportContentStats {
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
    AppBatchModule,
    AppCoreModule,
    AppEntityQualityModule,
    AppReferentialPipesModule,
    AppSharedReportModule,
    ReportChunkModule,
    TableHeadPmfmNameReportChunk,
    TipsReportChunk,
    DenormalizedBatchModule,
  ],
  selector: 'denormalized-batch-form-report-content',
  templateUrl: './denormalized-batch-form.report.content.html',
  styleUrls: [
    './denormalized-batch-form.report.content.scss',
    '../../../../data/report/base-report.scss',
    '../../../../data/report/base-form-report.scss',
  ],
  encapsulation: ViewEncapsulation.None,
})
export class DenormalizedBatchFormReportContent extends ReportTableContent<
  DenormalizedBatch,
  DenormalizedBatchFormReportContentStats,
  DenormalizedBatchFormReportContentPageDimension
> {
  protected treeIndentByBatchId: { [key: number]: TreeComponent[] } = {};
  protected sortingValueTextByBatchId: { [key: number]: string[] } = {};
  protected batchWithCalculatedWeightById: { [key: number]: boolean } = {};
  protected pages: MatTableDataSource<DenormalizedBatch>[];
  protected landingDisplayedColumns: string[];
  protected rootLandingDisplayedColumns: string[];
  protected dateAdapter: MomentDateAdapter = inject(MomentDateAdapter);
  protected methodIds = MethodIds;

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
  @Input() headerDate: Moment;
  @Input() headerVessel: ReferentialRef;
  @Input() headerLocation: VesselSnapshot;
  @Input({ required: true }) footerText: string;
  @Input({ required: true }) type: 'landing' | 'discard' | 'sale';

  constructor() {
    super(DenormalizedBatch, DenormalizedBatchFormReportContentStats);
  }

  async ngOnStart(opts?: any): Promise<void> {
    await super.ngOnStart(opts);
    if (!this.isBlankForm) {
      this.landingDisplayedColumns = this.computeLandingDisplayedColumns();
      this.rootLandingDisplayedColumns = this.computeRootDisplayedColumns();
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

  protected async computeStats(
    data: DenormalizedBatch,
    opts?: IComputeStatsOpts<DenormalizedBatchFormReportContentStats>
  ): Promise<DenormalizedBatchFormReportContentStats> {
    const stats = new DenormalizedBatchFormReportContentStats();

    stats.options = {
      blankFormLineNumberSuite: ['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'],
    };

    stats.headerItems = [];
    if (isNotNil(this.headerVessel))
      stats.headerItems.push(
        `${this.translate.instant('SALE.BATCH.REPORT.HEADER.VESSEL')}${this.translate.instant('COMMON.COLON')} ${this.headerVessel}`
      );
    if (isNotNil(this.headerLocation))
      stats.headerItems.push(
        `${this.translate.instant('SALE.BATCH.REPORT.HEADER.VESSEL')}${this.translate.instant('COMMON.COLON')} ${this.headerLocation}`
      );
    if (isNotNil(this.headerDate))
      stats.headerItems.push(
        `${this.translate.instant('SALE.BATCH.REPORT.HEADER.SELL_DATE_TIME')}${this.translate.instant('COMMON.COLON')} ${this.headerDate}`
      );

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

  protected computePageDimensions(): DenormalizedBatchFormReportContentPageDimension {
    const colWidthExhaustiveInventory = 30;
    const colWidthTaxonGroup = 130;
    const colWidthTaxonName = 130;
    const colWidthSortCriterions = 200;
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
    const headerHeight = 100;
    const footerHeight = 40;
    const tableHat = 25;
    const tableTitleHeight = 30;
    const tableLegendHeight = 40;
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

  protected computeRootDisplayedColumns(): string[] {
    return [
      'exhaustiveInventory',
      'rootSortingCriterion1',
      'rootSortingCriterion2',
      'rootTotalWeight',
      'rootTotalIndiv',
      'faction',
      'rootWeight',
      'rootNbIndiv',
    ];
  }

  protected computeLandingDisplayedColumns(): string[] {
    return ['exhaustiveInventory', 'taxonGroup', 'taxonName', 'sortCriterions', 'totalWeight', 'totalIndiv', 'faction', 'weight', 'nbIndiv'];
  }

  protected computeDiscardDisplayColumn(): string[] {
    return [];
  }

  protected isRootBatch(index: number, batch: DenormalizedBatch) {
    return isNil(batch.parent?.parent);
  }

  protected isEstimatedElevateWeight(batch: DenormalizedBatch) {
    return isNotNilOrNaN(batch.weight) && batch.weight === batch.elevateWeight && MethodUtils.isEstimated(batch.weightMethodId);
  }

  protected isComputedElevateWeight(batch: DenormalizedBatch) {
    return isNotNilOrNaN(batch.elevateWeight) && (batch.elevateWeight !== batch.weight || MethodUtils.isComputed(batch.weightMethodId));
  }

  protected isComputedElevateIndividualCount(batch: DenormalizedBatch) {
    return isNotNilOrNaN(batch.elevateIndividualCount) && batch.elevateIndividualCount !== batch.individualCount;
  }

  protected isComputedSampleWeight(batch: DenormalizedBatch) {
    return isNotNilOrNaN(batch.indirectContextWeight) && MethodUtils.isComputed(batch.weightMethodId);
  }

  protected isEstimatedSampleWeight(batch: DenormalizedBatch) {
    return isNotNilOrNaN(batch.indirectContextWeight) && MethodUtils.isEstimated(batch.weightMethodId);
  }

  protected isComputedIndividualCount(batch: DenormalizedBatch) {
    return (
      (isNotNilOrNaN(batch.individualCount) || isNotNilOrNaN(batch.indirectIndividualCount)) &&
      batch.individualCount !== batch.indirectIndividualCount
    );
  }

  protected hasElevationRatioInParent(batch: DenormalizedBatch) {
    return batch.weight !== batch.elevateWeight || batch.individualCount !== batch.elevateIndividualCount;
  }

  private computePagesRows(catchBatch: DenormalizedBatch): MatTableDataSource<DenormalizedBatch>[] {
    const rows = this.computeBatch(catchBatch);
    const pagesSlice = this.computePageSlice(rows.length);
    return pagesSlice.map((slice) => new MatTableDataSource(rows.slice(slice.start, slice.end)));
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

  private computeBatch(catchBatch: DenormalizedBatch) {
    const denormalizedBatches = TreeItemEntityUtils.treeToArray(catchBatch);

    // Copy sampling batch properties to parent
    const samplingBatches = denormalizedBatches
      .filter((b) => DenormalizedBatchUtils.isSamplingBatch(b))
      .map((b) => {
        const parent = b.parent;
        parent.samplingRatio = b.samplingRatio;
        parent.samplingRatioText = b.samplingRatioText;
        parent.weight = b.weight;
        parent.indirectWeight = b.indirectWeight;
        parent.individualCount = b.individualCount;
        parent.indirectIndividualCount = b.indirectIndividualCount;
        return b;
      });

    // Exclude not visible batches
    const visibleBatch =
      catchBatch &&
      TreeItemEntityUtils.filterRecursively(catchBatch, (b) => {
        return (
          (((this.type === 'landing' || this.type === 'sale') && b?.isLanding) || (this.type === 'discard' && b?.isDiscard)) &&
          !samplingBatches.includes(b)
        );
      });

    visibleBatch
      .filter((batch, index) => this.isRootBatch(index, batch))
      .forEach((rootVisibleBatch) => {
        DenormalizedBatchUtils.filterTreeComponents(rootVisibleBatch, (b) => !DenormalizedBatchUtils.isSamplingBatch(b));
        DenormalizedBatchUtils.computeTreeIndent(rootVisibleBatch, [], false, { html: true });
      });

    return visibleBatch;
  }
}
